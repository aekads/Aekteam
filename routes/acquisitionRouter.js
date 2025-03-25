const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming you have a verifyToken middleware
const pool = require('../config/database');
const moment = require('moment-timezone');
// const { logAction } = require('../utils/logger');

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' }); 

// Direct Cloudinary Configuration
// Cloudinary Configuration
cloudinary.config({ 
  cloud_name: 'dnmdaadrr', 
  api_key: '366566435625199', 
  api_secret: 'JCfg4sL2x3c_EhfPiw6e6eqVIMQ'
});

console.log('Cloudinary Config:', cloudinary.config()); // Debugging step

console.log('Using Cloudinary API Key:', cloudinary.config().api_key);
if (!cloudinary.config().api_key) {
  throw new Error('Cloudinary API key is missing!');
}



// CLOUDINARY_CLOUD_NAME=dnmdaadrr
// CLOUDINARY_API_KEY=366566435625199
// CLOUDINARY_API_SECRET=JCfg4sL2x3c_EhfPiw6e6eqVIMQ



// Upload Function (Using Upload Stream for Buffers)
// Upload function
// Upload function
const uploadFileToCloudinary = async (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto', // Auto-detect file type
        folder: 'acquisition_contracts',
        public_id: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
        type: 'upload',
        access_mode: 'public',
        overwrite: true
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          reject(error);
        } else {
          console.log('Cloudinary Upload Response:', result);
          resolve(result.secure_url);
        }
      }
    ).end(fileBuffer);
  });
};



// Set up Multer for file upload
// Set up Multer for memory storage (No local file saving)
const storage = multer.memoryStorage(); // Store file in memory (RAM)
const upload = multer({ storage: storage });  


const getClientIP = (req) => {
  let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (ip.includes(",")) ip = ip.split(",")[0]; // Handle multiple IPs
  return ip || "Unknown IP";
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





//render frontend page

router.get('/acquisition', (req, res) => {
  res.render('acquisition', { emp_id: req.query.emp_id, name: req.query.name, assign_city: req.query.assign_city });
});



router.get('/acquisition/DataList', verifyToken, async (req, res) => {
  const emp_id = req.query.emp_id; // Get emp_id from request query

  if (!emp_id) {
      return res.status(400).json({ status: false, message: "emp_id is required" });
  }

  try {
      const query = `SELECT * FROM acquisition WHERE emp_id = $1`;
      const result = await pool.query(query, [emp_id]);

      res.status(200).json({ status: true, data: result.rows });
  } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ status: false, message: "Internal server error" });
  }
});

router.get('/acquisition/details', verifyToken, async (req, res) => {
  const { id } = req.query;

  if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
  }

  try {
      const query = `SELECT * FROM acquisition WHERE id = $1`;
      const result = await pool.query(query, [id]);

      if (result.rowCount === 0) {
          return res.status(404).json({ status: false, message: "No property found" });
      }

      res.status(200).json({ status: true, data: result.rows[0] });
  } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
  }
});



//for APk API




router.post('/acquisition/add', verifyToken, async (req, res) => {
  const {
    property_name,
    address,
    screen_qty,
    per_screen_rent_price,
    latitude,
    longitude,
    state,
    city,
    pincode,
    Property_Type,
    contact_person_mobile_number // New field added
  } = req.body;
 
  // if (!property_name || !contact_person_mobile_number) {
  //   return res.status(400).json({ message: 'Property name and contact person mobile number are required', status: false });
  // }

  try {
    // Get the current timestamp in Asia/Kolkata timezone
    const currentTimestamp = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const emp_id = req.user?.emp_id;
    const inquiryStatus = "New Inquiry";

    // Check if the mobile number already exists
    const checkQuery = `SELECT id FROM acquisition WHERE contact_person_mobile_number = $1`;
    const checkResult = await pool.query(checkQuery, [contact_person_mobile_number]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ status: false, message: 'Contact person mobile number already exists' });
    }

    // Insert Query
    const query = `
      INSERT INTO acquisition 
      (property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, state, city, pincode, Property_Type, created_date, updated_date, emp_id, status, contact_person_mobile_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, state, city, pincode, Property_Type, created_date, updated_date, emp_id, status, contact_person_mobile_number;
    `;

    const latitudeValue = latitude || null;
    const longitudeValue = longitude || null;
    const PropertyTypeString = JSON.stringify(Property_Type);

    const values = [
      property_name,
      address,
      screen_qty,
      per_screen_rent_price,
      latitudeValue,
      longitudeValue,
      state,
      city,
      pincode,
      PropertyTypeString,
      currentTimestamp, // created_date
      currentTimestamp, // updated_date
      emp_id,
      inquiryStatus,
      contact_person_mobile_number // New field added
    ];

    const result = await pool.query(query, values);
    const newInquiry = result.rows[0];
    const propertyId = newInquiry.id;

    // Parse Property_Type if necessary
    if (newInquiry.Property_Type) {
      try {
        newInquiry.Property_Type = JSON.parse(newInquiry.Property_Type);
      } catch (err) {
        console.error('Error parsing Property_Type:', err);
      }
    }

    const logMessage = `Added new property: ${property_name}`;
    
    await logAction(req, "acquisition", logMessage, propertyId);
    console.log(logMessage);

    res.status(201).json({ status: true, message: 'Data added successfully' });
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
});


  

router.post('/acquisition/edit', verifyToken, async (req, res) => {
  const {
    id,
    property_name,
    address,
    screen_qty,
    per_screen_rent_price,
    latitude,
    longitude,
    total_tower,
    total_floor,
    final_screen_count,
    contact_person_name,
    contact_person_mobile_number,
    contact_person_position,
    full_address,
    final_screen_qty,
    final_per_screen_rent_price,
    remarks,
    status,
    state,
    city,
    pincode,
    Property_Type,
    household, 
    reach
    
  } = req.body;

  // Check if the required fields are provided
  if (!id || !property_name ) {
    return res.status(400).json({
      status: false,
      message: 'ID, Property name, Address, and screen_qty are required',
    });
  }

  try {
    // Ensure correct data type conversion for integers  

      // Fetch the previous status before updating
      const previousStatusQuery = `SELECT status FROM acquisition WHERE id = $1`;
      const previousStatusResult = await pool.query(previousStatusQuery, [id]);
      if (previousStatusResult.rowCount === 0) {
        return res.status(404).json({ status: false, message: 'No property found with the given ID' });
      }
      const previousStatus = previousStatusResult.rows[0].status;    
    
    const parseValue = (value, type = 'int') => {
      if (!value || value === '') return null;
      return type === 'int' ? parseInt(value, 10) : parseFloat(value);          
    };

    const screenQtyValue = parseValue(screen_qty);
    const totalTowerValue = parseValue(total_tower);
    const totalFloorValue = parseValue(total_floor);
    const finalScreenCountValue = parseValue(final_screen_count);
    const finalScreenQtyValue = parseValue(final_screen_qty);
    const finalPerScreenRentPriceValue = parseValue(final_per_screen_rent_price, 'float');
    const perScreenRentPriceValue = parseValue(per_screen_rent_price, 'float');

    const query = `
      UPDATE acquisition
      SET 
        property_name = $1,
        address = $2,
        screen_qty = $3,
        per_screen_rent_price = $4,
        latitude = $5,
        longitude = $6,
        total_tower = $7,
        total_floor = $8,
        final_screen_count = $9,
        contact_person_name = $10,
        contact_person_mobile_number = $11,
        contact_person_position = $12,
        full_address = $13,
        final_screen_qty = $14,
        final_per_screen_rent_price = $15,
        remarks = $16,
        updated_date = $17,
        status = $18,
        state = $19,
        city = $20,
        pincode = $21,
        Property_Type = $22, 
        household = $23, 
        reach = $24
      WHERE id = $25
      RETURNING id, property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, total_tower, total_floor, final_screen_count, contact_person_name, contact_person_mobile_number, contact_person_position, full_address, final_screen_qty, final_per_screen_rent_price, remarks,status, state,
    city,
    pincode,
    Property_Type,
    household, 
    reach ,updated_date, status
    `;

    // Get the current timestamp in Asia/Kolkata timezone
    const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // Optional fields are handled here
    const latitudeValue = latitude || null;
    const longitudeValue = longitude || null;

    // Values to be passed into the query
    const values = [
      property_name,
      address  || null,
      screenQtyValue || null,  // Ensure this is an integer
      perScreenRentPriceValue || null, // Ensure this is a number (float)
      latitudeValue || null,
      longitudeValue || null,
      totalTowerValue ||null, // Ensure this is an integer or null
      totalFloorValue || null, // Ensure this is an integer or null     
      finalScreenCountValue || null, // Ensure this is an integer or null
      contact_person_name || null,
      contact_person_mobile_number || null,
      contact_person_position || null,
      full_address || null,
      finalScreenQtyValue, // Ensure this is an integer or null
      finalPerScreenRentPriceValue, // Ensure this is a number (float)
      remarks || null,
      updatedDate,
      status, // Status can be set to 'inquiry' or another value
      state || null,
      city || null,
      pincode || null,
      JSON.stringify(Property_Type) || null,
      household || null, 
      reach || null,  
      id
    ];

    // Execute the query
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: 'No property found with the given ID',
      });
    }

    // Extract updated data
    const formattedData = result.rows.map((row) => ({
      ...row,
      updated_date: moment(row.updated_date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }));

    if (previousStatus !== status) {
      const logMessage = `The acquisition status has been updated from '${previousStatus}' to '${status}' for '${property_name}'`;
      await logAction(req, "acquisition", logMessage, id);
      console.log(logMessage);
    }
                                                

    res.status(200).json({
      status: true,
      message: 'Data updated successfully'
     
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
    });
  }
});

const fs = require('fs');


// Express route for handling PDF upload
router.post('/acquisition/upload', verifyToken, upload.single('pdf_file'), async (req, res) => {
  const { id, emp_id } = req.body;

  if (!id || !emp_id) {
    return res.status(400).json({ status: false, message: 'ID and emp_id are required.' });
  }
  if (!req.file) {
    return res.status(400).json({ status: false, message: 'PDF file is required.' });
  }

  try {
    console.log('Received File:', req.file.originalname);

    // ✅ 1. Check if Record Exists in Database
    const checkQuery = 'SELECT * FROM acquisition WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ status: false, message: 'Record not found with the given ID.' });
    }

    // ✅ 2. Upload the File to Cloudinary
    const pdfUrl = await uploadFileToCloudinary(req.file.buffer, req.file.originalname);
    console.log('Cloudinary URL:', pdfUrl);

    // ✅ 3. Update Database (Fixing Wrong API Usage)
    const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const updateQuery = `
      UPDATE acquisition
      SET emp_id = $1,
          contract_pdf_file = $2,
          updated_date = $3
      WHERE id = $4
      RETURNING *;
    `;

    const updateResult = await pool.query(updateQuery, [emp_id, pdfUrl, updatedDate, id]);

    if (updateResult.rowCount === 0) {
      return res.status(500).json({ status: false, message: 'Database update failed.' });
    }

    res.status(200).json({ status: true, message: 'PDF uploaded successfully.', pdfUrl });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ status: false, message: 'Internal server error.' });
  }
});



//fetches data   v 302,575 325,000

//fetches data  
router.post('/acquisition-list', verifyToken, async (req, res) => {
  const { emp_id } = req.body;

  // Validate input
  if (!emp_id) {
    return res.status(400).json({
      status: false,
      message: 'emp_id is required',
    });
  }

  try {
    const query = `
    SELECT
      id,
      property_name, 
      address, 
      screen_qty, 
      per_screen_rent_price, 
      latitude, 
      longitude,
      status,
      created_date,
      total_tower,
      total_floor,
      final_screen_count,
      contact_person_name,
      contact_person_mobile_number,
      contact_person_position,
      full_address,
      contract_pdf_file,
      final_screen_qty,
      final_per_screen_rent_price,
      remarks,
      emp_id,
      state,
      city,
      pincode,
      Property_Type,
      household, 
      reach
    FROM acquisition
    WHERE emp_id = $1
      AND status != 'created_screen' -- Exclude rows with status 'created_screen'
    ORDER BY created_date DESC;
  `;

    // Execute query with emp_id
    const result = await pool.query(query, [emp_id]);

    // Format data to adjust the date format
    const formattedData = result.rows.map((row) => ({
      ...row,
      created_date: moment(row.created_date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }));


       // 🔹 Fetch Latest Attendance Record
       const attendanceQuery = `
       SELECT id, emp_id, date, punch_in_time, punch_out_time
       FROM public.attendance
       WHERE emp_id = $1
       ORDER BY punch_in_time DESC 
       LIMIT 1;
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
         date: moment.utc(attendance.date)
           .tz('Asia/Kolkata')
           .format('YYYY-MM-DD HH:mm:ss'),
         punch_in_time: moment.utc(attendance.punch_in_time)
           .tz('Asia/Kolkata')
           .format('YYYY-MM-DD HH:mm:ss'),
         punch_out_time: attendance.punch_out_time
           ? moment.utc(attendance.punch_out_time)
               .tz('Asia/Kolkata')
               .format('YYYY-MM-DD HH:mm:ss')
           : null,
       };
     }
 

    res.status(200).json({
      status: true,
      message: 'Data fetched successfully',
      data: formattedData,
      latest_attendance: latestAttendance,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
    });
  }
});

  


  

          

router.get('/acquisition/locations',  verifyToken, async (req, res) => {
  try {
    // Hardcoded states and cities (can be fetched from a database if needed)
    const locations = {
      states: [
        "Gujarat",
        "Maharashtra",
        "Rajasthan"
      ],
      cities: [
        "Ahmedabad",
        "Gandhinagar",
        "Surat",
        "Rajkot",
        "Mumbai"
      ]
    };

    res.status(200).json({ status: true, message: 'Locations fetched successfully', data: locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
});



//





router.post('/acquisition/create-screen', verifyToken, async (req, res) => {
  const { id, screenname } = req.body;

  if (!id || !Array.isArray(screenname) || screenname.length === 0) {
    return res.status(400).json({ message: 'id and screenname (array) are required fields.' });
  }

  try {
    // Fetch necessary details from the acquisition table using the provided id
    const acquisitionQuery = `
      SELECT 
        full_address AS location, 
        city, 
        address AS area, 
        state, 
        pincode, 
        status, 
        household, 
        reach,
        property_type,
        property_name
      FROM public.acquisition
      WHERE id = $1;
    `;
    const acquisitionResult = await pool.query(acquisitionQuery, [id]);

    if (acquisitionResult.rows.length === 0) {
      return res.status(404).json({ message: 'No data found for the provided id in acquisition table.' });
    }

    const acquisitionData = acquisitionResult.rows[0];

    // Loop through the screenname array and insert each screenname as a separate row
    const screenInsertQuery = `
      INSERT INTO public.acquisition_screens (
        screenname, location, city, area, state, pincode, country, deleted, status, households, reach, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const insertedRows = [];

    for (const name of screenname) {
      const screenInsertResult = await pool.query(screenInsertQuery, [
        name,
        acquisitionData.location || '',
        acquisitionData.city || '',
        acquisitionData.property_name || '',
        acquisitionData.state || '',
        acquisitionData.pincode || '',
        acquisitionData.country || 'India',
        acquisitionData.deleted || false,
        'created_screen', // Hardcoded status
        acquisitionData.household || 0,
        acquisitionData.reach || 0,
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      ]);
      insertedRows.push(screenInsertResult.rows[0]); // Collect inserted rows for response
    }

    // Update the status field in the acquisition table
    const acquisitionUpdateQuery = `
      UPDATE public.acquisition
      SET status = 'created_screen'
      WHERE id = $1;
    `;
    await pool.query(acquisitionUpdateQuery, [id]);

    res.status(201).json({
      status: true,
      message: 'Screen created successfully',
      // screenData: insertedRows, // Return all inserted rows
    });
  } catch (error) {
    console.error('Error creating screen:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
});
  



// feath city vise screen data
router.post('/acquisition/screens', verifyToken, async (req, res) => {
  const { city } = req.body;

  // Validate input
  if (!city) {
    return res.status(400).json({
      status: false,
      message: 'City is required in the request body',
    });
  }

  try {
    const result = await pool.query(
      `SELECT screenid, screenname, pairingcode, status, created_at
       FROM public.acquisition_screens 
       WHERE LOWER(city) = LOWER($1)`,
      [city]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: `No screens found for city: ${city}`,
      });
    }

    // Format the created_at field for each row using moment-timezone
    const formattedData = result.rows.map((row) => ({
      ...row,
      created_at: moment(row.created_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), // Convert to IST and format
    }));

    res.status(200).json({
      status: true,
      message: 'Screens Data fetched successfully',
      data: formattedData,
    });
  } catch (error) {
    console.error('Error fetching screens:', error);
    res.status(500).json({
      status: false,
      message: 'Error fetching screens',
    });
  }
});




router.post("/acquisition/add-pairingcode", verifyToken, async (req, res) => {
  const { screenid, pairingcode } = req.body;

  if (!screenid || !pairingcode) {
    return res.status(400).json({ message: "screenid and pairingcode are required." });
  }

  try {
    const result = await pool.query(
      `UPDATE public.acquisition_screens 
       SET pairingcode = $1, status = $2 
       WHERE screenid = $3 
       RETURNING screenid, pairingcode, status`,
      [pairingcode, "PCode_Submited", screenid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "screenid does not exist." });
    }

    // Destructure the updated fields from the result
    const { screenid: updatedScreenId, pairingcode: updatedPairingCode, status } = result.rows[0];

    res.status(200).json({
      status: true,
      message: "Pairing code submited successfully.",
      data: {
        screenid: updatedScreenId,
        pairingcode: updatedPairingCode,
        status: status,
      },
    });
  } catch (error) {
    console.error("Error updating pairing code and status:", error);
    res.status(500).json({status: false, message: "Internal server error." });
  }
});


router.post("/acquisition/EditPairingCode", verifyToken, async (req, res) => {
  const { screenid, pairingcode } = req.body;

  if (!screenid || !pairingcode) {
    return res.status(400).json({ message: "screenid and pairingcode are required." });
  }

  try {
    const result = await pool.query(
      `UPDATE public.acquisition_screens 
       SET pairingcode = $1, status = $2 
       WHERE screenid = $3 
       RETURNING screenid, pairingcode, status`,
      [pairingcode, "PCode_Submited", screenid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "screenid does not exist." });
    }

    // Destructure the updated fields from the result
    const { screenid: updatedScreenId, pairingcode: updatedPairingCode, status } = result.rows[0];

    res.status(200).json({
      status: true,
      message: "Pairing code updated successfully.",
      data: {
        screenid: updatedScreenId,
        pairingcode: updatedPairingCode,
        status: status,
      },
    });
  } catch (error) {
    console.error("Error updating pairing code and status:", error);
    res.status(500).json({status: false, message: "Internal server error." });  
  }
});


                                                                                
  

  module.exports = router;                                                      
  
