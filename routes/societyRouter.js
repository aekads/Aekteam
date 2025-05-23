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



//frontend Dashbaboard
router.get('/society-work', (req, res) => {
  res.render('maintenance', { emp_id: req.query.emp_id, name: req.query.name, assign_city: req.query.assign_city });
});
router.get("/society-work/list", verifyToken, async (req, res) => {
  const emp_id = req.query.emp_id;

  if (!emp_id) {
      return res.status(400).json({ status: false, message: "emp_id is required." });
  }

  try {
      const query = `
          SELECT id, society_name, screen_name, employee_work, work_photo, created_date 
          FROM public.society_work 
          WHERE emp_id = $1
          ORDER BY created_date DESC;
      `;
      const result = await pool.query(query, [emp_id]);

      res.status(200).json({ status: true, data: result.rows });
  } catch (error) {
      console.error("Error fetching work data:", error);
      res.status(500).json({ status: false, message: "Internal server error." });
  }
});


router.post("/society-work/add", upload.single("work_photo"), verifyToken, async (req, res) => {
  let { society_name, screen_name, employee_work, emp_id,ScreenId, inventoryId,inventoryQTY, remarks   } = req.body;

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

       // Check if employee_work includes "maintenance" and require ScreenId
       if (employee_work.includes("maintenance") && !ScreenId) {
        return res.status(400).json({ status: false, message: "ScreenId is required for maintenance work." });
    }


      // Ensure emp_code and other fields are plain strings (trim any extra spaces)
      emp_id = typeof emp_id === 'string' ? emp_id.trim() : emp_id;
      society_name = typeof society_name === 'string' ? society_name.trim() : society_name;
      screen_name = typeof screen_name === 'string' ? screen_name.trim() : screen_name;

      // Get current time in Asia/Kolkata timezone (formatted without milliseconds)
      const createdDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
      const updatedDate = createdDate;

      ScreenId = ScreenId ? parseInt(ScreenId) : null;
      inventoryId = inventoryId ? parseInt(inventoryId) : null;
      inventoryQTY = inventoryQTY ? parseInt(inventoryQTY) : null;

      // Save data into the PostgreSQL table
      const query = `
          INSERT INTO public.society_work (society_name, screen_name, employee_work, work_photo, emp_id, created_date, updated_date, ScreenId, inventoryId,inventoryQTY, remarks )
          VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *;
      `;
      const values = [society_name, screen_name, JSON.stringify(employee_work), workPhotoUrl, emp_id, createdDate, updatedDate, ScreenId, inventoryId,inventoryQTY, remarks ];
      console.log(values)
      const dbResult = await pool.query(query, values);
      let responseData = dbResult.rows[0];

      console.log(responseData)
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
//   let { emp_id, filter_date } = req.body;

//   if (!emp_id) {
//     return res.status(400).json({ status: false, message: "emp_id is required." });
//   }

//   try {
//     let query = `SELECT * FROM public.society_work WHERE emp_id = $1`;
//     let values = [emp_id];

//     if (filter_date) {
//       query += ` AND DATE(created_date) = $2`;
//       values.push(filter_date);
//     }

//     query += ` ORDER BY created_date DESC`;

//     const dbResult = await pool.query(query, values);

//     // 🔹 Fetch latest punch-in/out record (always execute this)
//     const attendanceQuery = `
//       SELECT id, emp_id, date, punch_in_time, punch_out_time
//       FROM public.attendance
//       WHERE emp_id = $1
//       ORDER BY punch_in_time DESC LIMIT 1
//     `;
//     const attendanceResult = await pool.query(attendanceQuery, [emp_id]);

//     let latestAttendance = null;

//     if (attendanceResult.rows.length > 0) {
//       const attendance = attendanceResult.rows[0];

//       latestAttendance = {
//         ...attendance,
//         date: moment.utc(attendance.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
//         punch_in_time: moment.utc(attendance.punch_in_time).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
//         punch_out_time: attendance.punch_out_time
//           ? moment.utc(attendance.punch_out_time).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
//           : null, // If punch_out_time is NULL, keep it as null
//       };
//     }

//     if (dbResult.rows.length === 0) {
//       return res.status(404).json({
//         status: false,
//         message: "No records found.",
//         latest_attendance: latestAttendance, // ✅ Always include attendance
//       });
//     }

//     // 🔹 Format the dates before sending the response
//     const formattedData = dbResult.rows.map((row) => ({
//       ...row,
//       created_date: moment.utc(row.created_date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
//       updated_date: moment.utc(row.updated_date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
//     }));

//     res.status(200).json({
//       status: true,
//       message: "Data fetched successfully.",
//       data: formattedData,
//       latest_attendance: latestAttendance,
//     });
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     res.status(500).json({ status: false, message: "Internal server error." });
//   }
// });

            
router.post("/society-work/list", verifyToken, async (req, res) => {
  let { emp_id, filter_date } = req.body;

  if (!emp_id) {
    return res.status(400).json({ status: false, message: "emp_id is required." });
  }

  try {
    let query = `SELECT * FROM public.society_work WHERE emp_id = $1`;
    let values = [emp_id];

    if (filter_date) {
      const [year, month] = filter_date.split("-"); // expecting "YYYY-MM"
      query += ` AND EXTRACT(MONTH FROM created_date) = $2 AND EXTRACT(YEAR FROM created_date) = $3`;
      values.push(month, year);
    }

    query += ` ORDER BY created_date DESC`;

    const dbResult = await pool.query(query, values);

    // 🔹 Fetch latest punch-in/out record (always execute this)
    const attendanceQuery = `
      SELECT id, emp_id, date, punch_in_time, punch_out_time
      FROM public.attendance
      WHERE emp_id = $1
      ORDER BY punch_in_time DESC LIMIT 1
    `;
    const attendanceResult = await pool.query(attendanceQuery, [emp_id]);

    let latestAttendance = {
      id: null,
      emp_id: emp_id,
      date: "null",
      punch_in_time: null,
      punch_out_time: null
    };

    if (attendanceResult.rows.length > 0) {
      const attendance = attendanceResult.rows[0];

      latestAttendance = {
        id: attendance.id,
        emp_id: attendance.emp_id,
        date: moment.utc(attendance.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
        punch_in_time: moment.utc(attendance.punch_in_time).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
        punch_out_time: attendance.punch_out_time
          ? moment.utc(attendance.punch_out_time).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
          : null, // If punch_out_time is NULL, keep it as null
      };
    }

    if (dbResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No records found.",
        latest_attendance: latestAttendance, // ✅ Always include attendance 
      });
    }

    // 🔹 Format the dates before sending the response
    const formattedData = dbResult.rows.map((row) => ({
      ...row,
      created_date: moment.utc(row.created_date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
      updated_date: moment.utc(row.updated_date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
    }));

    res.status(200).json({
      status: true,
      message: "Data fetched successfully.",
      data: formattedData,
      latest_attendance: latestAttendance,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ status: false, message: "Internal server error." });
  }
});


  

  module.exports = router;                                                      
  

