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
  cloud_name: 'dqfnwh89v',
  api_key: '451893856554714',
  api_secret: 'zgbspSZH8AucreQM8aL1AKN9S-Y',
});

router.post("/society-work/add", upload.single("work_photo"), verifyToken, async (req, res) => {
  let { society_name, screen_name, employee_work, emp_id } = req.body;

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

      // Parse employee_work as an array if it's sent as a string
      try {
          if (typeof employee_work === "string") {
              // Remove extra quotes if employee_work is a string, then parse it as JSON
              employee_work = JSON.parse(employee_work);
          }
      } catch (error) {
          return res.status(400).json({ status: false, message: "Invalid JSON format for employee_work." });
      }

      // Ensure employee_work is an array and format it correctly
      // if (!Array.isArray(employee_work)) {
      //     return res.status(400).json({ status: false, message: "employee_work should be an array." });
      // }

      // Ensure emp_code and other fields are plain strings (trim any extra spaces)
      emp_id = typeof emp_id === 'string' ? emp_id.trim() : emp_id;
      society_name = typeof society_name === 'string' ? society_name.trim() : society_name;
      screen_name = typeof screen_name === 'string' ? screen_name.trim() : screen_name;

      // Get current time in Asia/Kolkata timezone (formatted without milliseconds)
      const createdDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
      const updatedDate = createdDate;

      // Save data into the PostgreSQL table
      const query = `
          INSERT INTO public.society_work (society_name, screen_name, employee_work, work_photo, emp_id, created_date, updated_date)
          VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
          RETURNING *;
      `;
      const values = [society_name, screen_name, JSON.stringify(employee_work), workPhotoUrl, emp_id, createdDate, updatedDate];

      const dbResult = await pool.query(query, values);
      let responseData = dbResult.rows[0];

      // Format the dates before sending the response
      responseData.created_date = moment(responseData.created_date).format("YYYY-MM-DD HH:mm:ss");
      responseData.updated_date = moment(responseData.updated_date).format("YYYY-MM-DD HH:mm:ss");

      res.status(201).json({
          status: true,
          message: "Data saved successfully."
      });
  } catch (error) {
      console.error("Error saving data:", error);
      res.status(500).json({ status: false, message: "Internal server error." });
  }
});





// router.post("/society-work/list", verifyToken, async (req, res) => {
//     let { emp_id, filter_date } = req.body; // Read data from JSON body

//     if (!emp_id) {
//         return res.status(400).json({ status: false, message: "emp_id is required." });
//     }

//     try {
//         let query = `SELECT * FROM public.society_work WHERE emp_id = $1`;
//         let values = [emp_id];

//         // If filter_date is provided, filter by created_date
//         if (filter_date) {
//             query += ` AND DATE(created_date) = $2`;
//             values.push(filter_date);
//         }

//         // 🔹 Sort data in descending order
//         query += ` ORDER BY created_date DESC`;

//         const dbResult = await pool.query(query, values);

//         if (dbResult.rows.length === 0) {
//             return res.status(404).json({ status: false, message: "No records found." });
//         }

//         // 🔹 Format the dates before sending the response
//         const formattedData = dbResult.rows.map((row) => ({
//             ...row,
//             created_date: moment(row.created_date).format("YYYY-MM-DD HH:mm:ss"),
//             updated_date: moment(row.updated_date).format("YYYY-MM-DD HH:mm:ss"),
//         }));

//         res.status(200).json({
//             status: true,
//             message: "Data fetched successfully.",
//             data: formattedData,
//         });
//     } catch (error) {
//         console.error("Error fetching data:", error);
//         res.status(500).json({ status: false, message: "Internal server error." });
//     }
// });


router.post("/society-work/list", verifyToken, async (req, res) => {
  let { emp_id, filter_date } = req.body; // Read data from JSON body

  if (!emp_id) {
      return res.status(400).json({ status: false, message: "emp_id is required." });
  }

  try {
      let query = `SELECT * FROM public.society_work WHERE emp_id = $1`;
      let values = [emp_id];

      // If filter_date is provided, filter by created_date
      if (filter_date) {
          query += ` AND DATE(created_date) = $2`;
          values.push(filter_date);
      }

      // 🔹 Sort data in descending order
      query += ` ORDER BY created_date DESC`;

      const dbResult = await pool.query(query, values);

      if (dbResult.rows.length === 0) {
          return res.status(404).json({ status: false, message: "No records found." });
      }

      // 🔹 Fetch latest completed punch-in/out record
      const attendanceQuery = `
          SELECT id, emp_id, date, punch_in_time, punch_out_time
          FROM public.attendance
          WHERE emp_id = $1 AND punch_out_time IS NOT NULL
          ORDER BY punch_in_time DESC LIMIT 1
      `;
      const attendanceResult = await pool.query(attendanceQuery, [emp_id]);

      if (attendanceResult.rows.length > 0) {
        const attendance = attendanceResult.rows[0];
  
        latestAttendance = {
          ...attendance,
          date: moment(attendance.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
          punch_in_time: moment(attendance.punch_in_time).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
          punch_out_time: moment(attendance.punch_out_time).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
        };
      }
  
      // 🔹 Format the dates before sending the response
      const formattedData = dbResult.rows.map((row) => ({
        ...row,
        created_date: moment(row.created_date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
        updated_date: moment(row.updated_date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
      }));
  
      res.status(200).json({
          status: true,
          message: "Data fetched successfully.",
          data: formattedData,
          latest_attendance: latestAttendance, // ✅ Include latest completed punch record
      });
  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ status: false, message: "Internal server error." });
  }
});
      

  

  module.exports = router;                                                      
  

