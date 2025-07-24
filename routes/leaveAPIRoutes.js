const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveAPIController'); // ✅ correct path

router.post('/leave/apply', leaveController.applyLeave);
router.get('/leave/list', leaveController.getLeaves);
router.post('/leave/cancel', leaveController.cancelLeave);

module.exports = router;
