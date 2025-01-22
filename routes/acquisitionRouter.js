const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming you have a verifyToken middleware
const pool = require('../config/database');
const moment = require('moment-timezone');

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


router.post('/acquisition/add', verifyToken, async (req, res) => {
  const {
    property_name,
    address,
    screen_qty,
    per_screen_rent_price,
    latitude,
    longitude,
    emp_id,
    state,
    city,
    pincode,
    Property_Type
  } = req.body;

  if (!property_name || !address) {
    return res.status(400).json({ message: 'Property name and address are required', status: false });
  }

  try {
    // Get the current timestamp in a simplified format (Asia/Kolkata timezone)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    

    const query = `
    INSERT INTO acquisition (property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, state, city, pincode,Property_Type, created_date, emp_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, state, city, pincode,Property_Type, created_date, emp_id;
  `;

    const latitudeValue = latitude || null;
    const longitudeValue = longitude || null;

    // Add `createdDate` to the values array
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
      Property_Type,
      createdDate,
      emp_id
    ];

    const result = await pool.query(query, values);

    // Extract the specific fields from the query result
    const data = result.rows[0];

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
    state,
    city,
    pincode,
    Property_Type,
    household, 
    reach
    
  } = req.body;

  // Check if the required fields are provided
  if (!id || !property_name || !address || !screen_qty) {
    return res.status(400).json({
      status: false,
      message: 'ID, Property name, Address, and screen_qty are required',
    });
  }

  try {
    // Ensure correct data type conversion for integers
    const parseValue = (value, type = 'int') => {
      if (value === undefined || value === null) return null;
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
      RETURNING id, property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, total_tower, total_floor, final_screen_count, contact_person_name, contact_person_mobile_number, contact_person_position, full_address, final_screen_qty, final_per_screen_rent_price, remarks, state,
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
      address,
      screenQtyValue,  // Ensure this is an integer
      perScreenRentPriceValue, // Ensure this is a number (float)
      latitudeValue,
      longitudeValue,
      totalTowerValue, // Ensure this is an integer or null
      totalFloorValue, // Ensure this is an integer or null
      finalScreenCountValue, // Ensure this is an integer or null
      contact_person_name || null,
      contact_person_mobile_number || null,
      contact_person_position || null,
      full_address || null,
      finalScreenQtyValue, // Ensure this is an integer or null
      finalPerScreenRentPriceValue, // Ensure this is a number (float)
      remarks || null,
      updatedDate,
      'inquiry', // Status can be set to 'inquiry' or another value
      state || null,
      city || null,
      pincode || null,
      Property_Type || null,
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

    res.status(200).json({
      status: true,
      message: 'Data updated successfully',
      data: formattedData,
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
    });
  }
});




router.post(
  '/acquisition/upload',
  verifyToken,
  upload.single('pdf_file'),
  async (req, res) => {
    const { id, emp_id } = req.body;

    // Validate input
    if (!id || !emp_id) {
      return res.status(400).json({
        status: false,
        message: 'ID and emp_id are required.',
      });
    }

    try {
      // Check if the record exists
      const checkQuery = 'SELECT * FROM acquisition WHERE id = $1';
      const checkResult = await pool.query(checkQuery, [id]);

      if (checkResult.rowCount === 0) {
        return res.status(404).json({
          status: false,
          message: 'Record not found with the given ID.',
        });
      }

      // Upload the PDF to Cloudinary
      let pdfUrl = null;
      if (req.file) {
        const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'raw',
          folder: 'acquisition_contracts',
        });
        pdfUrl = uploadResponse.secure_url;
      } else {
        return res.status(400).json({
          status: false,
          message: 'PDF file is required.',
        });
      }

      // Update the record in the database
      const updateQuery = `
        UPDATE acquisition
        SET emp_id = $1,
            contract_pdf_file = $2,
            updated_date = $3
        WHERE id = $4
        RETURNING *;
      `;
      const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
      const updateResult = await pool.query(updateQuery, [emp_id, pdfUrl, updatedDate, id]);

      res.status(200).json({
        status: true,
        message: 'pdf upload successfully.'
      });
    } catch (error) {
      console.error('Error updating record:', error);
      res.status(500).json({
        status: false,
        message: 'Internal server error.',
      });
    }
  }
);



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
        emp_id
      FROM acquisition
      WHERE emp_id = $1
      ORDER BY created_date DESC; -- Sort by created_date in descending order
    `;

    // Execute query with emp_id
    const result = await pool.query(query, [emp_id]);

    // Format data to adjust the date format
    const formattedData = result.rows.map((row) => ({
      ...row,
      created_date: moment(row.created_date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }));

    res.status(200).json({
      status: true,
      message: 'Data fetched successfully',
      data: formattedData,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
    });
  }
});

  

                                                                                  


  module.exports = router;  

