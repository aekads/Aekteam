
const express = require("express");
const router = express.Router();
const transporter = require("../config/email");
const pool = require('../config/database'); 



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
                        📅 Received on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
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



router.get("/send-message2", async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;

    if (!firstName || !email || !phone ) {
        return res.status(400).json({ error: "All fields are required!" });
    }

    const downloadLink = "https://www.dropbox.com/scl/fi/pi38xqoc97n1pt4ule60l/AekAdDisplay2Apr_V_5_8.apk?rlkey=563veio4h8a58jk5000nfp0cy&st=n8bgsqxt&raw=1";

    const mailOptions = {
        from: "aekads.otp@gmail.com", // Update your official support email
        to: email, // Send to user's email
        subject: "🏆 Welcome to AekSports - Stay Updated with Live Scores & More!",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; color: #333;">
                <div style="max-width: 600px; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
                    
                    <h2 style="color: #0073e6; text-align: center;">🏆 Welcome to AekSports!</h2>
                    <p style="font-size: 16px; text-align: center;">Your ultimate destination for live sports updates, match schedules, and the latest sports news.</p>
                    
                    <hr style="border: 1px solid #ddd;">
                    
                    <h3 style="color: #333;">🔥 Key Features:</h3>
                    <ul style="list-style-type: none; padding: 0;">
                        <li>✅ Live Scores & Updates</li>
                        <li>✅ Match Schedules</li>
                        <li>✅ Breaking Sports News</li>
                        <li>✅ Exclusive Highlights</li>
                    </ul>
                    
                    <hr style="border: 1px solid #ddd;">
                    
                    <h3 style="color: #333; text-align: center;">📥 Download Now</h3>
                    <p style="text-align: center;">
                        <a href="${downloadLink}" style="background-color: #0073e6; color: #fff; padding: 12px 20px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;">⬇️ Download AekSports</a>
                    </p>

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
                        📅 Received on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Email sent successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to send email", details: error.message });
    }
});




router.post('/gmcComplainForm', async(req, res) => {
    try {
        const { name, Email, issue, description, screenid } = req.body;
        const query = 'INSERT INTO gmcComplainForm (name, Email, issue, description, screenid)  VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const values = [name, Email, issue, description, screenid];
        const result = await pool.query(query, values);
         res.status(200).json({ status: true, message: 'Data has been created successfully.', data: result.rows });
    } catch (error) {
        console.error(error);
        // res.status(500).json({ error: 'Failed to create Data' });
           res.status(500).json({ status: false, message: 'Internal server error' });
    }
});

// ✅ Export the router correctly
module.exports = router;
