const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming you have a verifyToken middleware
const pool = require('../config/database');


router.post('/acquisition/add',verifyToken, async (req, res) => {
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
        const query = `
          INSERT INTO acquisition (property_name, address, screen_qty, per_screen_rent_price, latitude, longitude)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING property_name, address, screen_qty, per_screen_rent_price, latitude, longitude;
        `;

        const latitudeValue = latitude || null;
        const longitudeValue = longitude || null;

        const values = [property_name, address, screen_qty, per_screen_rent_price, latitudeValue, longitudeValue];
        const result = await pool.query(query, values);
    
        // Extract the specific fields from the query result
        const data = result.rows[0];
  
      res.status(201).json({  status: true ,message: 'Data added successfully', data });
    } catch (error) {
      console.error('Error adding property:', error);
      res.status(500).json({  status: false ,message: 'Internal server error' });
    }
  });
  
//fetches data  
  router.post('/acquisition-list',verifyToken, async (req, res) => {
    try {
      const query = `
        SELECT 
          property_name, 
          address, 
          screen_qty, 
          per_screen_rent_price, 
          latitude, 
          longitude 
        FROM acquisition;
      `;
  
      const result = await pool.query(query);
  
      // Send only the required fields in the response
      res.status(200).json({
        status: true,
        message: 'Data fetched successfully',
        
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({  status: false,message: 'Internal server error' });
    }
  });
  

  module.exports = router;
