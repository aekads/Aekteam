const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveAPIController'); // ✅ correct path
const employeeController = require('../controllers/employeeController');
router.post('/leave/apply', leaveController.applyLeave);
router.get('/leave/list', leaveController.getLeaves);
router.post('/leave/cancel', leaveController.cancelLeave);

// Get regularization info
router.post('/regularization/list', leaveController.getRegularizationData);


router.post('/punch-status', leaveController.getPunchStatus );


// Submit a permission request
router.post('/regularization/apply', leaveController.applyPermission);


module.exports = router;
