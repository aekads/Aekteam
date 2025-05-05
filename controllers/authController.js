
// controllers/authController.js
const employeeModel = require('../models/employeeModel');
const jwt = require('jsonwebtoken');

exports.getLoginPage = (req, res) => {
    res.render('login');
};
 
exports.postLogin = async (req, res) => {
    const { emp_id, pin } = req.body;
    try {
        const employee = await employeeModel.findEmployeeById(emp_id);
        if (!employee || employee.pin !== pin) {
            return res.render('login', { error: 'Invalid credentials' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { emp_id: employee.emp_id, role: employee.role },
            'your-secret-key-here', // Directly added JWT secret
            { expiresIn: '10d' }
        );
        

        // ✅ Set token in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
            sameSite: 'Strict'
        });

        // Redirect based on role
        const role = employee.role ? employee.role.toLowerCase() : '';
        return res.redirect(role === 'hr' ? '/dashboard/hr' : '/dashboard/employee/home');
    } catch (error) {
        console.error(error);
        res.render('login', { error: 'Something went wrong' });
    }
}; 


exports.logout = (req, res) => {
    res.clearCookie('token'); // Remove the JWT token from cookies
    res.redirect('/login'); // Redirect user to the login page
};
