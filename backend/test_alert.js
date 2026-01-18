import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

dotenv.config();

async function testAlerts() {
    console.log("--- Testing Alerts ---");
    console.log("Loading .env...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "****" : "MISSING"); // Mask password
    console.log("TWILIO_SID:", process.env.TWILIO_SID);

    // 1. Email Test
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log("\n[1] Testing Email...");
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS.replace(/"/g, '') // Strip quotes just in case
                }
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER, // Send to self
                subject: 'Test Alert from SmartWay',
                text: 'If you see this, email configuration is working.'
            });
            console.log("✅ Email Sent Successfully!");
        } catch (error) {
            console.error("❌ Email Failed:", error);
        }
    } else {
        console.log("⚠️ Email credentials missing.");
    }

    // 2. WhatsApp Test
    if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
        console.log("\n[2] Testing WhatsApp...");
        try {
            const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
            const destPhone = process.env.ALERT_DESTINATION_PHONE || process.env.TWILIO_PHONE_NUMBER;

            console.log(`Sending from: whatsapp:${process.env.TWILIO_PHONE_NUMBER}`);
            console.log(`Sending to: whatsapp:${destPhone}`);

            const msg = await client.messages.create({
                body: "🚨 Test Alert from SmartWay Traffic System 🚨\nSuccess!",
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:${destPhone}`
            });
            console.log("✅ WhatsApp Sent! SID:", msg.sid);
        } catch (error) {
            console.error("❌ WhatsApp Failed:", error.message);
            if (error.code === 63015) {
                console.log("👉 HINT: This is a Twilio Sandbox limitation. The recipient must reply 'join <keyword>' to the sandbox number.");
            }
        }
    } else {
        console.log("⚠️ Twilio credentials missing.");
    }
}

testAlerts();
