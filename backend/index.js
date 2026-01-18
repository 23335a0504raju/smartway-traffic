import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files and snapshots

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing SUPABASE_URL or SUPABASE_KEY in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Multer Setup (Local Storage of Video Files)
const upload = multer({ dest: 'uploads/' });

// Gemini Client model: "gemini-2.5-flash", 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

// --- Routes ---

app.get('/', (req, res) => {
    res.send('SmartTraffic Backend is running');
});

// 1. Auth Login (Google OAuth via Supabase)
app.post('/api/login', async (req, res) => {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ error: 'Provider is required' });

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: 'http://localhost:5173/dashboard',
            },
        });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ error: 'Failed to initiate login' });
    }
});

// --- Video Management Endpoints (The Core of the New Architecture) ---

// 2. Upload Video -> Save to Disk -> Save DB Record -> Trigger Analysis
app.post('/api/videos', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { originalname, filename, path: filepath, size } = req.file;
        const { address_line, city, state, country, pincode, road_name, email } = req.body;

        // A. Create Initial DB Record
        const { data: videoRecord, error: insertError } = await supabase
            .from('videos')
            .insert([
                {
                    filename: originalname, // Display name
                    filepath: filename,     // Stored filename in uploads/ folder
                    size_bytes: size,
                    status: 'processing',
                    // Address Details
                    address_line, city, state, country, pincode, road_name, email
                }
            ])
            .select()
            .single();

        if (insertError) {
            // Clean up file if DB insert fails
            fs.unlinkSync(filepath);
            throw insertError;
        }

        // B. Trigger AI Analysis IMMEDIATELY (Batch Processing)
        // Expected AI Endpoint: POST /api/process_video/ { filename: "..." }
        try {
            const aiResponse = await axios.post('http://127.0.0.1:8000/api/process_video/', {
                filename: filename
            });

            // C. Update DB with Analysis Results
            if (aiResponse.data.status === 'success') {
                await supabase
                    .from('videos')
                    .update({
                        status: 'processed',
                        analysis_summary: aiResponse.data.summary
                    })
                    .eq('id', videoRecord.id);
            }

            res.json({ message: 'Video uploaded and analyzed', video: videoRecord });

        } catch (aiError) {
            console.error('AI Processing Failed:', aiError.message);
            // Mark as failed but keep the file
            await supabase.from('videos').update({ status: 'analysis_failed' }).eq('id', videoRecord.id);
            res.json({ message: 'Video uploaded but analysis failed', video: videoRecord });
        }

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload video' });
    }
});

// 3. List Videos
app.get('/api/videos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("List Videos Error:", error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// 3a. List Emergencies (New Endpoint)
app.get('/api/emergencies', async (req, res) => {
    try {
        // Fetch logs where emergency_detected is true, join with videos for location
        const { data, error } = await supabase
            .from('traffic_logs')
            .select('*, videos(*)')
            .eq('emergency_detected', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("List Emergencies Error:", error);
        res.status(500).json({ error: 'Failed to fetch emergencies' });
    }
});

// 4. Delete Video
app.delete('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get file path from DB
        const { data: video, error: fetchError } = await supabase
            .from('videos')
            .select('filepath')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Delete from DB
        const { error: deleteError } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Delete from File System
        // Note: filepath in DB is allowed to be just the filename inside uploads/
        const fullLocalPath = `uploads/${video.filepath}`;
        if (fs.existsSync(fullLocalPath)) {
            fs.unlinkSync(fullLocalPath);
        }

        res.json({ message: 'Video deleted' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// 5. Update Analysis (For saving results from Simulation Page)
app.put('/api/videos/:id/analysis', async (req, res) => {
    try {
        const { id } = req.params;
        // MUST use 'let' because we update analysis_summary with AI results
        let { analysis_summary, snapshot_path } = req.body;

        let aiReport = "AI Report not generated (Missing Key or Snapshot)";

        // DEBUGGING LOGS
        console.log("--- Analysis Request Debug ---");
        console.log("Has API Key:", !!process.env.OPENROUTER_API_KEY);
        console.log("Snapshot Path:", snapshot_path);
        console.log("File Exists:", snapshot_path ? fs.existsSync(snapshot_path) : "N/A");

        // --- Google Gemini Integration ---
        if (process.env.GEMINI_API_KEY) {
            try {
                const trafficLightCount = analysis_summary['traffic light'] || analysis_summary['traffic_light'] || 0;

                const promptText = `
                    **Advanced Traffic Analysis Request**
                    
                    **Context**: Smart Traffic Management System.
                    **Input Data**: ${JSON.stringify(analysis_summary)}
                    
                    CRITICAL INSTRUCTION - VISUAL FORENSICS:
                    Analyze the included snapshot image with extreme scrutiny for:
                    1. **FIRE / SMOKE**: Any vehicle on fire or emitting thick smoke constitutes a "FIRE ACCIDENT".
                    2. **SEVERE DEFORMITY**: Vehicles that are "creased", "shape out", crushed, or have major structural damage.
                    3. **Unusual Orientation**: Vehicles upside down, on their side, overturned, or facing perpendicular (rollovers).
                    4. **Police/Emergency Vehicles**: Check for light bars, sirens, or specific liveries.

                    **Task**: Analyze the provided data` + (snapshot_path ? " and the surveillance snapshot" : "") + ` to provide a detailed safety report.
                    
                    **REQUIRED OUTPUT FORMAT (JSON ONLY)**:
                    You must return a valid JSON object with exactly three keys:
                    1. "updated_data": An object containing corrected counts and alerts based on visual evidence.
                       - If fire detected: { "ACCIDENT": 1, "alerts": ["Fire Accident Detected"] }
                       - If overturned vehicle: { "ACCIDENT": 1, "alerts": ["Rollover Accident Detected"] }
                       - If police visible: { "police": 1 }
                       - Merge these with initial input.
                    
                    2. "html_report": A string containing an HTML-formatted detailed report. Use <h3>, <ul>, <li>, <strong> tags.
                       - Section 1: Infrastructure.
                       - Section 2: Visual Evidence (Mention Fire/Smoke/Orientation if present).
                       - Section 3: Accident Analysis.
                       - Section 4: Recommendations.
                    
                    3. "sms_summary": A concise plain-text summary (max 160 chars).
                       - Example: "🚨 FIRE ACCIDENT: Vehicle on fire at [Location]. Emergency services required."
                    
                    Do NOT include markdown code blocks. Just the raw JSON object.
                `;

                let promptParts = [promptText];

                if (snapshot_path && fs.existsSync(snapshot_path)) {
                    // Vision Request
                    const imageBuffer = fs.readFileSync(snapshot_path);
                    const imagePart = {
                        inlineData: {
                            data: imageBuffer.toString('base64'),
                            mimeType: "image/jpeg"
                        }
                    };
                    promptParts.push(imagePart);
                } else {
                    console.log("Generating Text-Only Report (No Snapshot)");
                }

                const result = await model.generateContent(promptParts);
                const response = await result.response;
                const jsonText = response.text();

                try {
                    // Clean up potential markdown and extract JSON object
                    let cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const firstBrace = cleanJson.indexOf('{');
                    const lastBrace = cleanJson.lastIndexOf('}');

                    if (firstBrace !== -1 && lastBrace !== -1) {
                        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
                    }

                    const parsed = JSON.parse(cleanJson);

                    aiReport = parsed.html_report;      // For Email & Web
                    var smsSummary = parsed.sms_summary; // For WhatsApp

                    // Merge Vision Corrections into Analysis Data
                    if (parsed.updated_data) {
                        analysis_summary = { ...analysis_summary, ...parsed.updated_data };

                        // Merge alerts array specifically to avoid overwrite
                        if (parsed.updated_data.alerts && analysis_summary.alerts) {
                            // Combine unique alerts
                            const combinedAlerts = new Set([...analysis_summary.alerts, ...parsed.updated_data.alerts]);
                            analysis_summary.alerts = Array.from(combinedAlerts);
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse Gemini JSON:", e);
                    aiReport = jsonText; // Fallback to raw text
                    smsSummary = "Alert: Accident / Incident detected. See email for details.";
                }

                console.log("Gemini Report Generated (JSON Mode)");

            } catch (aiError) {
                console.error("Gemini Failed:", aiError.message);
                aiReport = "AI Analysis Failed: " + aiError.message;
            }
        }

        // 1. Update Video Record
        const { data: video, error } = await supabase
            .from('videos')
            .update({
                status: 'processed',
                analysis_summary
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 2. Insert into Traffic Logs (For Dashboard Stats)
        // 2. Robust Vehicle Count Calculation (Fix for corrupted string inputs)
        let totalVehicles = 0;
        if (analysis_summary) {
            // Option A: Explicit 'count' key exists and is a valid number
            if (analysis_summary.count && !isNaN(parseInt(analysis_summary.count)) && String(analysis_summary.count).length < 10) {
                totalVehicles = parseInt(analysis_summary.count);
            }
            // Option B: Sum up all numeric values in the object (excluding boolean/strings)
            else {
                totalVehicles = Object.values(analysis_summary).reduce((acc, val) => {
                    // Only sum numbers (basic integer checks)
                    if (typeof val === 'number') return acc + val;
                    if (typeof val === 'string' && /^\d+$/.test(val)) return acc + parseInt(val);
                    return acc;
                }, 0);
            }
        }
        const hasEmergency = /ambulance|firetruck|police|accident/i.test(JSON.stringify(analysis_summary)) ||
            Object.keys(analysis_summary).some(k => k === 'ACCIDENT');

        console.log("--- DEBUG SAVE ANALYSIS ---");
        console.log("Snapshot Path received:", snapshot_path);
        console.log("Summary:", JSON.stringify(analysis_summary));

        const { error: logError } = await supabase
            .from('traffic_logs')
            .insert([{
                video_id: id,
                vehicle_count: totalVehicles,
                emergency_detected: hasEmergency,
                analysis_data: analysis_summary,
                detailed_analysis: { ai_report: aiReport }, // Wrap HTML in JSON object for JSONB column
                snapshot_url: snapshot_path, // Explicitly map request body path to DB column
                signal_status: hasEmergency ? 'red' : 'green'
            }]);

        if (logError) {
            const errorMsg = `[${new Date().toISOString()}] INSERT FAILED: ${JSON.stringify(logError)}\nPayload: ${JSON.stringify({ video_id: id, count: totalVehicles, emergency: hasEmergency })}\n\n`;
            console.error("Failed to insert log. Error:", logError);
            try { fs.appendFileSync('db_errors.txt', errorMsg); } catch (e) { console.error("Could not write to log file"); }
        } else {
            console.log("Successfully inserted into traffic_logs.");
        }

        // --- ALERTING SYSTEM (Email + WhatsApp) ---
        if (hasEmergency) {
            const { data: videoData } = await supabase
                .from('videos')
                .select('*')
                .eq('id', id)
                .single();

            const locationStr = videoData ?
                `${videoData.road_name || 'Unknown Road'}, ${videoData.city || 'City'}, ${videoData.pincode || ''}` :
                'Unknown Location';

            const mapLink = videoData && videoData.pincode ?
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}` : '';

            const alertMsg = `
🚨 CRITICAL TRAFFIC ACCIDENT ALERT 🚨
Time: ${new Date().toLocaleString()}
Location: ${locationStr}
Severity: HIGH
Detected: ${analysis_summary['ACCIDENT'] || 1} Vehicle(s) involved.

VIEW LOCATION: ${mapLink}
SNAPSHOT: ${snapshot_path || 'Not Available'}
            `;

            console.log("--- TRIGGERING ALERTS ---");

            // 3a. Send Email (Nodemailer)
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/"/g, '') : process.env.EMAIL_PASS
                    }
                });

                // Construct HTML Email Template
                // Email content: Use the Summary, but format it slightly for HTML
                // Replace newlines with <br> for the email body
                const emailBodyHtml = smsSummary ? smsSummary.replace(/\n/g, '<br>') : "Accident Detected";

                const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #d32f2f; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🚨 CRITICAL ACCIDENT ALERT</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Immediate Attention Required</p>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="background-color: #fff3f3; padding: 15px; border-left: 5px solid #d9534f; margin-bottom: 20px;">
                            <h3 style="margin: 0 0 10px 0; color: #c62828; font-size: 18px;">Incident Summary</h3>
                            <p style="font-size: 16px; color: #333; line-height: 1.6;">${emailBodyHtml}</p>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px; color: #666;">Time:</td>
                                <td style="padding: 10px; font-weight: bold;">${new Date().toLocaleString()}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px; color: #666;">Location:</td>
                                <td style="padding: 10px; font-weight: bold;">${locationStr}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px; color: #666;">Severity:</td>
                                <td style="padding: 10px; font-weight: bold; color: #d32f2f;">HIGH</td>
                            </tr>
                        </table>

                        ${snapshot_path ?
                        `<div style="margin-bottom: 20px; text-align: center;">
                            <img src="cid:accident_snapshot" alt="Accident Snapshot" style="max-width: 100%; border-radius: 4px; border: 1px solid #ccc;">
                         </div>` : ''
                    }

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${mapLink}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Location on Maps</a>
                        </div>
                        
                         <div style="text-align: center; margin-top: 15px;">
                            <p style="color: #666; font-size: 12px;">Login to the SmartWay Dashboard for the full forensic report.</p>
                        </div>
                    </div>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0;">
                        SmartWay Traffic AI • Automated Alert System
                    </div>
                </div>
                `;

                // Prepare attachments if snapshot exists
                const attachments = [];
                if (snapshot_path && fs.existsSync(snapshot_path)) {
                    attachments.push({
                        filename: 'accident_snapshot.jpg',
                        path: snapshot_path,
                        cid: 'accident_snapshot' // SAME cid value as in the html img src
                    });
                }

                console.log("--- Attempting to Send Email ---");
                console.log("EMAIL_USER defined:", !!process.env.EMAIL_USER);
                console.log("To:", videoData?.email || process.env.EMAIL_USER);

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: videoData?.email || process.env.EMAIL_USER,
                    subject: `🚨 ACCIDENT ALERT at ${videoData?.city || 'Unknown'}`,
                    html: htmlContent, // Use HTML instead of text
                    attachments: attachments // Add embedded image
                })
                    .then(() => console.log("Email Alert Sent Successfully"))
                    .catch(err => console.error("Email API Failed:", err));
            } else {
                console.log("Email skipped: Credentials missing");
            }

            // 3b. Send WhatsApp (Twilio)
            if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
                const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
                const destPhone = process.env.ALERT_DESTINATION_PHONE || process.env.TWILIO_PHONE_NUMBER; // Fallback

                // Use the Short SMS Summary from AI, or fallback to generic alert
                const whatsappBody = smsSummary ?
                    `🚨 *SMARTWAY ALERT* 🚨\n${smsSummary}\n\n📍 ${locationStr}\n🔗 ${mapLink}` :
                    alertMsg;

                await client.messages.create({
                    body: whatsappBody,
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: `whatsapp:${destPhone}`
                }).catch(err => console.error("Twilio API Error:", err));
                console.log("WhatsApp Alert Sent");
            }

            // 4. Log to Alert Messages Table
            const { error: alertError } = await supabase
                .from('alert_messages')
                .insert([{
                    video_id: id,
                    type: analysis_summary['ACCIDENT'] ? 'Emergency' : 'Congestion',
                    message: alertMsg,
                    recipient: videoData?.email || process.env.EMAIL_USER,
                    delivery_status: 'sent'
                }]);

            if (alertError) console.error("Failed to log alert message:", alertError);
        }

        res.json({ message: 'Analysis updated and logged', video, ai_report: aiReport });
    } catch (error) {
        console.error('Update Analysis Error:', error);
        res.status(500).json({ error: 'Failed to update analysis' });
    }
});

// --- Legacy & Control Endpoints ---

// Manual Traffic Override
app.post('/api/override', async (req, res) => {
    try {
        const { junction_id, action } = req.body;
        const aiResponse = await axios.post('http://127.0.0.1:8000/traffic/override', {
            junction_id,
            action,
            mode: 'MANUAL'
        });
        res.json(aiResponse.data);
    } catch (error) {
        console.error('Override Error:', error.message);
        res.status(500).json({ error: 'Failed to apply override' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
