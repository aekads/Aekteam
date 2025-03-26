const employeeModel = require('../models/employeeModel');

const moment = require('moment-timezone'); 
exports.getEmployeeHome = async (req, res) => {
    try {
        const emp_id = req.user.emp_id; // Extracted from JWT
        const employee = await employeeModel.findEmployee(emp_id);

        if (!employee) {
            return res.status(404).send("Employee not found");
        }

        // ✅ Get Current Hour
        const currentHour = new Date().getHours();
        let greeting = "Good Morning";

        if (currentHour >= 12 && currentHour < 14) {
            greeting = "Good Noon";
        } else if (currentHour >= 14 && currentHour < 17) {
            greeting = "Good Afternoon";
        } else if (currentHour >= 17 && currentHour < 20) {
            greeting = "Good Evening";
        } else if (currentHour >= 20 || currentHour < 5) {
            greeting = "Good Night";
        }

        // ✅ Motivational Quotes
        const quotes = [
            "The great thing in this world is not so much where you stand, as in what direction you are moving. - Oliver Wendell Holmes",
            "Success is not the key to happiness. Happiness is the key to success. - Albert Schweitzer",
            "Believe you can and you're halfway there. - Theodore Roosevelt",
            "Do what you can, with what you have, where you are. - Theodore Roosevelt"
        ];

        // ✅ Randomly Select a Quote
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        res.render('employee/home', { employee, greeting, randomQuote });
    } catch (error) {
        console.error("Error fetching employee details:", error);
        res.status(500).send("Internal Server Error");
    }
};

                                                                                 

// exports.getProfile = async (req, res) => {
//     try {
//         const emp_id = req.user.emp_id; // Get employee ID from the logged-in user
//         const employee = await employeeModel.findEmployee(emp_id);

//         if (!employee) {
//             return res.status(404).render('error', { message: "Employee not found" });
//         }

//         res.render('employee/profile', { employee });
//     } catch (error) {
//         console.error("Error fetching profile:", error);
//         res.status(500).render('error', { message: "Internal Server Error" });
//     }
// };


exports.getProfile = async (req, res) => {
    try {
        const emp_id = req.user.emp_id; // Logged-in employee ID
        const employee = await employeeModel.findEmployee(emp_id);

        if (!employee) {
            return res.status(404).render('error', { message: "Employee not found" });
        }

        res.render('employee/profile', { employee, editable: true }); // Allow only self-edit
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).render('error', { message: "Internal Server Error" });
    }
};

// ✅ Handle Profile Update
exports.updateProfile = async (req, res) => {
    try {
        const emp_id = req.user.emp_id; // Ensure the logged-in employee is updating their own profile
        const { name, email, phone, dob, assign_city, designation, bank_number, ifsc } = req.body;

        await employeeModel.updateEmployee(emp_id, {
            name,
            email,
            phone,
            dob,
            assign_city,
            designation,
            bank_number,
            ifsc
        });

        res.redirect("/dashboard/employee/profile?success=true");
    } catch (error) {
        console.error("Profile update error:", error);
        res.redirect(`/dashboard/employee/profile?error=${encodeURIComponent(error.message)}`);
    }
};


// Punch In
// Punch In
// Punch In
exports.punchIn = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        if (!emp_id) {
            return res.status(400).json({ message: "Employee ID missing" });
        }
     
        // ✅ Get current date & time in IST (formatted without milliseconds)
        const date = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
        const time = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'); // ✅ No milliseconds

        // Check if already punched in
        const existingPunch = await employeeModel.getTodayPunch(emp_id, date);
        // if (existingPunch.length > 0) {
        //     return res.status(400).json({ message: "Already punched in today" });
        // }


        const permission = await employeeModel.getActivePermission(emp_id, date);
        if (permission.length > 0) {
            return res.status(400).json({ message: "Active permission exists. Punch-in not required." });
        }


        // Punch in
        await employeeModel.punchIn(emp_id, date, time);
        res.status(200).json({ message: "Punched in successfully" });
    } catch (error) {
        console.error("Punch-in error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.punchOut = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        if (!emp_id) {
            return res.status(400).json({ message: "Employee ID missing" });
        }

        const date = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
        const time = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'); // ✅ No milliseconds

        // Check if already punched out
        const activePunch = await employeeModel.getActivePunch(emp_id, date);
        if (activePunch.length === 0) {
            return res.status(400).json({ message: "No active punch-in found" });
        }

        // Punch out
        await employeeModel.punchOut(emp_id, date, time);
        res.status(200).json({ message: "Punched out successfully" });
    } catch (error) {
        console.error("Punch-out error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

                                                                                            

exports.renderRegularizationPage = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        const employee = await employeeModel.findEmployee(emp_id);
        const pendingRequests = await employeeModel.getPendingEmp(emp_id);
        const historyRequests = await employeeModel.getHistoryPermissions(emp_id);

        res.render('employee/Regularization', {
            employee,
            emp_id,
            pendingRequests, 
            historyRequests 
        });
    } catch (error) {
        console.error("Error rendering attendance page:", error);
        res.status(500).send("Server Error");
    }
};


exports.applyPermission = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        const { type, from_time, to_time, reason } = req.body;

        if (!emp_id) {
            return res.redirect("/dashboard/employee/apply-permission?error=Employee ID missing");
        }

        await employeeModel.applyPermission(emp_id, type, from_time, to_time, reason);

        // Redirect with success message
        res.redirect("/dashboard/employee/RegularizationPage?success=true");
    } catch (error) {
        console.error("Permission request error:", error);
        res.redirect(`/dashboard/employee/RegularizationPage?error=${encodeURIComponent(error.message)}`);
    }
};


exports.getPunchStatus = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        if (!emp_id) {
            return res.status(400).json({ message: "Employee ID missing" });
        }

        const date = new Date().toISOString().split("T")[0];
        const activePunch = await employeeModel.getActivePunch(emp_id, date);

        res.json({ punchedIn: activePunch.length > 0 });
    } catch (error) {
        console.error("Punch status error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.renderAttendancePage = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        const employee = await employeeModel.findEmployee(emp_id);

        // if (!emp_id) {
        //     return res.redirect('/login'); // Redirect if not logged in
        // }

        res.render('employee/attendance', {employee, emp_id });
    } catch (error) {
        console.error("Error rendering attendance page:", error);
        res.status(500).send("Server Error");
    }
};
exports.getAttendanceByDate = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        const date = req.query.date; // Get selected date

        if (!emp_id) {
            return res.status(400).json({ message: "Employee ID missing" });
        }

        const attendanceEntries = await employeeModel.getAttendance(emp_id, date);

        if (!attendanceEntries || attendanceEntries.length === 0) {
            return res.json({ punch_in: "Not Available", punch_out: "Not Available", working_hours: "Not Available" });
        }

        let totalWorkingMinutes = 0;
        let firstPunchIn = null;
        let lastPunchOut = null;

        for (let i = 0; i < attendanceEntries.length; i++) {
            const entry = attendanceEntries[i];

            if (!firstPunchIn) firstPunchIn = entry.punch_in_time;
            lastPunchOut = entry.punch_out_time || lastPunchOut;

            if (entry.punch_in_time && entry.punch_out_time) {
                const punchInTime = moment(entry.punch_in_time);
                const punchOutTime = moment(entry.punch_out_time);
                totalWorkingMinutes += punchOutTime.diff(punchInTime, 'minutes');
            }
        }

        const workingHours = totalWorkingMinutes > 0 ? `${Math.floor(totalWorkingMinutes / 60)}h ${totalWorkingMinutes % 60}m` : "Not Available";

        res.json({
            punch_in: firstPunchIn ? moment(firstPunchIn).format('YYYY-MM-DD HH:mm:ss') : "Not Available",
            punch_out: lastPunchOut ? moment(lastPunchOut).format('YYYY-MM-DD HH:mm:ss') : "Not Available",
            working_hours: workingHours
        });

    } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ message: "Server error" });
    }
};

