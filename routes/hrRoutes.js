// routes/hrRoutes.js
const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const { verifyToken,requireHR  } = require('../config/middleware');
const { upload } = require('../config/cloudinary');
const leaveController = require("../controllers/leaveController");
require("dotenv").config();


// const upload = require("multer")({
//     storage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
// });
// const uploadFields = upload.fields([
//     { name: 'passbook_image', maxCount: 1 },
//     { name: 'pan_card', maxCount: 1 },
//     { name: 'aadhar_card', maxCount: 1 },
//     { name: 'offer_letter', maxCount: 1 },
//     { name: 'photo', maxCount: 1 },
//     { name: 'last_company_experience_letter', maxCount: 1 }
// ]);

// ✅ Define File Upload Fields
const uploadFields = upload.fields([
    { name: "passbook_image", maxCount: 1 },
    { name: "pan_card", maxCount: 1 },
    { name: "aadhar_card", maxCount: 1 },
    { name: "offer_letter", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "last_company_experience_letter", maxCount: 1 }
]);


router.get('/', verifyToken, requireHR, hrController.getHrDashboard);
router.get('/addEmployee', verifyToken, requireHR, hrController.getAddEmployeePage);

router.post('/addEmployee', uploadFields, verifyToken, requireHR, hrController.postAddEmployee);


// 🚀 Employee Routes
router.get('/employee/edit/:emp_id', verifyToken, hrController.getEditEmployeePage);
router.post('/update/:emp_id',uploadFields, hrController.postUpdateEmployee);



router.get('/employees/list', verifyToken, requireHR, hrController.renderEmployeeList);
  
 
// Route to show an individual employee profile
router.get("/employee/:emp_id",  verifyToken, requireHR, hrController.renderEmployeeProfile)

// ✅ HR Updates Leave Status
router.put("/update", verifyToken,requireHR, leaveController.updateLeaveStatus);

router.get('/approval', verifyToken,requireHR, leaveController.renderApprovalPage);

// Route to approve leave
router.post('/approve', verifyToken, requireHR, (req, res) => {
    req.body.status = 'Approved';
    leaveController.updateLeaveStatus(req, res);
});

// Route to reject leave
router.post('/reject', verifyToken, requireHR, (req, res) => {
    req.body.status = 'Rejected';
    leaveController.updateLeaveStatus(req, res);
}); 
  
 


router.get("/attendanceReport", verifyToken, requireHR, hrController.attendanceReport);
router.get("/exportAttendance", verifyToken, requireHR, hrController.exportAttendanceReport);
// Page to view and approve permissions
router.get("/approvePermission", verifyToken, requireHR, hrController.getPendingPermissions);

// Approve permission
router.post("/approvePermission/:id", verifyToken, requireHR, hrController.approvePermission);

// Reject permission
router.post("/rejectPermission/:id", verifyToken, requireHR, hrController.rejectPermission);



router.get("/leaveHistory",verifyToken, requireHR, hrController.leaveHistory);


module.exports = router;
  
