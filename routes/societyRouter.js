const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming you have a verifyToken middleware
const pool = require('../config/database');
const moment = require('moment-timezone');

const fs = require("fs");
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' }); 
const upload = multer({ dest: 'uploads/' });  
// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dnmdaadrr',
  api_key: '366566435625199',
  api_secret: 'JCfg4sL2x3c_EhfPiw6e6eqVIMQ',
});


router.post("/society-work/add", upload.single("work_photo"), verifyToken, async (req, res) => {
  let { society_name, screen_name, employee_work, emp_code } = req.body;

  if (!society_name) {
      return res.status(400).json({ status: false, message: "society_name is required." });
  }

  try {
      let workPhotoUrl = null; // Default to null if no file is uploaded

      // Upload photo to Cloudinary only if file exists
      if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path);
          workPhotoUrl = result.secure_url;

          // Delete temporary file after uploading to Cloudinary
          fs.unlinkSync(req.file.path);
      }

      // Ensure employee_work is parsed correctly
      try {
          if (typeof employee_work === "string") {
              employee_work = JSON.parse(employee_work);
          }
      } catch (error) {
          return res.status(400).json({ status: false, message: "Invalid JSON format for employee_work." });
      }

      // Save data into the PostgreSQL table
      const query = `
          INSERT INTO public.society_work (society_name, screen_name, employee_work, work_photo, emp_code, created_date, updated_date)
          VALUES ($1, $2, $3::jsonb, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *;
      `;
      const values = [society_name, screen_name, JSON.stringify(employee_work), workPhotoUrl, emp_code];

      const dbResult = await pool.query(query, values);

      res.status(201).json({
          status: true,
          message: "Data saved successfully.",
          data: dbResult.rows[0],
      });
  } catch (error) {
      console.error("Error saving data:", error);
      res.status(500).json({ status: false, message: "Internal server error." });
  }
});

  module.exports = router;                                                      
  
