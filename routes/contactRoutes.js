
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
        to: ["hp9537213@gmail.com", "hardikpatan2324@gmail.com"],  // Multiple recipients
        subject: "New Contact Form Submission",
        text: `You have a new message from:
        
        Name: ${firstName} ${lastName}
        Email: ${email}
        Phone: ${phone}
        
        Message:
        ${message}
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
