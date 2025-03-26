
// models/employeeModel.js
const pool = require('../config/db');

//Login Models 
exports.findEmployeeById = async (emp_id) => {
    const result = await pool.query('SELECT * FROM employees WHERE emp_id = $1', [emp_id]);
    return result.rows[0];
};

exports.employeeCount = async () => {  // Remove unnecessary emp_id parameter
    const result = await pool.query(`SELECT COUNT(*) AS total FROM employees`);
    return result.rows[0].total;  // ✅ Return only the total count
};


//For Add emp HR                                                                

// Get last employee ID to generate next emp_id
exports.getLastEmployeeId = async () => {
    const query = `SELECT emp_id FROM employees ORDER BY created_at DESC LIMIT 1;`;
    try {
        const result = await pool.query(query);
        if (result.rows.length > 0) {
            return result.rows[0].emp_id; // Last emp_id
        }
        return null; // No existing employee
    } catch (error) {
        console.error("Error fetching last employee ID:", error);
        throw error;
    }
};

// Generate new employee ID
const generateEmpId = async () => {
    const result = await pool.query("SELECT emp_id FROM employees ORDER BY emp_id DESC LIMIT 1");
    
    if (result.rows.length > 0) {
        const lastEmpId = result.rows[0].emp_id; // Example: "emp_73"
        const lastNumber = parseInt(lastEmpId.split('_')[1]); // Extract number (73)
        return `emp_${lastNumber + 1}`; // Increment to "emp_74"
    }
    return 'emp_73'; // Default if no employees exist
};

// Generate a random 4-digit PIN
const generatePin = () => Math.floor(1000 + Math.random() * 9000);

// Add new employee
exports.addEmployee = async (employeeData) => {
    const {
        full_name, phone, designation, joining_date,role, resign_date, dob, alt_phone, city, ctc, 
        bank_number, ifsc, passbook_image, pan_card, aadhar_card, last_company_name, offer_letter, 
        photo, last_company_experience_letter
    } = employeeData;

    const emp_id = await generateEmpId(); // Auto-generate emp_id
    const pin = generatePin(); // Auto-generate 4-digit PIN

    // Ensure empty strings are converted to NULL
    const cleanValue = (value) => (value === "" ? null : value);

    const query = `
    INSERT INTO employees 
    (emp_id, name, emp_number, designation, role, joining_date, resign_date, dob, 
    alt_phone, assign_city, ctc, bank_number, ifsc, passbook_image, pan_card, 
    aadhar_card, last_company_name, offer_letter, photo, last_company_experience_letter, 
    pin, leave_balance, created_at, updated_at) 
    VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
     $17, $18, $19, $20, $21, $22, NOW(), NOW()) 
    RETURNING *;
`;

    try {
        const result = await pool.query(query, [
            emp_id, 
            full_name, 
            phone, 
            designation, 
            role,
            cleanValue(joining_date),  // Convert "" to NULL
            cleanValue(resign_date),   // Convert "" to NULL
            cleanValue(dob),           // Convert "" to NULL
            alt_phone, 
            city, 
            ctc, 
            bank_number, 
            ifsc, 
            passbook_image, 
            pan_card, 
            aadhar_card, 
            last_company_name, 
            offer_letter, 
            photo, 
            last_company_experience_letter, 
            pin,
            1.5  // Default leave balance
        ]);

        console.log("Inserted Employee Data:", result.rows[0]); // Debugging

        return result.rows[0];
    } catch (error) {
        console.error("DB Insert Error:", error);
        throw error;
    }
};
exports.updateEmployee = async (emp_id, updatedData) => {
    try {
        const fields = [];
        const values = [];
        let index = 1;

        for (const key in updatedData) {
            if (updatedData[key] !== undefined) { 
                fields.push(`${key}=$${index}`);
                values.push(updatedData[key] === "" ? null : updatedData[key]);
                index++;
            }
        }

        if (fields.length === 0) {
            throw new Error("No valid fields provided for update.");
        }

        values.push(emp_id);
        const query = `UPDATE employees SET ${fields.join(", ")}, updated_at=NOW() WHERE emp_id=$${index} RETURNING *`;

        const updatedEmployee = await pool.query(query, values);
        return updatedEmployee.rows[0];
    } catch (error) {
        console.error("Error updating employee in DB:", error);
        throw error;
    }
};




exports.getEmployeeById = async (emp_id) => {
    try {
        const query = `
            SELECT emp_id, name, emp_number, email, pin, role, token, status, assign_city, isdeleted, 
                   designation, joining_date, resign_date, dob, alt_phone, ctc, bank_number, ifsc, 
                   passbook_image, pan_card, aadhar_card, last_company_name, offer_letter, photo, 
                   last_company_experience_letter, leave_balance, total_accrued_leave, leave_taken
            FROM employees 
            WHERE emp_id = $1;
        `;

        const result = await pool.query(query, [emp_id]);

        if (result.rows.length === 0) {
            return null; // Employee not found
        }

        return result.rows[0]; // Return employee data
    } catch (error) {
        console.error("Error fetching employee by ID:", error);
        throw error;
    }
};



// employee roll Dashboard 


exports.getEmployees = async () => {
    try {
        const result = await pool.query(
            `SELECT emp_id, name, emp_number, designation, joining_date, resign_date, dob, alt_phone, 
                    assign_city, ctc, bank_number, ifsc, passbook_image, pan_card, aadhar_card, 
                    last_company_name, offer_letter, photo, last_company_experience_letter, 
                    created_at, updated_at 
             FROM employees 
             WHERE isdeleted = 0  -- Change false to 0
             ORDER BY created_at DESC`
        );

        return result.rows;
    } catch (error) {
        console.error("Error fetching employees:", error);
        throw error;
    }
};


exports.findEmployee = async (emp_id) => {
    try {
        const result = await pool.query(
            `SELECT emp_id, name, emp_number, email, role, photo, designation, joining_date, assign_city,bank_number,ifsc,leave_balance FROM employees WHERE emp_id = $1`,
            [emp_id]
        );

        return result.rows[0] || null;
    } catch (error) {
        console.error("Error fetching employee:", error);
        throw error;
    }
};

exports.updateEmployee = async (emp_id, updatedData) => {
    try {
        await pool.query(
            `UPDATE employees SET 
                name = $1, 
                email = $2, 
                emp_number = $3, 
                dob = $4, 
                assign_city = $5, 
                designation = $6, 
                bank_number = $7, 
                ifsc = $8, 
                updated_at = NOW() 
            WHERE emp_id = $9`,
            [
                updatedData.name,
                updatedData.email,
                updatedData.phone,
                updatedData.dob,
                updatedData.assign_city,
                updatedData.designation,
                updatedData.bank_number,
                updatedData.ifsc,
                emp_id
            ]
        );
    } catch (error) {
        console.error("Error updating employee:", error);
        throw error;
    }
};



                                                                                                                                                              


//for testing
// ✅ Fetch all employees
exports.findEmployees = async () => {
    try {
        const result = await pool.query("SELECT emp_id, name FROM employees");
        return result.rows; // Returns an array of employees
    } catch (error) {
        console.error("Database Error (findEmployees):", error);
        throw error;
    }
};

// ✅ Fetch attendance records with employee details
const moment = require("moment");
exports.getAttendanceReport = async ({ emp_id, start_date, end_date }) => {
    try {
        // ✅ Generate all dates for the selected range
        const allDates = [];
        let currentDate = moment(start_date);
        while (currentDate.isSameOrBefore(moment(end_date))) {
            allDates.push(currentDate.format("YYYY-MM-DD"));
            currentDate.add(1, "day");
        }

        const dateArray = allDates.length > 0 ? allDates : ["1900-01-01"]; // Fallback date if empty

        // ✅ Fix: Remove "Absent" from COALESCE
        let query = `
            SELECT 
                dates.date, 
                e.emp_id, 
                e.name, 
                a.punch_in_time, 
                a.punch_out_time,
                CASE 
                    WHEN a.punch_in_time IS NOT NULL AND a.punch_out_time IS NOT NULL THEN 'Present'
                    ELSE 'Absent' 
                END AS status
            FROM (
                SELECT UNNEST($1::DATE[]) AS date  
            ) AS dates
            CROSS JOIN employees e
            LEFT JOIN attendance a ON e.emp_id = a.emp_id AND dates.date = a.date
            WHERE ($2::TEXT IS NULL OR e.emp_id = $2::TEXT)  
            ORDER BY e.emp_id, dates.date;
        `;

        const result = await pool.query(query, [dateArray, emp_id || null]);
        return result.rows;
    } catch (error) {
        console.error("Database Error (getAttendanceReport):", error);
        throw error;
    }
};
exports.findEmployeee = async (emp_id = null) => {
    let query = `SELECT emp_id, name FROM employees`;
    const params = [];

    if (emp_id) {
        query += ` WHERE emp_id = $1`;
        params.push(emp_id);
    }

    query += ` ORDER BY name`;

    const result = await pool.query(query, params);
    return result.rows || []; // Always return an array
};                                                                                              

                                                                              


//punch in - out funtion models

// Check if employee has already punched in today
exports.getTodayPunch = async (emp_id, date) => {
    const result = await pool.query(
        'SELECT * FROM attendance WHERE emp_id = $1 AND date = $2',
        [emp_id, date]
    );
    return result.rows;
};

// Insert punch-in record
exports.punchIn = async (emp_id, date) => {
    await pool.query(
        `INSERT INTO attendance (emp_id, date, punch_in_time) 
         VALUES ($1, $2, to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')::timestamp)`,
        [emp_id, date]
    );
};
// Check if employee has punched in but not punched out
exports.getActivePunch = async (emp_id, date) => {
    const result = await pool.query(
        'SELECT * FROM attendance WHERE emp_id = $1 AND date = $2 AND punch_out_time IS NULL',
        [emp_id, date]
    );
    return result.rows;
};

// Update punch-out time
// Update punch-out time
exports.punchOut = async (emp_id, date) => {
    await pool.query(
        `UPDATE attendance 
         SET punch_out_time = to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')::timestamp
         WHERE emp_id = $1 AND date = $2 AND punch_out_time IS NULL`,
        [emp_id, date]
    );
};


exports.getAttendance = async (emp_id, date) => {
    const result = await pool.query(
        `SELECT 
            to_char(punch_in_time, 'YYYY-MM-DD HH24:MI:SS') AS punch_in_time, 
            to_char(punch_out_time, 'YYYY-MM-DD HH24:MI:SS') AS punch_out_time 
         FROM attendance 
         WHERE emp_id = $1 AND date = $2`,
        [emp_id, date]
    );
    return result.rows[0] || null;
};




//permison
exports.applyPermission = async (emp_id, type, from_time, to_time, reason) => {
    return pool.query(
        "INSERT INTO permissions (emp_id, type, from_time, to_time, reason) VALUES ($1, $2, $3, $4, $5)",
        [emp_id, type, from_time, to_time, reason]
    );
};

exports.getActivePermission = async (emp_id, date) => {
    return pool.query(
        "SELECT * FROM permissions WHERE emp_id = $1 AND from_time::date = $2 AND status = 'Approved'",
        [emp_id, date]
    );
};





// ✅ Get all pending permissions
exports.getPendingPermissions = async () => {
    try {
        const result = await pool.query("SELECT * FROM permissions WHERE status = 'Pending'");
        return result.rows;
    } catch (error) {
        console.error("Database Error:", error);
        throw error;
    }
};


exports.getPendingEmp = async (emp_id) => {
    try {
        const result = await pool.query(
            `SELECT id, type, from_time, to_time, reason, status, created_at 
             FROM permissions 
             WHERE emp_id = $1 AND status = 'Pending' 
             ORDER BY created_at DESC`,
            [emp_id]
        );
        return result.rows;
    } catch (error) {
        console.error("Database Error (getPendingPermissions):", error);
        throw error;
    }
};

exports.getHistoryPermissions = async (emp_id) => {
    try {
        const result = await pool.query(
            `SELECT id, type, from_time, to_time, reason, status, created_at, approved_at 
             FROM permissions 
             WHERE emp_id = $1 AND status IN ('Approved', 'Rejected') 
             ORDER BY created_at DESC`,
            [emp_id]
        );
        return result.rows;
    } catch (error) {
        console.error("Database Error (getHistoryPermissions):", error);
        throw error;
    }
};

// ✅ Get a specific permission by ID
exports.getPermissionById = async (id) => {
    try {
        const result = await pool.query("SELECT * FROM permissions WHERE id = $1", [id]);
        return result.rows.length ? result.rows[0] : null;
    } catch (error) {
        console.error("Database Error:", error);
        throw error;
    }
};

// ✅ Update permission status (Approved/Rejected)
exports.updatePermissionStatus = async (id, status) => {
    try {
        await pool.query("UPDATE permissions SET status = $1 WHERE id = $2", [status, id]);
    } catch (error) {
        console.error("Database Error:", error);
        throw error;
    }
};

// // ✅ Update punch-in time for Regularization approvals
// exports.updatePunchIn = async (emp_id, punch_in_time) => {
//     try {
//         await pool.query(
//             "UPDATE attendance SET punch_in = $1 WHERE emp_id = $2 AND date = CURRENT_DATE",
//             [punch_in_time, emp_id]
//         );
//     } catch (error) {
//         console.error("Database Error:", error);
//         throw error;
//     }
// }

// ✅ Update or insert punch-in time for Regularization approvals
// exports.updatePunchIn = async (emp_id, punch_in_time) => {
//     try {
//         // 1️⃣ Check if an attendance entry already exists for the employee today
//         const result = await pool.query(
//             `SELECT id FROM attendance WHERE emp_id = $1 AND date = CURRENT_DATE`,
//             [emp_id]
//         );

//         if (result.rows.length > 0) {
//             // 2️⃣ If entry exists, update the punch-in time
//             await pool.query(
//                 `UPDATE attendance 
//                  SET punch_in_time = $1
//                  WHERE emp_id = $2 AND date = CURRENT_DATE`,
//                 [punch_in_time, emp_id]
//             );
//             console.log(`✅ Punch-in updated for ${emp_id} at ${punch_in_time}`);
//         } else {
//             // 3️⃣ If no entry exists, insert a new record
//             await pool.query(
//                 `INSERT INTO attendance (emp_id, date, punch_in_time)
//                  VALUES ($1, CURRENT_DATE, $2)`,
//                 [emp_id, punch_in_time]
//             );
//             console.log(`✅ New punch-in record created for ${emp_id} at ${punch_in_time}`);
//         }
//     } catch (error) {
//         console.error("Database Error (updatePunchIn):", error);
//         throw error;
//     }
// };


// ✅ Update or insert punch-in & punch-out time for Regularization approvals
exports.updatePunchInOut = async (emp_id, date, punch_in_time, punch_out_time) => {
    try {
        // 1️⃣ Check if an attendance entry exists for the given date
        const result = await pool.query(
            `SELECT id FROM attendance WHERE emp_id = $1 AND date = $2`,
            [emp_id, date]
        );

        if (result.rows.length > 0) {
            // 2️⃣ If entry exists, update both punch-in and punch-out times
            await pool.query(
                `UPDATE attendance 
                 SET punch_in_time = $1, punch_out_time = $2
                 WHERE emp_id = $3 AND date = $4`,
                [punch_in_time, punch_out_time, emp_id, date]
            );
            console.log(`✅ Punch-in/out updated for ${emp_id} on ${date}`);
        } else {
            // 3️⃣ If no entry exists, insert a new record
            await pool.query(
                `INSERT INTO attendance (emp_id, date, punch_in_time, punch_out_time)
                 VALUES ($1, $2, $3, $4)`,
                [emp_id, date, punch_in_time, punch_out_time]
            );
            console.log(`✅ New attendance record created for ${emp_id} on ${date}`);
        }
    } catch (error) {
        console.error("Database Error (updatePunchInOut):", error);
        throw error;
    }
};













//for graph chart 

// ✅ Get leave stats for a given date
exports.getLeaveStats = async (date) => {
    const result = await pool.query(
`SELECT COUNT(*) as count FROM public.leaves 
         WHERE status = 'approved' 
         AND start_date <= $1 
         AND end_date >= $1`, 

        [date]
    );
    return result.rows[0].count;
};

// ✅ Get attendance stats for a given date
exports.getAttendanceStats = async (date) => {
    const presentResult = await pool.query(
        `SELECT COUNT(DISTINCT emp_id) as present 
         FROM public.attendance WHERE date = $1`, 
        [date]
    );

    const totalEmployeesResult = await pool.query(
        `SELECT COUNT(*) as total FROM public.employees`
    );

    // Extract correct values and ensure they are numbers
    const present = parseInt(presentResult.rows[0].present, 10) || 0;
    const totalEmployees = parseInt(totalEmployeesResult.rows[0].total, 10) || 0;
    const absent = totalEmployees - present;

    return { present, absent };
};
