const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming you have a verifyToken middleware
const pool = require('../config/database'); // Assuming you have configured your database connection
const moment = require('moment-timezone');

//for sales person



const getClientIP = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip.includes(',')) ip = ip.split(',')[0]; // Handle multiple IPs
  return ip || 'Unknown IP';
};

const logAction = async (req, action, message, salesEnquiryId = null) => {
  try {
    const ip = getClientIP(req);

    // Fetch user details from database if needed
    let userName = "Anonymous"; // Default name
    if (req.user && req.user.emp_id) {
      const userQuery = `SELECT name FROM employees WHERE emp_id = $1`;
      const userResult = await pool.query(userQuery, [req.user.emp_id]);
      userName =
        userResult.rows.length > 0 ? userResult.rows[0].name : "Anonymous";
    }

    const logMessage = `${userName} ${message}`;

    // Insert log into database and return the inserted log ID
    // const logQuery = `
    //         INSERT INTO public.sales_logs (action, message, ip, sales_enquiry_id, "createdAt", "updatedAt") 
    //         VALUES ($1, $2, $3, $4, NOW(), NOW()) 
    //         RETURNING id;
    //     `;
    const logQuery = `
        INSERT INTO public.sales_logs (action, message, ip, sales_enquiry_id, "createdAt", "updatedAt") 
        VALUES ($1, $2, $3, $4, NOW() AT TIME ZONE 'Asia/Kolkata', NOW() AT TIME ZONE 'Asia/Kolkata') 
        RETURNING id;
    `;

    const result = await pool.query(logQuery, [
      action,
      logMessage,
      ip,
      salesEnquiryId,
    ]);

    return result.rows[0].id; // Return the inserted log ID
  } catch (error) {
    console.error("Error logging action:", error);
    return null;
  }
};


//for frontend part
//render frontend page
router.get('/inquiry', (req, res) => {
  res.render('sales', { emp_id: req.query.emp_id, name: req.query.name, assign_city: req.query.assign_city });
});

router.get("/inquiry/list", verifyToken, async (req, res) => {
  try {
    const emp_id = req.user.emp_id; // Get employee ID from token

    const query = `
        SELECT se.id, se.name, se.mobile_number, se.budget, se.screen_count, 
       se.screen_type, se.total_days, se.campaign_remark, se.email, 
       se.company_name, se.status, se.assign_emp_id, 
       e.name AS assigned_employee_name, 
       TO_CHAR(se.created_time, 'YYYY-MM-DD HH24:MI:SS') AS created_time
        FROM public.sales_enquiry se
        LEFT JOIN public.employees e ON se.assign_emp_id = e.emp_id
        ORDER BY se.created_time DESC;

      `;

    const result = await pool.query(query, [emp_id]);
    res.status(200).json({ status: true, data: result.rows });

  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({ status: false, message: "Failed to fetch inquiries" });
  }
});




// router.post("/inquiry-list", verifyToken, async (req, res) => {
//   const { emp_id, filter_date } = req.body;

//   if (!emp_id) {
//     return res.status(400).json({
//       status: false,
//       message: "Employee ID is required",
//     });
//   }

//   try {

//     // 🔹 Fetch latest punch-in/out record (always execute this)
//     const attendanceQuery = `
//       SELECT id, emp_id, date, punch_in_time, punch_out_time
//       FROM public.attendance
//       WHERE emp_id = $1
//       ORDER BY punch_in_time DESC
//       LIMIT 1
//     `;
//     const attendanceResult = await pool.query(attendanceQuery, [emp_id]);

//     let latestAttendance = {
//       id: null,
//       emp_id: emp_id,
//       date: "null",
//       punch_in_time: null,
//       punch_out_time: null
//     };


//     if (attendanceResult.rows.length > 0) {
//       const attendance = attendanceResult.rows[0];

//       latestAttendance = {
//         id: attendance.id,
//         emp_id: attendance.emp_id,
//         date: moment
//           .utc(attendance.date)
//           .tz("Asia/Kolkata")
//           .format("YYYY-MM-DD HH:mm:ss"),
//         punch_in_time: moment
//           .utc(attendance.punch_in_time)
//           .tz("Asia/Kolkata")
//           .format("YYYY-MM-DD HH:mm:ss"),
//         punch_out_time: attendance.punch_out_time
//           ? moment
//             .utc(attendance.punch_out_time)
//             .tz("Asia/Kolkata")
//             .format("YYYY-MM-DD HH:mm:ss")
//           : null,
//       };
//     }
//     let query = `
//     SELECT 
//       se.id, se.name, se.mobile_number, se.email, se.budget, se.screen_count, 
//       se.screen_type, se.tag, se.final_screen_count, se.start_date, se.end_date, 
//       se.total_value, se.per_screen_cost, se.payment_mode, se.payment_url, 
//       se.remark, se.creative_video_url, se.quotation_url, se.last_update_time, 
//       se.status, se.total_days, se.emp_id, se.city, se.company_name, 
//       se.created_time, se.campaign_remark, se.assign_emp_id,

//       e1.name AS assigned_employee_name,
//       e2.name AS From_employee_name,
//       e2.emp_id AS created_employee_id

//     FROM public.sales_enquiry se
//     LEFT JOIN public.employees e1 ON se.assign_emp_id = e1.emp_id
//     LEFT JOIN public.employees e2 ON se.emp_id = e2.emp_id
//     WHERE (se.emp_id = $1 OR se.assign_emp_id = $1)
// `;

//     const queryParams = [emp_id];

//     if (filter_date) {
//       query += ` AND DATE(created_time) = $2`;
//       queryParams.push(filter_date);
//     }

//     query += ` ORDER BY created_time DESC;`;

//     const result = await pool.query(query, queryParams);


// // Count inquiries where `emp_id = $1` and `assign_emp_id IS NOT NULL`
// const countQuery = `
// SELECT COUNT(*) AS total_count
// FROM public.sales_enquiry AS se
// WHERE se.emp_id = $1 AND se.assign_emp_id IS NOT NULL
// `;

// const countResult = await pool.query(countQuery, [emp_id]);
// const totalCount = countResult.rows[0].total_count;




//     // ✅ Safely parse `screen_type`
//     const inquiries = result.rows.map((inquiry) => {
//       let parsedScreenType = null;

//       if (inquiry.screen_type) {
//         try {
//           parsedScreenType = JSON.parse(inquiry.screen_type);
//         } catch (error) {
//           // console.error(`Invalid JSON in screen_type for ID ${inquiry.id}:`, inquiry.screen_type);
//           parsedScreenType = inquiry.screen_type; // Keep it as is to debug
//         }
//       }

//       return {
//         ...inquiry,
//         screen_type: parsedScreenType,
//       };
//     });

//     res.status(200).json({
//       status: true,
//       message: "Inquiries Data fetched successfully",
//       data: inquiries,
//       latest_attendance: latestAttendance,
//       totalCount :totalCount

//     });
//   } catch (error) {
//     console.error("Error fetching inquiries data:", error);

//     res.status(500).json({
//       status: false,
//       message: "Failed to fetch inquiries Data",
//     });
//   }
// });


router.post("/inquiry-list", verifyToken, async (req, res) => {
  const { emp_id, filter_date } = req.body;

  if (!emp_id) {
    return res.status(400).json({
      status: false,
      message: "Employee ID is required",
    });
  }

  try {

    // 🔹 Fetch latest punch-in/out record (always execute this)
    const attendanceQuery = `
      SELECT id, emp_id, date, punch_in_time, punch_out_time
      FROM public.attendance
      WHERE emp_id = $1
      ORDER BY punch_in_time DESC
      LIMIT 1
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
        date: moment
          .utc(attendance.date)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD HH:mm:ss"),
        punch_in_time: moment
          .utc(attendance.punch_in_time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD HH:mm:ss"),
        punch_out_time: attendance.punch_out_time
          ? moment
            .utc(attendance.punch_out_time)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD HH:mm:ss")
          : null,
      };
    }
    let query = `
    SELECT 
      se.id, se.name, se.mobile_number, se.email, se.budget, se.screen_count, 
      se.screen_type, se.tag, se.final_screen_count, se.start_date, se.end_date, 
      se.total_value, se.per_screen_cost, se.payment_mode, se.payment_url, 
      se.remark, se.creative_video_url, se.quotation_url, se.last_update_time, 
      se.status, se.total_days, se.emp_id, se.city, se.company_name, 
      se.created_time, se.campaign_remark, se.assign_emp_id,

      e1.name AS assigned_employee_name,
      e2.name AS From_employee_name,
      e2.emp_id AS created_employee_id

    FROM public.sales_enquiry se
    LEFT JOIN public.employees e1 ON se.assign_emp_id = e1.emp_id
    LEFT JOIN public.employees e2 ON se.emp_id = e2.emp_id
    WHERE (se.emp_id = $1 OR se.assign_emp_id = $1)
`;

    const queryParams = [emp_id];

    if (filter_date) {
      query += ` AND TO_CHAR(created_time, 'YYYY-MM') = $2`;                    
      queryParams.push(filter_date);
    }
    

    query += ` ORDER BY created_time DESC;`;

    const result = await pool.query(query, queryParams);


// Count inquiries where `emp_id = $1` and `assign_emp_id IS NOT NULL`
const countQuery = `
SELECT COUNT(*) AS total_count
FROM public.sales_enquiry AS se
WHERE se.emp_id = $1 AND se.assign_emp_id IS NOT NULL
`;

const countResult = await pool.query(countQuery, [emp_id]);
const totalCount = countResult.rows[0].total_count;




    // ✅ Safely parse `screen_type`
    const inquiries = result.rows.map((inquiry) => {
      let parsedScreenType = null;

      if (inquiry.screen_type) {
        try {
          parsedScreenType = JSON.parse(inquiry.screen_type);
        } catch (error) {
          // console.error(`Invalid JSON in screen_type for ID ${inquiry.id}:`, inquiry.screen_type);
          parsedScreenType = inquiry.screen_type; // Keep it as is to debug
        }
      }

      return {
        ...inquiry,
        screen_type: parsedScreenType,
      };
    });

    res.status(200).json({
      status: true,
      message: "Inquiries Data fetched successfully",
      data: inquiries,
      latest_attendance: latestAttendance,
      totalCount :totalCount

    });
  } catch (error) {
    console.error("Error fetching inquiries data:", error);

    res.status(500).json({
      status: false,
      message: "Failed to fetch inquiries Data",
    });
  }
});




router.post("/inquiry", verifyToken, async (req, res) => {
  const {
    name,
    mobile_number,
    budget,
    screen_count,
    screen_type,
    total_days,
    campaign_remark,
    email,
    company_name, // Added company_name field
  } = req.body;

  const employee_id = req.user.emp_id; // Extract from token



  try {

    const checkQuery = `SELECT id FROM public.sales_enquiry WHERE mobile_number = $1 LIMIT 1;`;
    const existing = await pool.query(checkQuery, [mobile_number]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        status: false,
        message: "The mobile number already exists, and the lead is being handled by another person",
      });
    }



    const query = `
        INSERT INTO public.sales_enquiry 
        (name, mobile_number, budget, screen_count, screen_type, total_days, campaign_remark, email, company_name, emp_id, last_update_time, status, created_time) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                NOW() AT TIME ZONE 'Asia/Kolkata', 
                'New Inquiry', 
                NOW() AT TIME ZONE 'Asia/Kolkata') 
        RETURNING id, name, mobile_number, budget, screen_count, screen_type, total_days, campaign_remark, email, company_name, emp_id, 
                  TO_CHAR(last_update_time, 'YYYY-MM-DD HH24:MI:SS') AS last_update_time, 
                  status, 
                  TO_CHAR(created_time, 'YYYY-MM-DD HH24:MI:SS') AS created_time;
    `;

    const screenTypeString = JSON.stringify(screen_type);

    const result = await pool.query(query, [
      name,
      mobile_number,
      budget,
      screen_count,
      screenTypeString,
      total_days,
      campaign_remark,
      email,
      company_name, // Added company_name to query values
      employee_id,
    ]);

    // Parse screen_type back to JSON object to avoid extra escaping
    const responseData = result.rows[0];
    responseData.screen_type = JSON.parse(responseData.screen_type);
    const newInquiry = result.rows[0];
    const inquiryId = newInquiry.id; // Extract the ID of the created inquiry
    //add logs

    const user = req.session.user || req.user || { name: "Anonymous" };

    const logMessage = `,a new inquiry has been added for '${company_name}`;

    await logAction(req, "sales", logMessage, inquiryId);
    console.log(logMessage);

    res.status(201).json({
      status: true,
      message: "inquiry created successfully",
    });
    console.log(responseData);
  } catch (error) {
    console.error("Error during inquiry creation:", error);

    res.status(500).json({
      status: false,
      message: "Failed to create inquiry",
    });
  }
});


router.post('/inquiry/edit', verifyToken, async (req, res) => {
  const {
    id,
    name,
    mobile_number,
    budget,
    screen_count,
    screen_type,
    total_days,
    campaign_remark,
    email,
    company_name,
    status,
    assign_emp_id // This can be NULL if not provided
  } = req.body;

  const employee_id = req.user.emp_id;

  try {
    // Check if mobile number exists for another inquiry
    const checkQuery = `SELECT id FROM public.sales_enquiry WHERE mobile_number = $1 AND id != $2 LIMIT 1;`;
    const existingMobile = await pool.query(checkQuery, [mobile_number, id]);

    if (existingMobile.rows.length > 0) {
      return res.status(400).json({
        status: false,
        message: "The mobile number already exists, and the lead is being handled by another person",
      });
    }

    // Fetch current status and company_name before update
    const existingQuery = `SELECT status, company_name FROM public.sales_enquiry WHERE id = $1`;
    const existingResult = await pool.query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    const previousStatus = existingResult.rows[0].status || "";
    const company = existingResult.rows[0].company_name || "";

    // Update the inquiry
    const query = `
          UPDATE public.sales_enquiry 
          SET 
              name = $1, 
              mobile_number = $2, 
              budget = $3, 
              screen_count = $4, 
              screen_type = $5, 
              total_days = $6, 
              campaign_remark = $7, 
              emp_id = $8, 
              email = $9,
              company_name = $10,  
              last_update_time = NOW() AT TIME ZONE 'Asia/Kolkata',  
              status = $11,
              assign_emp_id = COALESCE($12, NULL)  -- If NULL, store NULL
          WHERE id = $13
          RETURNING 
              id, 
              name, 
              mobile_number, 
              budget, 
              screen_count, 
              screen_type, 
              total_days, 
              campaign_remark, 
              emp_id, 
              email, 
              company_name,  
              TO_CHAR(last_update_time, 'YYYY-MM-DD HH24:MI:SS') AS last_update_time,  
              status,
              assign_emp_id;  -- Return assign_emp_id
      `;

    const result = await pool.query(query, [
      name,
      mobile_number,
      budget,
      screen_count,
      JSON.stringify(screen_type),
      total_days,
      campaign_remark,
      employee_id,
      email,
      company_name,
      status,
      assign_emp_id || null, // If undefined, store NULL
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Log the action with formatted message
    const user = req.session.user || req.user || { name: "Anonymous" };
    const assignedEmpLog = assign_emp_id ? `Assigned Employee ID: ${assign_emp_id}` : "No assigned employee";

    const logMessage = `Updated inquiry. Status: '${previousStatus}' → '${status}', is ${company}, ${assignedEmpLog}`;

    await logAction(req, "sales", logMessage, id);

    console.log(logMessage);

    res.status(200).json({
      status: true,
      message: 'Inquiry updated successfully'
    });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    res.status(500).json({ status: false, message: 'Failed to update inquiry' });
  }
});



router.get("/inquiry/salesteamlist", verifyToken, async (req, res) => {
  try {
    const loggedInEmpId = req.user.emp_id; // Make sure verifyToken sets this properly

    const query = `
      SELECT emp_id, name 
      FROM public.employees 
      WHERE role = $1 AND isdeleted = 0 AND emp_id != $2
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, ["sales", loggedInEmpId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No sales employees found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Sales employees retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching sales employees:", error);
    res.status(500).json({
      status: false,
      message: "Failed to retrieve sales employees",
    });
  }
});




//not use  that two API


router.post('/inquiry/quotation', verifyToken, async (req, res) => {
  const {
    id, // Campaign ID
    city,
    screen_type,
    total_amount,
    final_screen_count,
    tag,
    start_date,
    end_date,
    number_of_days,
    payment_mode,
    payment_url,
    // employee_id, // Employee responsible for submission
    remark // Additional remark
  } = req.body;
  const employee_id = req.user.emp_id;

  if (!id) {
    return res.status(400).json({ message: 'inquiry ID is required' });
  }

  try {
    const query = `
            UPDATE public.sales_enquiry
            SET
                city = $1,
                screen_type = $2,
                total_value = $3,
                final_screen_count = $4,
                tag = $5,
                start_date = $6,
                end_date = $7,
                total_days = $8,
                payment_mode = $9,
                payment_url = $10,
                emp_id = $11,
                remark = $12,
                status = 'Waiting for approval',
                last_update_time = NOW()
            WHERE id = $13
            RETURNING id, city, screen_type, total_value, final_screen_count, tag, start_date, end_date, total_days, payment_mode, payment_url, emp_id, remark, status, last_update_time;
        `;

    const result = await pool.query(query, [
      city,
      JSON.stringify(screen_type),
      total_amount,
      final_screen_count,
      JSON.stringify(tag),
      start_date,
      end_date,
      number_of_days,
      payment_mode,
      payment_url,
      employee_id,
      remark,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'inquiry not found or invalid ID' });
    }

    res.status(200).json({
      status: true,
      message: 'Quotation details submitted successfully for approval',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error submitting quotation:', error);
    res.status(500).json({ status: false, message: 'Failed to submit quotation' });
  }
});



router.post('/inquiry/quotation/edit', verifyToken, async (req, res) => {
  const {
    id, // Campaign ID
    city,
    screen_type,
    total_amount,
    final_screen_count,
    tag,
    start_date,
    end_date,
    number_of_days,
    payment_mode,
    payment_url,
    // employee_id, 
    remark // Additional remark
  } = req.body;
  const employee_id = req.user.emp_id;
  if (!id) {
    return res.status(400).json({ message: 'inquiry ID is required' });
  }

  try {
    const query = `
            UPDATE public.sales_enquiry
            SET
                city = $1,
                screen_type = $2,
                total_value = $3,
                final_screen_count = $4,
                tag = $5,
                start_date = $6,
                end_date = $7,
                total_days = $8,
                payment_mode = $9,
                payment_url = $10,
                emp_id = $11,
                remark = $12,
                last_update_time = NOW()
            WHERE id = $13
            RETURNING id, city, screen_type, total_value, final_screen_count, tag, start_date, end_date, total_days, payment_mode, payment_url, emp_id, remark, status, last_update_time;
        `;

    const result = await pool.query(query, [
      city,
      JSON.stringify(screen_type),
      total_amount,
      final_screen_count,
      JSON.stringify(tag),
      start_date,
      end_date,
      number_of_days,
      payment_mode,
      payment_url,
      employee_id,
      remark,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'inquiry not found' });
    }

    res.status(200).json({
      status: true,
      message: 'inquiry quotation updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating inquiry quotation:', error);
    res.status(500).json({ status: false, message: 'Failed to update inquiry quotation' });
  }
});



module.exports = router;
