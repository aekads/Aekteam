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
          longitude ,
          status,
          created_date
        FROM acquisition; 
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
