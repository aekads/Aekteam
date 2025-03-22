const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const employeeController = require('../controllers/employeeController');
const { verifyToken,restrictToAllowedEmployees  } = require('../config/middleware');


router.get("/", verifyToken,restrictToAllowedEmployees, projectController.getProjectsPage);
router.post("/add", verifyToken, projectController.createProject);

// router.post("/edit/:id", verifyToken, projectController.editProject);
// router.put("/edit/:id", verifyToken, projectController.editProject);
// router.put("/edit/:id", verifyToken, projectController.editProject);
router.put("/edit/:id", verifyToken, projectController.editProject);





router.get("/addTask", verifyToken, projectController.getTimeEntriesByDay);
router.post("/addTask", verifyToken, projectController.addTimeEntry);

router.post("/update-time-entry",verifyToken, projectController.updateTimeEntry);


// Fetch Employees for Dropdown
router.get("/get-employees",verifyToken, projectController.getEmployees);

// Fetch Work Summary Data for Chart
router.get("/get-summary",verifyToken, projectController.getSummary);

// Render Summary Report Page
router.get("/summary-report",verifyToken, projectController.renderSummaryReport);

// router.get("/get-projects",verifyToken, projectController.getProjects);

//testing
                                                                                              

// Get own summary report
router.get("/own-summary",verifyToken, projectController.getOwnSummary);




//tesing

// Route to render user's own work summary page
router.get("/summary-reportOwn",verifyToken, projectController.renderSummaryOwnReport);

// API to fetch logged-in user's work summary
router.get("/get-own-summary",verifyToken, projectController.getOwnSummary);




module.exports = router;
