import dotenv from 'dotenv';
import twilio from 'twilio';
dotenv.config();

async function testTwilio() {
    console.log("--- Testing Twilio Credentials ---");
    console.log("SID Exists:", !!process.env.TWILIO_SID);
    console.log("Token Exists:", !!process.env.TWILIO_AUTH_TOKEN);
    console.log("From Phone:", process.env.TWILIO_PHONE_NUMBER);
    console.log("To Phone:", process.env.ALERT_DESTINATION_PHONE);

    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.error("❌ Credentials Missing in .env!");
        return;
    }

    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    const from = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    const to = `whatsapp:${process.env.ALERT_DESTINATION_PHONE || process.env.TWILIO_PHONE_NUMBER}`;

    console.log(`\nAttempting to send from ${from} to ${to}...`);

    try {
        const message = await client.messages.create({
            body: '🚨 SmartWay Debug Test Message 🚨',
            from: from,
            to: to
        });
        console.log("✅ Message Sent! SID:", message.sid);
    } catch (error) {
        console.error("❌ Send Failed:", error.message);
        console.error("Detail:", error);
    }
}

testTwilio();
