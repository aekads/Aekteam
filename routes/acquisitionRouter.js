const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming you have a verifyToken middleware
const pool = require('../config/database');
const moment = require('moment-timezone');


router.post('/acquisition/add', verifyToken, async (req, res) => {
  const {
    property_name,
    address,
    screen_qty,
    per_screen_rent_price,
    latitude,
    longitude
  } = req.body;

  if (!property_name || !address) {
    return res.status(400).json({ message: 'Property name and address are required', status: false });
  }

  try {
    // Get the current timestamp in a simplified format (Asia/Kolkata timezone)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    const query = `
      INSERT INTO acquisition (property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, created_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, created_date;
    `;

    const latitudeValue = latitude || null;
    const longitudeValue = longitude || null;

    // Add `createdDate` to the values array
    const values = [property_name, address, screen_qty, per_screen_rent_price, latitudeValue, longitudeValue, createdDate];

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
    contract_pdf_file,
    final_screen_qty,
    final_per_screen_rent_price,
    remarks
  } = req.body;

  // Check if the required fields are provided
  if (!id || !property_name || !address) {
    return res.status(400).json({
      status: false,
      message: 'ID, Property name, and Address are required',
    });
  }

  try {
    // Prepare the query to update the acquisition
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
        contract_pdf_file = $14,
        final_screen_qty = $15,
        final_per_screen_rent_price = $16,
        remarks = $17,
        updated_date = $18,
        status = $19
      WHERE id = $20
      RETURNING id, property_name, address, screen_qty, per_screen_rent_price, latitude, longitude, total_tower, total_floor, final_screen_count, contact_person_name, contact_person_mobile_number, contact_person_position, full_address, contract_pdf_file, final_screen_qty, final_per_screen_rent_price, remarks, updated_date, status;
    `;

    // Get the current timestamp in Asia/Kolkata timezone
    const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // Handle optional values
    const latitudeValue = latitude || null;
    const longitudeValue = longitude || null;

    // Set `status` to "approved"
    const statusValue = "approved";

    // Values to be passed into the query
    const values = [
      property_name,
      address,
      screen_qty,
      per_screen_rent_price,
      latitudeValue,
      longitudeValue,
      total_tower || null,
      total_floor || null,
      final_screen_count || null,
      contact_person_name || null,
      contact_person_mobile_number || null,
      contact_person_position || null,
      full_address || null,
      contract_pdf_file || null,
      final_screen_qty || null,
      final_per_screen_rent_price || null,
      remarks || null,
      updatedDate,
      statusValue,
      id,
    ];

    // Execute the query
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      // No rows affected, likely invalid ID
      return res.status(404).json({
        status: false,
        message: 'No property found with the given ID',
      });
    }

    // Extract updated data
    const data = result.rows[0];

    res.status(200).json({
      status: true,
      message: 'Data updated successfully',
      data,
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
    });
  }
});

  
//fetches data  
  router.post('/acquisition-list',verifyToken, async (req, res) => {
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
        created_date
      FROM acquisition
      ORDER BY created_date DESC; -- Sort by created_date in descending order
    `;
  
      const result = await pool.query(query);
  
      const formattedData = result.rows.map((row) => ({
        ...row,
        created_date: moment(row.created_date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
      }));

      // Send only the required fields in the response
      res.status(200).json({
        status: true,
        message: 'Data fetched successfully',
        data: formattedData,
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({  status: false,message: 'Internal server error' });
    }
  });
  
  

  module.exports = router;
