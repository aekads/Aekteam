const jwt = require('jsonwebtoken');

// exports.verifyToken = (req, res, next) => {
//     // console.log("Headers: ", req.headers); // ✅ Debugging step
//     // console.log("Cookies: ", req.cookies); // ✅ Debugging step

//     const token = req.cookies?.token; // ✅ Read token correctly from cookies

//     if (!token) {
//         console.log("❌ No token found in cookies");
//         return res.status(401).json({ message: "Unauthorized - Token missing" });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.user = decoded;
//         // console.log("✅ Token verified:", decoded);
//         next();
//     } catch (err) {
//         console.log("❌ Invalid token:", err.message);
//         return res.status(403).json({ message: "Forbidden - Invalid token" });
//     }
// };


// exports.requireHR = (req, res, next) => {
//     if (!req.user || req.user.role.toLowerCase() !== 'hr') {
//         return res.status(403).json({ message: "Access denied" });
//     }
//     next();
// };

exports.verifyToken = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        console.log("❌ No token found in cookies");
        return res.render("error", { message: "Unauthorized - Token missing" });
    }

    try {
        const decoded = jwt.verify(token,  'your-secret-key-here',);
        req.user = decoded;
        next();
    } catch (err) {
        console.log("❌ Invalid token:", err.message);
        return res.render("error", { message: "Forbidden - Invalid token" });
    }
};

exports.requireHR = (req, res, next) => {
    if (!req.user || req.user.role.toLowerCase() !== 'hr') {
        return res.render("error", { message: "Access Denied" });
    }
    next();
};



const allowedEmpIds = ["emp_32", "emp_33", "emp_43"];

// ✅ Special Middleware for Restricted Access (Only Specific Employees)
exports.restrictToAllowedEmployees = (req, res, next) => {
    if (!allowedEmpIds.includes(req.user.emp_id)) {
        console.log(`❌ Access denied for emp_id: ${req.user.emp_id}`);
        return res.render("error", { message: "Forbidden - You do not have permission to access this page" });
    }
    next();
};



// const multer = require('multer');
// const path = require('path');

// // Set storage engine
// exports.storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/'); // Save files in the "uploads" directory
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + '-' + file.originalname); // Unique filename
//     }
// });

// // File filter (optional)
// exports.fileFilter = (req, file, cb) => {
//     const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
//     if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error('Invalid file type'), false);
//     }
// };

// // Upload middleware
// exports.upload = multer({
//     storage: exports.storage, // Use the exported storage
//     fileFilter: exports.fileFilter, // Use the exported fileFilter
//     limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB per file
// });
