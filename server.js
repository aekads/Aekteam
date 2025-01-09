const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const app = express();
const secretKey = 'your_secret_key';
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
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // Add user details to request
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// Routes

// Render Registration Page
app.get('/register', (req, res) => {
    res.render('register');
});

// API: Register Employee
app.post('/api/register', async (req, res) => {
    const { name, emp_number, email } = req.body;

    try {
        const emp_id = await generateEmpId();
        const pin = await generateUniquePin();

        // Insert into Database
        await pool.query(
            `INSERT INTO employees (emp_id, name, emp_number, email, pin) VALUES ($1, $2, $3, $4, $5)`,
            [emp_id, name, emp_number, email, pin]
        );

        // Send Email
        const mailOptions = {
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name},\n\nYour registration is successful!\n\nEmployee ID: ${emp_id}\nPIN: ${pin}\n\nThank you.`,
        };

        await transporter.sendMail(mailOptions);

        if (req.headers['content-type'] === 'application/json') {
            res.status(201).json({
                message: 'Registration successful',
                emp_id: emp_id,
                pin: pin,
            });
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Error during registration' });
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
        const result = await pool.query('SELECT * FROM employees WHERE emp_id = $1 AND pin = $2', [emp_id, pin]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = jwt.sign({ emp_id: user.emp_id, name: user.name }, secretKey, { expiresIn: '1h' });

            res.status(200).json({
                message: 'Login successful',
                token: token,
                emp_id: user.emp_id,
                name: user.name,
            });
        } else {
            res.status(401).json({ error: 'Invalid Employee ID or PIN' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Error during login' });
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
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ error: 'Error during logout' });
        }
        if (req.headers['content-type'] === 'application/json') {
            res.status(200).json({ message: 'Logout successful' });
        } else {
            res.redirect('/login');
        }
    });
});







app.post('/api/campaign',verifyToken, async (req, res) => {
    const {
        name,
        mobile_number,
        budget,
        screen_count,
        screen_type,
        total_days,
        campaign_remark,
        // employee_id,
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
            message: 'Campaign created successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign' });  
    }
});


// PUT: Edit a Campaign by ID
app.post('/api/campaign/edit',verifyToken, async (req, res) => {
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
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.status(200).json({
            message: 'Campaign updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
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

app.post('/api/campaign/quotation', verifyToken, async (req, res) => {
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
        return res.status(400).json({ error: 'Campaign ID is required' });
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
            return res.status(404).json({ error: 'Campaign not found or invalid ID' });
        }

        res.status(200).json({
            message: 'Quotation details submitted successfully for approval',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error submitting quotation:', error);
        res.status(500).json({ error: 'Failed to submit quotation' });
    }
});




app.post('/api/campaign/quotation/edit', verifyToken, async (req, res) => {
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
        return res.status(400).json({ error: 'Campaign ID is required' });
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
            return res.status(404).json({ error: 'Campaign not found or invalid ID' });
        }

        res.status(200).json({
            message: 'Campaign quotation updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating campaign quotation:', error);
        res.status(500).json({ error: 'Failed to update campaign quotation' });
    }
});




// Start Server                                                                       
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



