const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const { verifyToken,requireHR } = require("../config/middleware");

// ✅ Employee Applies for Leave
router.post("/leave/apply", leaveController.applyLeave);

// ✅ Employee Views Their Leave List
router.get("/leave/list",verifyToken, leaveController.getLeaves);


router.get('/cc', leaveController.getEmployeeList);





router.get("/leave", verifyToken, leaveController.renderLeavePage);

router.post("/leave/cancel", leaveController.cancelLeave);


module.exports = router;  
  
