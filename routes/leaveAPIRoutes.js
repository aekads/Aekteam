    const express = require('express');
    const router = express.Router();
    const leaveController = require('../controllers/leaveAPIController'); // ✅ correct path
    const employeeController = require('../controllers/employeeController');
    router.post('/leave/apply', leaveController.applyLeave);
    router.get('/leave/list', leaveController.getLeaves);
    router.post('/leave/cancel', leaveController.cancelLeave);
    const pool = require("../config/db");

    // Get regularization info
    router.post('/regularization/list', leaveController.getRegularizationData);


    router.post('/punch-status', leaveController.getPunchStatus );
    router.post('/attendance', leaveController.getAttendanceByDate);


    // Submit a permission request
    router.post('/regularization/apply', leaveController.applyPermission);

// Employee Profile API
// Get Employee Profile by emp_id (POST)
router.post('/profile-emp', leaveController.getProfileAPI);

router.post('/profile/update', leaveController.updateProfileAPI);


// --- GET Work Projects ---
router.get("/Get-projects", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM public.work_projects ORDER BY created_at DESC`
    );
    res.json({ success: true, projects: result.rows });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- POST Time Entry ---
router.post("/time-entries", async (req, res) => {
  try {
    const { emp_id, work_description, project, start_time, end_time, date } =
      req.body;

    if (!emp_id || !work_description || !project || !start_time || !end_time || !date) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const result = await pool.query(
      `INSERT INTO public.time_entries_task
       (emp_id, work_description, project, start_time, end_time, date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [emp_id, work_description, project, start_time, end_time, date]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error("Error inserting time entry:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

    module.exports = router;
