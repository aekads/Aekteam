
const express = require("express");
const router = express.Router();
const transporter = require("../config/email");




router.post("/send-message", async (req, res) => {
    const { firstName, lastName, email, phone, message } = req.body;

    if (!firstName || !email) {
        return res.status(400).json({ error: "firstName and email  required!" });
    }

    const mailOptions = {
        from: email,
        to: ["sales@aekads.com"],  // Multiple recipients
        subject: "🔔 New Lead Alert: Contact Form Submission",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; color: #333;">
                <div style="max-width: 600px; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #0073e6; text-align: center;">📩 New Lead Notification</h2>
                    <p style="font-size: 16px;">You have received a new inquiry from your contact form.</p>
                    <hr style="border: 1px solid #ddd;">
                    
                    <h3 style="color: #333;">👤 Contact Details:</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #0073e6;">${email}</a></p>
                    <p><strong>Phone:</strong> <a href="tel:${phone}" style="color: #0073e6;">${phone}</a></p>
                    
                    <hr style="border: 1px solid #ddd;">
                    
                    <h3 style="color: #333;">💬 Message:</h3>
                    <p style="font-style: italic; background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${message}</p>
                    
                    <hr style="border: 1px solid #ddd;">
                    
                    <p style="text-align: center; font-size: 14px; color: #888;">
                        📅 Received on: ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: "Message sent successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to send message", details: error.message });
    }
});

// ✅ Export the router correctly
module.exports = router;
