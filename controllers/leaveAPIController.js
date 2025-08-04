// leaveController.js
const pool = require("../config/db");


// Apply Leave
exports.applyLeave = async (req, res) => {
  try {
    const {
      emp_id,
      start_date,
      end_date,
      leave_type,
      half_day,
      reason,
      cc
    } = req.body;

    const applied_at = new Date();
    const status = 'pending';

    const result = await pool.query(
      `INSERT INTO public.leaves (emp_id, start_date, end_date, leave_type, half_day, reason, status, applied_at, cc, days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        emp_id,
        start_date,
        end_date,
        leave_type,
        half_day,
        reason,
        status,
        applied_at,
        cc,
        calculateDays(start_date, end_date, half_day)
      ]
    );

    res.json({ success: true, message: "Leave applied successfully", leave: result.rows[0] });
  } catch (error) {
    console.error('Error applying leave:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// List Leaves
exports.getLeaves = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM public.leaves ORDER BY applied_at DESC`);
    res.json({ success: true ,message: "successfully" , leaves: result.rows });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cancel Leave
exports.cancelLeave = async (req, res) => {
  try {
    const { leaveId } = req.body;

    const result = await pool.query(
      `UPDATE public.leaves SET status = 'Canceled' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [leaveId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ success: false, message: "Leave not found or already processed" });
    }

    res.json({ success: true, message: "Leave cancelled successfully", leave: result.rows[0] });
  } catch (error) {
    console.error('Error cancelling leave:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Helper to calculate leave days
function calculateDays(start, end, half_day) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeDiff = endDate - startDate;
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  return half_day ? 0.5 : days;
}
