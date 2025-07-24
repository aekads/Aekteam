// leaveRoutes.js
const express = require('express');
const router = express.Router();
const leaveController = require('./leaveAPIController');

// POST - Apply for leave
router.post('/leave/apply', leaveController.applyLeave);

// GET - List all leaves
router.get('/leave/list', leaveController.getLeaves);

// POST - Cancel leave
router.post('/leave/cancel', leaveController.cancelLeave);

module.exports = router;
