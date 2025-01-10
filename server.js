const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const app = express();
const secretKey = 'your_secret_key';
const { body, validationResult } = require('express-validator');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.json());

app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true,
    })
);

// PostgreSQL Configuration
const pool = new Pool({
    user: "u3m7grklvtlo6",
    host: "35.209.89.182",
    database: "dbzvtfeophlfnr",
    password: "AekAds@24",
    port: 5432,
});

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or another email service
    auth: {
        user: "hp9537213@gmail.com",
        pass: "bnfd oupg gnvk npzx",
    },
});

// Generate emp_id
// Generate emp_id
async function generateEmpId() {
    const result = await pool.query('SELECT COUNT(*) FROM employees');
    const count = parseInt(result.rows[0].count) + 1;
    return `emp_${count.toString().padStart(2, '0')}`;
}

// Generate Unique 4-digit PIN
async function generateUniquePin() {
    let pin;
    let isUnique = false;

    while (!isUnique) {
        pin = Math.floor(1000 + Math.random() * 9000).toString(); // Random 4-digit PIN
        const result = await pool.query('SELECT * FROM employees WHERE pin = $1', [pin]);
        isUnique = result.rows.length === 0;
    }
    return pin;
}


const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer token
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // Add user details to request
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

// Routes

// Render Registration Page
app.get('/register', (req, res) => {
    res.render('register');
});

// API: Register Employee
app.post('/api/register', async (req, res) => {
    const { name, emp_number, email, role } = req.body; // Added role

    try {
        const emp_id = await generateEmpId();
        const pin = await generateUniquePin();

        // Insert into Database
        await pool.query(
            `INSERT INTO employees (emp_id, name, emp_number, email, pin, role) VALUES ($1, $2, $3, $4, $5, $6)`,
            [emp_id, name, emp_number, email, pin, role]
        );

        // Send Email
        const mailOptions = {
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name},\n\nYour registration is successful!\n\nEmployee ID: ${emp_id}\nPIN: ${pin}\nRole: ${role}\n\nThank you.`,
        };

        await transporter.sendMail(mailOptions);

        if (req.headers['content-type'] === 'application/json') {
            res.status(201).json({
                message: 'Registration successful',
                emp_id: emp_id,
                pin: pin,
                role: role, // Include role in the response
            });
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Error during registration' });
    }
});
// Render Login Page    for                                                                                                                    
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// API: Login Employee
app.post('/api/login', async (req, res) => {
    const { emp_id, pin } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM employees WHERE emp_id = $1 AND pin = $2',
            [emp_id, pin]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = jwt.sign(
                { emp_id: user.emp_id, name: user.name, role: user.role },
                secretKey,
                { expiresIn: '24h' }
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
                // login_time: loginTime, // Include login time in response
            });
        } else {
            res.status(401).json({
                status: false,
                message: 'Invalid Employee ID or PIN',
            });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            status: false,
            message: 'Error during login',
        });
    }
});



app.post('/api/logout', async (req, res) => {
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



app.post('/api/forgot-password', async (req, res) => {
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


// Render Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.send(`<h1>Welcome ${req.session.user.name}!</h1><a href="/logout">Logout</a>`);
});

// API: Logout Employee
// app.get('/logout', (req, res) => {
//     req.session.destroy((err) => {
//         if (err) {
//             console.error('Error during logout:', err);
//             return res.status(500).json({ message: 'Error during logout' });
//         }
//         if (req.headers['content-type'] === 'application/json') {
//             res.status(200).json({ message: 'Logout successful' });
//         } else {
//             res.redirect('/login');
//         }
//     });
// });






app.post('/api/inquiry', verifyToken, async (req, res) => {
    const {
        name,
        mobile_number,
        budget,
        screen_count,
        screen_type,
        total_days,
        campaign_remark,
    } = req.body;

    const employee_id = req.user.emp_id; // Extract from token

    try {
        const query = `
            INSERT INTO public.sales_enquiry 
            (name, mobile_number, budget, screen_count, screen_type, total_days, campaign_remark, employee_id, last_update_time, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'enquiry') 
            RETURNING id, name, mobile_number, budget, screen_count, screen_type, total_days, campaign_remark, employee_id, last_update_time, status;
        `;

        const result = await pool.query(query, [
            name,
            mobile_number,
            budget,
            screen_count,
            JSON.stringify(screen_type),
            total_days,
            campaign_remark,
            employee_id,
        ]);

        res.status(201).json({
            status: true,
            message: 'Campaign created successfully',
            data: result.rows[0],
        });
    } catch (error) {
        const errorDetails = {
            message: error.message,
            stack: error.stack,
        };

        console.error('[ERROR] Failed to create campaign:', JSON.stringify(errorDetails, null, 2));

        res.status(500).json({
            status: false,
            message: 'Failed to create campaign',
        });
    }
});


// PUT: Edit a Campaign by ID
app.post('/api/inquiry/edit',verifyToken, async (req, res) => {
    const {
        id,
        name,
        mobile_number,
        budget,
        screen_count,
        screen_type,
        total_days,
        campaign_remark,
        // employee_id,
    } = req.body;
    const employee_id = req.user.emp_id;
    try {
        const query = `
            UPDATE public.sales_enquiry 
            SET 
                name = $1, 
                mobile_number = $2, 
                budget = $3, 
                screen_count = $4, 
                screen_type = $5, 
                total_days = $6, 
                campaign_remark = $7, 
                employee_id = $8, 
                last_update_time = NOW(),
                status = 'enquiry'
            WHERE id = $9
            RETURNING id, name, mobile_number, budget, screen_count, screen_type, total_days, campaign_remark, employee_id, last_update_time, status;
        `;

        const result = await pool.query(query, [
            name,
            mobile_number,
            budget,
            screen_count,
            JSON.stringify(screen_type),
            total_days,
            campaign_remark,
            employee_id,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.status(200).json({
            status: true,
            message: 'Campaign updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({status:false, message: 'Failed to update campaign' });
    }
});




// app.post('/api/campaign/quotation/:id', async (req, res) => {
//     const { id } = req.params;
//     const {
//         city,
//         screen_type,
//         total_amount,
//         final_screen_count,
//         tag,
//         start_date,
//         end_date,
//         number_of_days,
//         payment_mode,
//         payment_url,
//     } = req.body;

//     try {
//         const query = `
//             UPDATE public.sales_enquiry
//             SET
//                 city = $1,
//                 screen_type = $2,
//                 total_value = $3,
//                 final_screen_count = $4,
//                 tag = $5,
//                 start_date = $6,
//                 end_date = $7,
//                 total_days = $8,
//                 payment_mode = $9,
//                 payment_url = $10,
//                 status = 'quotation submitted',
//                 last_update_time = NOW()
//             WHERE id = $11
//             RETURNING id, city, screen_type, total_value, final_screen_count, tag, start_date, end_date, total_days, payment_mode, status;
//         `;

//         const result = await pool.query(query, [
//             city,
//             JSON.stringify(screen_type),
//             total_amount,
//             final_screen_count,
//             tag,
//             start_date,
//             end_date,
//             number_of_days,
//             payment_mode,
//             payment_url,
//             id,
//         ]);

//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Campaign not found or invalid ID' });
//         }

//         res.status(200).json({
//             message: 'Quotation details submitted successfully for approval',
//             data: result.rows[0],
//         });
//     } catch (error) {
//         console.error('Error submitting quotation:', error);
//         res.status(500).json({ error: 'Failed to submit quotation' });
//     }
// });

app.post('/api/inquiry/quotation', verifyToken, async (req, res) => {
    const {
        id, // Campaign ID
        city,
        screen_type,
        total_amount,
        final_screen_count,
        tag,
        start_date,
        end_date,
        number_of_days,
        payment_mode,
        payment_url,
        // employee_id, // Employee responsible for submission
        remark // Additional remark
    } = req.body;
    const employee_id = req.user.emp_id;

    if (!id) {
        return res.status(400).json({ message: 'Campaign ID is required' });
    }

    try {
        const query = `
            UPDATE public.sales_enquiry
            SET
                city = $1,
                screen_type = $2,
                total_value = $3,
                final_screen_count = $4,
                tag = $5,
                start_date = $6,
                end_date = $7,
                total_days = $8,
                payment_mode = $9,
                payment_url = $10,
                employee_id = $11,
                remark = $12,
                status = 'Waiting for approval',
                last_update_time = NOW()
            WHERE id = $13
            RETURNING id, city, screen_type, total_value, final_screen_count, tag, start_date, end_date, total_days, payment_mode, payment_url, employee_id, remark, status, last_update_time;
        `;

        const result = await pool.query(query, [
            city,
            JSON.stringify(screen_type),
            total_amount,
            final_screen_count,
            JSON.stringify(tag),
            start_date,
            end_date,
            number_of_days,
            payment_mode,
            payment_url,
            employee_id,
            remark,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found or invalid ID' });
        }

        res.status(200).json({
            status: true,
            message: 'Quotation details submitted successfully for approval',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error submitting quotation:', error);
        res.status(500).json({ status:false, message: 'Failed to submit quotation' });
    }
});




app.post('/api/inquiry/quotation/edit', verifyToken, async (req, res) => {
    const {
        id, // Campaign ID
        city,
        screen_type,
        total_amount,
        final_screen_count,
        tag,
        start_date,
        end_date,
        number_of_days,
        payment_mode,
        payment_url,
        // employee_id, 
        remark // Additional remark
    } = req.body;
    const employee_id = req.user.emp_id;
    if (!id) {
        return res.status(400).json({ message: 'Campaign ID is required' });
    }

    try {
        const query = `
            UPDATE public.sales_enquiry
            SET
                city = $1,
                screen_type = $2,
                total_value = $3,
                final_screen_count = $4,
                tag = $5,
                start_date = $6,
                end_date = $7,
                total_days = $8,
                payment_mode = $9,
                payment_url = $10,
                employee_id = $11,
                remark = $12,
                last_update_time = NOW()
            WHERE id = $13
            RETURNING id, city, screen_type, total_value, final_screen_count, tag, start_date, end_date, total_days, payment_mode, payment_url, employee_id, remark, status, last_update_time;
        `;

        const result = await pool.query(query, [
            city,
            JSON.stringify(screen_type),
            total_amount,
            final_screen_count,
            JSON.stringify(tag),
            start_date,
            end_date,
            number_of_days,
            payment_mode,
            payment_url,
            employee_id,
            remark,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found or invalid ID' });
        }

        res.status(200).json({
            status: true,
            message: 'Campaign quotation updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating campaign quotation:', error);
        res.status(500).json({ status: false ,message: 'Failed to update campaign quotation' });
    }
});




// Start Server                                                                       
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
