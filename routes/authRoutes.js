const express = require('express');
const pool = require('../config/database');
const transporter = require('../config/email');
const { verifyToken } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';

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
            `INSERT INTO employees (emp_id, name, emp_number, email, pin, role, Assign_city) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [emp_id, name, emp_number, email, pin, role, Assign_city]
        );

        await client.query('COMMIT'); // Commit transaction

        // Send email and respond
        const mailOptions = {
            from: 'your_email@gmail.com',
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name},\n\nYour registration is successful!\n\nEmployee ID: ${emp_id}\nPIN: ${pin}\nRole: ${role}\n\nThank you.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: 'Registration successful', emp_id, pin, role,  Assign_city });
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on failure
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Error during registration' });
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
                // assign_city: user.assign_city,
                // login_time: loginTime, // Include login time in response
                city: user.assign_city
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

module.exports = router;


