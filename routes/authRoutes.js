const express = require('express');
const pool = require('../config/database');
const transporter = require('../config/email');
const { verifyToken } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';
const moment = require("moment-timezone");
const TIMEZONE = "Asia/Kolkata";
const cron = require("node-cron");
const router = express.Router();

// Helper functions
async function generateEmpId() {
    const result = await pool.query("SELECT nextval('emp_id_seq') AS id");
    const count = result.rows[0].id;
    return `emp_${count.toString().padStart(2, '0')}`;
}

async function generateUniquePin() {
    let pin;
    let isUnique = false;

    while (!isUnique) {
        pin = Math.floor(1000 + Math.random() * 9000).toString();
        const result = await pool.query('SELECT * FROM employees WHERE pin = $1', [pin]);
        isUnique = result.rows.length === 0;
    }
    return pin;
}

router.get('/register', (req, res) => {
    res.render('register');
});

// Routes
router.post('/register', async (req, res) => {
    const { name, emp_number, email, role, Assign_city } = req.body;
    
    const client = await pool.connect(); // Use client for transactions
    try {
        await client.query('BEGIN'); // Start transaction

        const emp_id = await generateEmpId();
        const pin = await generateUniquePin();

        await client.query(
            `INSERT INTO employees (emp_id, name, emp_number, email, pin, role, Assign_city) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [emp_id, name, emp_number, email || null, pin, role, Assign_city]
        );

        await client.query('COMMIT'); // Commit transaction

        res.status(201).json({ 
            message: 'Registration successful', 
            emp_id, 
            pin, 
            role, 
            city: Assign_city 
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on failure
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Error during registration' });
    } finally {
        client.release();
    }
});





router.get('/list', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees');
        res.render('list', { employees: result.rows });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).send('Error loading data');
    }
});

router.get('/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM employees WHERE emp_id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).send('Employee not found');
        }

        res.render('edit', { employee: result.rows[0] });
    } catch (error) {
        console.error('Error fetching employee for edit:', error);
        res.status(500).send('Error loading data');
    }
});

router.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { name, emp_number, email, assign_city, role } = req.body;

  
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        const result = await client.query(
            `UPDATE employees 
             SET name = $1, emp_number = $2, email = $3, assign_city = $4, role = $5 
             WHERE emp_id = $6 
             RETURNING *`,  // Returning updated row for verification
            [name, emp_number, email || null, assign_city, role, id]
        );

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send('Employee not found.');
        }

        await client.query('COMMIT'); // Commit transaction
        res.redirect('/api/list');
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on failure
        console.error('Error updating employee:', error);
        res.status(500).send('Error updating employee.');
    } finally {
        client.release();
    }
});








router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { emp_id, pin } = req.body;

    try {
        const result = await pool.query(
            'SELECT emp_id, name, role, Assign_city FROM employees WHERE emp_id = $1 AND pin = $2',
            [emp_id, pin]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = jwt.sign(
                { emp_id: user.emp_id, name: user.name, role: user.role,  assign_city: user.assign_city },
                secretKey,
                { expiresIn: '365d' }
            );

            // const loginTime = new Date(); // Capture the current login time

            // Update the database with the token and login status
            await pool.query(
                'UPDATE employees SET token = $1, status = $2 WHERE emp_id = $3',
                [token, 1, emp_id]
            );


            

            res.status(200).json({
                status: true,
                message: 'Login successful',
                token: token,
                emp_id: user.emp_id,
                name: user.name,
                role: user.role,
                assign_city: user.assign_city,
                redirect_url: user.role === 'acquisition' ? '/api/acquisition'
                             : user.role === 'sales' ? '/api/inquiry'
                             : user.role === 'maintenance' ? '/api/society-work'
                             : '/'
            });
      
            
        } else {
            res.status(401).json({
                status: false,
                message: 'Invalid Employee ID or PIN',
            });
        }
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({
            status: false,
            message: 'Error during login',
        });
    }
});
router.post('/logout', async (req, res) => {
    const { emp_id } = req.body; // Extract emp_id from the request body

    if (!emp_id) {
        return res.status(400).json({ message: 'Employee ID is required for logout' });
    }

    try {
        // Invalidate the token and update status to 0
        const result = await pool.query(
            'UPDATE employees SET token = NULL, status = $1 WHERE emp_id = $2 AND status = $3',
            [0, emp_id, 1] // Ensure the user is currently logged in (status = 1)
        );

        if (result.rowCount > 0) {
            res.status(200).json({ status: true,  message: 'Logout successful' });
        } else {
            res.status(400).json({
                status: false,
                message: ' user is already logged out',
            });
        }
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({  status: false ,message: 'Error during logout' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { emp_id } = req.body;

    try {
        // Fetch the employee record
        const result = await pool.query('SELECT * FROM employees WHERE emp_id = $1', [emp_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'Employee not found',
            });
        }

        const user = result.rows[0];
        const email = user.email;

        // Generate a new unique PIN
        const newPin = await generateUniquePin();

        // Update the database with the new PIN
        await pool.query('UPDATE employees SET pin = $1 WHERE emp_id = $2', [newPin, emp_id]);

        // Send the new PIN to the user's email
        const mailOptions = {
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: `Hello ${user.name},\n\nYour PIN has been reset successfully!\n\nNew PIN: ${newPin}\n\nPlease use this PIN to log in.\n\nThank you.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            status: true,
            message: 'New PIN sent to your email address',
        });
    } catch (error) {
        console.error('Error during password reset:', error);
        res.status(500).json({
            status: false,
            message: 'Error during password reset',
        });
    }
});



router.post('/employee-location',verifyToken, async (req, res) => {
    try {
        const { emp_id, latitude, longitude } = req.body;
    
        // Validate required fields
        if (!emp_id || latitude === undefined || longitude === undefined) {
          return res.status(400).json({
            error: 'emp_id, latitude, and longitude are required.'
          });
        }
    
        // Insert without providing created_time. The default value is used.
        const queryText = `
          INSERT INTO public.employee_locations (emp_id, latitude, longitude)
          VALUES ($1, $2, $3)
          RETURNING *;
        `;
        const values = [emp_id, latitude, longitude];
    
        const { rows } = await pool.query(queryText, values);
    
        // Respond with the inserted record (including the auto-set created_time)
        res.status(201).json({
            status: true,
            message: 'Location data added successfully.',
            // data: rows[0]
          });
        } catch (error) {
          console.error('Error inserting location data:', error);
          res.status(500).json({
            status: false,
            message: 'An error occurred while adding location data.'
          });
      }
    });

 router.get("/report", (req, res) => {
        res.render('report')
    })
    

 router.get("/auto-punch-out", async (req, res) => {
        try {
            const date = moment().tz(TIMEZONE).format("YYYY-MM-DD");
            const punchOutTime = moment().tz(TIMEZONE).set({ hour: 21, minute: 1, second: 0 }).format("YYYY-MM-DD HH:mm:ss");
    
            // Find employees who forgot to punch out
            const result = await pool.query(
                `SELECT id FROM attendance WHERE punch_out_time IS NULL AND date = $1`,
                [date]
            );
    
            if (result.rows.length === 0) {
                return res.json({ message: "✅ No pending punch-outs found." });
                console.log('no pending punch')
            }
    
            // Update punch-out time
            const idsToUpdate = result.rows.map(row => row.id);
            await pool.query(
                `UPDATE attendance SET punch_out_time = $1 WHERE id = ANY($2::int[])`,
                [punchOutTime, idsToUpdate]
            );

    
            res.json({ success: true, updated: idsToUpdate.length });
            console.log("success fully punch out",idsToUpdate.length)
        } catch (error) {
            console.error("❌ Error in Auto Punch-Out Task:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


          function scheduleAutoPunchOut() {
    const now = moment().tz(TIMEZONE);
    let targetTime = moment().tz(TIMEZONE).set({ hour: 21, minute: 0, second: 0 }); 

    if (now.isAfter(targetTime)) {
        targetTime.add(1, "day"); // Schedule for the next day if time has passed
    }

    const timeUntilNextRun = targetTime.diff(now);

    console.log(`Next auto punch-out scheduled in ${timeUntilNextRun / 1000 / 60} minutes.`);

    setTimeout(() => {
        autoPunchOutTask();

        // Ensure it repeats every 24 hours
        setInterval(autoPunchOutTask, 24 * 60 * 60 * 1000);
    }, timeUntilNextRun);
}

async function autoPunchOutTask() {
    try {
        const date = moment().tz(TIMEZONE).format("YYYY-MM-DD");
        const punchOutTime = moment().tz(TIMEZONE).set({ hour: 21, minute: 0, second: 0 }).format("YYYY-MM-DD HH:mm:ss"); // 9:00 PM

        const result = await pool.query(
            `SELECT id FROM attendance WHERE punch_out_time IS NULL AND date = $1`,
            [date]
        );

        if (result.rows.length === 0) {
            console.log("✅ No pending punch-outs found.");
            return;
        }

        const idsToUpdate = result.rows.map(row => row.id);
        await pool.query(
            `UPDATE attendance SET punch_out_time = $1 WHERE id = ANY($2::int[])`,
            [punchOutTime, idsToUpdate]
        );

        console.log(`✅ Successfully punched out ${idsToUpdate.length} employees.`);
    } catch (error) {
        console.error("❌ Error in Auto Punch-Out Task:", error);
    }
}

// Start the scheduling function when the server runs
scheduleAutoPunchOut();


    


    
    
    router.post("/punch", async (req, res) => {
        const { emp_id, punch_type } = req.body;
        const date = moment().tz(TIMEZONE).format("YYYY-MM-DD");
        const timestamp = moment().tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
    
        try {
            if (punch_type === "in") {
                // 🔹 Punch In: Create a new entry with NULL for punch_out_time
                const newEntry = await pool.query(
                    "INSERT INTO attendance (emp_id, date, punch_in_time, punch_out_time) VALUES ($1, $2, $3, NULL) RETURNING *",
                    [emp_id, date, timestamp]
                );
                return res.json({status: true,  message: "Punch In Successful", data: newEntry.rows[0] });
            } 
            
            else if (punch_type === "out") {
                // 🔹 Punch Out: Find the last punch-in without a punch-out
                const result = await pool.query(
                    "SELECT * FROM attendance WHERE emp_id = $1 AND punch_out_time IS NULL ORDER BY punch_in_time DESC LIMIT 1",
                    [emp_id]
                );
    
                if (result.rows.length === 0) {
                    return res.status(400).json({ message: "No open punch-in record found!" });
                }
    
                const punchInId = result.rows[0].id;
    
                // Update punch-out time
                await pool.query(
                    "UPDATE attendance SET punch_out_time = $1 WHERE id = $2",
                    [timestamp, punchInId]
                );
    
                // Fetch the updated record to include the punch_out_time in the response
                const updatedRecord = await pool.query(
                    "SELECT * FROM attendance WHERE id = $1",
                    [punchInId]
                );
    
                return res.json({ 
                    status: true, 
                    message: "Punch Out Successful", 
                    data: updatedRecord.rows[0] 
                });
            } 
            
            else {
                return res.status(400).json({status: false,  message: "Invalid punch_type. Use 'in' or 'out'." });
            }
    
        } catch (error) {
            res.status(500).json({status: false, message: "Error processing punch request", error });
        }
    });
    
  


    router.get("/employee-report", async (req, res) => {
        try {
            const query = `
          SELECT 
    e.emp_id, e.name, e.role,
    a.punch_in_time, a.punch_out_time,
    COALESCE(s.lead_count, 0) AS lead_count,  
    COALESCE(sw.screen_count, 0) AS screen_count  
FROM public.employees e
LEFT JOIN (
    SELECT emp_id, MAX(punch_in_time) AS punch_in_time, MAX(punch_out_time) AS punch_out_time
    FROM public.attendance
    WHERE "date" = CURRENT_DATE  
    GROUP BY emp_id
) a ON e.emp_id = a.emp_id
LEFT JOIN (
    SELECT emp_id, COUNT(*) AS lead_count 
    FROM public.sales_enquiry 
    WHERE DATE(created_time) = CURRENT_DATE  
    GROUP BY emp_id
) s ON e.emp_id = s.emp_id
LEFT JOIN (
    SELECT emp_id, COUNT(*) AS screen_count 
    FROM public.society_work 
    WHERE DATE(created_date) = CURRENT_DATE  
    GROUP BY emp_id
) sw ON e.emp_id = sw.emp_id
WHERE e.role IN ('sales', 'maintenance')  -- ✅ Filter only 'sales' and 'maintenance' roles
AND e.isdeleted = 0  -- ✅ Exclude deleted employees
ORDER BY e.emp_id;

        `;
    
            const result = await pool.query(query);
            const employees = result.rows.map(row => ({
                ...row,
                punch_in_time: row.punch_in_time ? moment(row.punch_in_time).tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss") : "-",
                punch_out_time: row.punch_out_time ? moment(row.punch_out_time).tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss") : "-"
            }));
    
            res.render("employeeReport", { employees });
        } catch (error) {
            console.error("Error fetching employee report:", error);
            res.status(500).send("Internal Server Error");
        }
    });
    
    
// node cron 





   

  async function fetchEmployeeReport() {
        try {
            const query = `
            SELECT 
    e.emp_id, e.name, e.role,
    a.punch_in_time, a.punch_out_time,
    COALESCE(s.lead_count, 0) AS lead_count,  
    COALESCE(sw.screen_count, 0) AS screen_count  
FROM public.employees e
LEFT JOIN (
    SELECT emp_id, MAX(punch_in_time) AS punch_in_time, MAX(punch_out_time) AS punch_out_time
    FROM public.attendance
    WHERE "date" = CURRENT_DATE  
    GROUP BY emp_id
) a ON e.emp_id = a.emp_id
LEFT JOIN (
    SELECT emp_id, COUNT(*) AS lead_count 
    FROM public.sales_enquiry 
    WHERE DATE(created_time) = CURRENT_DATE  
    GROUP BY emp_id
) s ON e.emp_id = s.emp_id
LEFT JOIN (
    SELECT emp_id, COUNT(*) AS screen_count 
    FROM public.society_work 
    WHERE DATE(created_date) = CURRENT_DATE  
    GROUP BY emp_id
) sw ON e.emp_id = sw.emp_id
WHERE e.role IN ('sales', 'maintenance')  -- ✅ Filter only 'sales' and 'maintenance' roles
AND e.isdeleted = 0  -- ✅ Exclude deleted employees
ORDER BY e.emp_id;

        `;
    
            const result = await pool.query(query);
            return result.rows.map(row => ({
                ...row,
                punch_in_time: row.punch_in_time ? moment(row.punch_in_time).tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss") : "-",
                punch_out_time: row.punch_out_time ? moment(row.punch_out_time).tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss") : "-"
            }));
        } catch (error) {
            console.error("Error fetching employee report:", error);
            return [];
        }
    }





    
    // Function to send email
    async function sendEmailReport() {
        const employees = await fetchEmployeeReport();
        if (employees.length === 0) {
            console.log("No employee data to send.");
            return;
        }
    
        // Convert employee data to an HTML table
         // Define styles for table
         let emailBody = `
         <h2 style="text-align: center; color: #007BFF;">Employee Daily Work & Progress Report - ${moment().format("YYYY-MM-DD")}</h2>
         <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center; font-family: Arial, sans-serif;">
             <tr style="background-color: #007BFF; color: white; font-weight: bold;">
                 <th>#</th>
                 <th>Emp ID</th>
                 <th>Name</th>
                 <th>Role</th>
                 <th>Punch In</th>
                 <th>Punch Out</th>
                 <th>Working Hours</th>
                 <th>Lead Count (Sales)</th>
                 <th>Screen Count (Maintenance)</th>
             </tr>
         `;
     
         employees.forEach((emp, index) => {
             const leadCount = emp.role === "sales" ? emp.lead_count : "-";
             const screenCount = emp.role === "maintenance" ? emp.screen_count : "-";
     
             let workingHours = "-";
             let nameStyle = "font-weight: normal;"; // Default styling
             let bgColor = "";
             let textColor = "black";
     
             // 🛑 If employee is maintenance & forgot to punch in, make name Bold & Red
             if (emp.role === "maintenance" && (!emp.punch_in_time || emp.punch_in_time === "-")) {
                 nameStyle = "font-weight: bold; color: red;";
             }
     
             let punchInFormatted = emp.punch_in_time;
             let punchOutFormatted = emp.punch_out_time;
     
             // ✅ If employee has both punch-in and punch-out
             if (emp.punch_in_time && emp.punch_out_time && emp.punch_in_time !== "-" && emp.punch_out_time !== "-") {
                //  const punchIn = moment(emp.punch_in_time, "YYYY-MM-DD HH:mm:ss");
                //  const punchOut = moment(emp.punch_out_time, "YYYY-MM-DD HH:mm:ss");
                const punchIn = moment.tz(emp.punch_in_time, "YYYY-MM-DD HH:mm:ss", TIMEZONE);
            const punchOut = moment.tz(emp.punch_out_time, "YYYY-MM-DD HH:mm:ss", TIMEZONE);
            
        
                
            punchInFormatted = punchIn.format("YYYY-MM-DD HH:mm:ss");
            punchOutFormatted = punchOut.format("YYYY-MM-DD HH:mm:ss");

                 const duration = moment.duration(punchOut.diff(punchIn));
                 workingHours = `${Math.floor(duration.asHours())}h ${duration.minutes()}m`;
     
                 // 🔴 Red Background if Worked Less Than 9 Hours
                 if (duration.asHours() < 9) {
                     nameStyle = "font-weight: bold;";
                     bgColor = "red";
                     textColor = "white"; // White Text for visibility
                 }
             }
     
             // 🟡 Yellow Highlight if:
             // - Sales has No Lead (lead_count = 0)
             // - Maintenance has No Screen Entry (screen_count = 0)
             if (
                 (emp.role === "sales" && emp.lead_count === 0) || 
                 (emp.role === "maintenance" && emp.screen_count === 0)
             ) {
                 bgColor = "yellow";
                 textColor = "black";
             }
     
          
                        emailBody += `
            <tr>
                <td>${index + 1}</td>
                <td>${emp.emp_id}</td>
                <td style="${nameStyle} background-color: ${bgColor}; color: ${textColor};">${emp.name}</td>
                <td>${emp.role}</td>
               <td>${punchInFormatted}</td>
            <td>${punchOutFormatted}</td>
                <td>${workingHours}</td>
                <td>${leadCount}</td>
                <td>${screenCount}</td>
            </tr>
            `;
         });
     
         emailBody += `</table>`;

         emailBody += `</table>
    
         <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
             <strong>Employee Daily Activity-Progress Report</strong> tracks employee productivity throughout the workday. 
             This report allows employees to document the tasks they performed, the time spent on each task, 
             whether the task was successfully completed, and any challenges they encountered.
         </p>
         
         <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
             This report benefits both managers and employees, providing supervisors with a comprehensive overview 
             of each team member’s progress while helping individuals analyze their productivity and work habits.
         </p>
         
         <p style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #007BFF;">
             Thank you for your dedication and hard work. Your contributions are valuable to our company’s success.
         </p>
         
         <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
             Best Regards,<br>
             <strong>AekAds Team</strong>
         </p>
     `;
    
        // Email options
        const mailOptions = {
            from: "your-email@gmail.com", // Replace with your email
            to: "hp9537213@gmail.com, shaikhanish1992@gmail.com, sahaskumbhani221@gmail.com, aravind@aekads.com",
            // to: "hp9537213@gmail.com",

         
            
            
            subject: "Daily Employee Report",
            html: emailBody,
        };
    
        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Email sent successfully:", info.response);
            }
        });
    }
    
    
    // Schedule the cron job to run every day at 4:30 PM
    cron.schedule("10 21 * * 1-6", () => {
        console.log("Running daily employee report job at 4:30 PM (excluding Sundays)...");
        sendEmailReport();
    }, {
        scheduled: true,
        timezone: TIMEZONE, // Ensure correct timezone
    });
    

module.exports = router;

