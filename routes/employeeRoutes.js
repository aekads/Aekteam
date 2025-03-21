const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// const hrController = require('../controllers/hrController');

const  {verifyToken} = require('../config/middleware');

// Employee dashboard home route
router.get('/home', verifyToken, employeeController.getEmployeeHome);

// Employee Profile Page
router.get('/profile', verifyToken, employeeController.getProfile);

router.post('/profile/update', verifyToken, employeeController.updateProfile);


router.post('/punch-in', verifyToken, employeeController.punchIn);
router.post('/punch-out', verifyToken, employeeController.punchOut);


router.get('/punch-status', verifyToken, employeeController.getPunchStatus);



router.get('/attendance-page', verifyToken, employeeController.renderAttendancePage);
router.get('/attendance', verifyToken, employeeController.getAttendanceByDate);


router.get('/RegularizationPage', verifyToken, employeeController.renderRegularizationPage)
router.post('/apply-permission', verifyToken, employeeController.applyPermission);



module.exports = router;
