const express = require('express');
const pool = require('../config/database');
const transporter = require('../config/email');
const { verifyToken } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';

const router = express.Router();

// Helper functions
async function generateEmpId() {
    const result = await pool.query('SELECT COUNT(*) FROM employees');
    const count = parseInt(result.rows[0].count) + 1;
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

// Routes
router.post('/register', async (req, res) => {
    const { name, emp_number, email, role } = req.body;

    try {
        const emp_id = await generateEmpId();
        const pin = await generateUniquePin();

        await pool.query(
            'INSERT INTO employees (emp_id, name, emp_number, email, pin, role) VALUES ($1, $2, $3, $4, $5, $6)',
            [emp_id, name, emp_number, email, pin, role]
        );

        const mailOptions = {
            from: 'hp9537213@gmail.com',
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name},\n\nYour registration is successful!\n\nEmployee ID: ${emp_id}\nPIN: ${pin}\nRole: ${role}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: 'Registration successful', emp_id, pin, role });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Error during registration' });
    }
});

router.post('/login', async (req, res) => {
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
                { expiresIn: '365d' }
            );

            await pool.query(
                'UPDATE employees SET token = $1, status = $2 WHERE emp_id = $3',
                [token, 1, emp_id]
            );

            res.status(200).json({ status: true, message: 'Login successful', token, emp_id: user.emp_id, name: user.name, role: user.role });
        } else {
            res.status(401).json({ status: false, message: 'Invalid Employee ID or PIN' });
        }
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ status: false, message: 'Error during login' });
    }
});

router.post('/logout', async (req, res) => {
    const { emp_id } = req.body;

    if (!emp_id) {
        return res.status(400).json({ message: 'Employee ID is required for logout' });
    }

    try {
        const result = await pool.query(
            'UPDATE employees SET token = NULL, status = $1 WHERE emp_id = $2 AND status = $3',
            [0, emp_id, 1]
        );

        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Logout successful' });
        } else {
            res.status(400).json({ message: 'User is already logged out' });
        }
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
});

module.exports = router;
