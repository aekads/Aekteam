  const express = require('express');
  const router = express.Router();
  const employeeController = require('../controllers/employeeController');

  // const hrController = require('../controllers/hrController');

  const  {verifyToken} = require('../config/middleware');

  // Employee dashboard home route
  router.get('/home', verifyToken, employeeController.getEmployeeHome);
  const { upload } = require("../config/cloudinary");
  const uploadFields = upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "passbook_image", maxCount: 1 },
    { name: "pan_card", maxCount: 1 },
    { name: "aadhar_card", maxCount: 1 },
    { name: "offer_letter", maxCount: 1 },
    { name: "last_company_experience_letter", maxCount: 1 },
  ]);

  // Employee Profile Page
  router.get("/profile", verifyToken, employeeController.getProfile);
  router.post("/profile/update", verifyToken, uploadFields, employeeController.updateProfile);


  router.post('/punch-in', verifyToken, employeeController.punchIn);
  router.post('/punch-out', verifyToken, employeeController.punchOut);


  router.get('/punch-status', verifyToken, employeeController.getPunchStatus);



  router.get('/attendance-page', verifyToken, employeeController.renderAttendancePage);
  router.get('/attendance', verifyToken, employeeController.getAttendanceByDate);


  router.get('/RegularizationPage', verifyToken, employeeController.renderRegularizationPage)
  router.post('/apply-permission', verifyToken, employeeController.applyPermission);

  // In your routes file (after other routes)
  router.get('/api/working-hours-summary', verifyToken, employeeController.getWorkingHoursSummary);

  module.exports = router;
