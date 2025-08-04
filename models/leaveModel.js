const pool = require("../config/db");

// ✅ Apply for Leave
// exports.applyLeave = async (leaveData) => {
//     const { emp_id, start_date, end_date, leave_type, half_day, reason, cc } = leaveData;

//     const query = `
//         INSERT INTO leaves (emp_id, start_date, end_date, leave_type, half_day, reason, cc)
//         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
//     `;

//     const values = [emp_id, start_date, end_date, leave_type, half_day, reason, cc];
//     const result = await pool.query(query, values);
//     return result.rows[0];
// };
// exports.applyLeave = async ({ emp_id, start_date, end_date, leave_type, half_day, reason, cc }) => {
//     // Calculate leave days based on half_day flag and date range
//     let days;
//     if (half_day) {
//         days = 0.5;
//     } else {
//         const start = new Date(start_date);
//         const end = new Date(end_date);
//         // Calculate inclusive day difference
//         days = Math.round((end - start) / (1000 * 3600 * 24)) + 1;
//     }

//     // Optional: Check if employee has sufficient leave balance
//     const balanceQuery = `SELECT leave_balance FROM employees WHERE emp_id = $1;`;
//     const balanceResult = await pool.query(balanceQuery, [emp_id]);
//     if (balanceResult.rows.length === 0) {
//         throw new Error("Employee not found");
//     }
//     const currentBalance = parseFloat(balanceResult.rows[0].leave_balance);
//     if (currentBalance < days) {
//         throw new Error("Insufficient leave balance");
//     }

//     // Insert the leave application into the leaves table
//     const insertQuery = `
//         INSERT INTO leaves (emp_id, start_date, end_date, leave_type, half_day, reason, days, status)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
//         RETURNING *;
//     `;
//     const leaveResult = await pool.query(insertQuery, [
//         emp_id,
//         start_date,
//         end_date,
//         leave_type,
//         half_day,
//         reason,
//         days,
//     ]);
//     const leave = leaveResult.rows[0];

//     // Auto-cut (deduct) the applied leave days from the employee's leave_balance
//     const updateQuery = `
//         UPDATE employees
//         SET leave_balance = leave_balance - $1
//         WHERE emp_id = $2;
//     `;
//     await pool.query(updateQuery, [days, emp_id]);

//     return leave;
// };

exports.applyLeave = async ({ emp_id, start_date, end_date, leave_type, half_day, reason, cc }) => {
    // Calculate leave days based on half_day flag and date range
    let days;
    if (half_day) {
        days = 0.5;
    } else {
        const start = new Date(start_date);
        const end = new Date(end_date);
        // Calculate inclusive day difference
        days = Math.round((end - start) / (1000 * 3600 * 24)) + 1;
    }

    // Insert the leave application into the leaves table with status 'pending'
    const insertQuery = `
        INSERT INTO leaves (emp_id, start_date, end_date, leave_type, half_day, reason, days, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING *;
    `;
    const leaveResult = await pool.query(insertQuery, [
        emp_id,
        start_date,
        end_date,
        leave_type,
        half_day,
        reason,
        days,
    ]);

    return leaveResult.rows[0]; // Return the leave application details
};



// ✅ List Leaves with Filters
exports.getLeaves = async (filters) => {
    let query = `SELECT * FROM leaves WHERE 1=1`;
    let values = [];

    if (filters.emp_id) {
        query += ` AND emp_id = $${values.length + 1}`;
        values.push(filters.emp_id);
    }
    if (filters.status) {
        query += ` AND status = $${values.length + 1}`;
        values.push(filters.status);
    }
    if (filters.date) {
        query += ` AND start_date = $${values.length + 1}`;
        values.push(filters.date);
    }

    query += ` ORDER BY applied_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
};




// ✅ HR Approves/Rejects Leave
exports.updateLeaveStatus = async (leave_id, status, hr_id) => {
    // Fetch leave details before updating
    const leaveQuery = `SELECT emp_id, days, status FROM leaves WHERE id = $1;`;
    const leaveResult = await pool.query(leaveQuery, [leave_id]);

    if (leaveResult.rows.length === 0) {
        throw new Error("Leave request not found");
    }

    const { emp_id, days, status: currentStatus } = leaveResult.rows[0];

    // Prevent duplicate processing
    if (currentStatus !== 'pending') {
        throw new Error("Leave has already been processed");
    }

    // Update leave status and add HR reviewer details
    const updateLeaveQuery = `
        UPDATE leaves
        SET status = $1, reviewed_by = $2, reviewed_at = NOW()
        WHERE id = $3
        RETURNING *;
    `;
    const values = [status.toLowerCase(), hr_id, leave_id];
    const leaveUpdateResult = await pool.query(updateLeaveQuery, values);
    const updatedLeave = leaveUpdateResult.rows[0];

    // If HR approves, deduct leave balance
    if (status.toLowerCase() === 'approved') {
        const balanceQuery = `SELECT leave_balance FROM employees WHERE emp_id = $1;`;
        const balanceResult = await pool.query(balanceQuery, [emp_id]);

        if (balanceResult.rows.length === 0) {
            throw new Error("Employee not found");
        }

        let currentBalance = parseFloat(balanceResult.rows[0].leave_balance);
        let newBalance = currentBalance - days;

        // Optional: Prevent balance from going negative (remove this check if negative balance is allowed)
        if (newBalance < 0) {
            console.warn("Warning: Leave balance will go negative");
        }

        // Deduct leave balance
        const deductQuery = `
            UPDATE employees
            SET leave_balance = $1
            WHERE emp_id = $2
            RETURNING leave_balance;
        `;
        await pool.query(deductQuery, [newBalance, emp_id]);
    }

    return updatedLeave;
};



exports.getPendingLeaves = async () => {
    const query = `
        SELECT 
            l.id,
            l.emp_id,
            l.leave_type,
            l.start_date,
            l.end_date,
            l.status,
            e.name AS employee_name
        FROM 
            leaves l
        JOIN 
            employees e 
        ON 
            l.emp_id = e.emp_id
        WHERE 
            l.status = 'Pending'
        ORDER BY 
            l.start_date ASC;
    `;

    const result = await pool.query(query);
    return result.rows; // returns an array of leave applications with employee_name
};


// exports.getPendingLeaves = async () => {
//     const query = `
//       SELECT *
//       FROM leaves
//       WHERE status = 'pending'
//       ORDER BY applied_at DESC;
//     `;
//     const result = await pool.query(query);
//     return result.rows;
//   };
  


// ✅ Auto Add 1.5 Leaves Every Month (CRON Job)
exports.addMonthlyLeaveBonus = async () => {
    const query = `
        UPDATE employees 
        SET leave_balance = LEAST(leave_balance + 1.5, 30) 
        WHERE role != 'HR';
    `;
    await pool.query(query);
};



exports.getEmployeeLeaveData = async (emp_id) => {
    const query = `
        SELECT e.emp_id, e.name, e.leave_balance,
            (SELECT COALESCE(SUM(l.days), 0) 
             FROM leaves l 
             WHERE l.emp_id = e.emp_id AND l.status = 'approved') AS leave_taken
        FROM employees e
        WHERE e.emp_id = $1;
    `;
    const result = await pool.query(query, [emp_id]);
    return result.rows[0];
};
  

// ✅ Cancel Leave (Only if it's still pending)
exports.cancelLeaveById = async (leave_id) => {
    const query = `
        UPDATE leaves 
        SET status = 'Canceled'
        WHERE id = $1 AND status = 'pending'
        RETURNING *;
    `;
    const result = await pool.query(query, [leave_id]);
    return result.rowCount > 0; // Return true if update was successful
};

exports.findLeaveById = async (leave_id) => {
    const query = `
        SELECT * FROM leaves 
        WHERE id = $1 AND status = 'pending'
        LIMIT 1;
    `;
    const result = await pool.query(query, [leave_id]);
    return result.rows[0] || null; // Return the leave record or null
};


// Fetch attendance records with optional filters
exports.getAttendanceReport = async ({ emp_id, start_date, end_date }) => {
    let query = `SELECT a.id, a.emp_id, e.name, a.date, a.punch_in_time, a.punch_out_time 
                 FROM attendance a 
                 JOIN employees e ON a.emp_id = e.emp_id
                 WHERE 1=1 `;

    const params = [];

    if (emp_id) {
        query += ` AND a.emp_id = $${params.length + 1}`;
        params.push(emp_id);
    }
    if (start_date) {
        query += ` AND a.date >= $${params.length + 1}`;
        params.push(start_date);
    }
    if (end_date) {
        query += ` AND a.date <= $${params.length + 1}`;
        params.push(end_date);
    }

    query += ` ORDER BY a.date DESC`;

    const result = await pool.query(query, params);
    return result.rows;
};




//getLeaveHistory in leaveModel.js
exports.getLeaveHistory = async ({ emp_id, start_date, end_date }) => {
    try {
        const query = `
            SELECT 
                leaves.id, employees.emp_id, employees.name, leaves.leave_type, leaves.start_date, leaves.end_date, leaves.status 
            FROM leaves
            JOIN employees ON leaves.emp_id = employees.emp_id
            WHERE leaves.emp_id = $1 
            AND leaves.start_date BETWEEN $2 AND $3
            ORDER BY leaves.start_date DESC;
        `;
        const values = [emp_id, start_date, end_date];
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error("Error fetching leave history:", error);
        throw error;
    }
};
