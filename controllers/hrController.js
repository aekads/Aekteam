const employeeModel = require('../models/employeeModel');
// const { addEmployee } = require('../models/employeeModel');
const { addEmployee, getEmployees  } = require('../models/employeeModel');
const { pool } = require('pg');
const ExcelJS = require("exceljs");
const leaveModel = require("../models/leaveModel");




// exports.getHrDashboard = async (req, res) => {
//     const emp_id = req.user.emp_id;
//     const employee = await employeeModel.findEmployee(emp_id);
//       // ✅ Fetch total employee count
//       const totalEmployees = await employeeModel.employeeCount()
    

//     res.render('hrDashboard', { user: req.user ,employee, totalEmployees }); 
// };                                                  

exports.getHrDashboard = async (req, res) => {
    try {
        const emp_id = req.user.emp_id;
        const employee = await employeeModel.findEmployee(emp_id);
        const totalEmployees = await employeeModel.employeeCount();

        const today = new Date().toISOString().split("T")[0]; // Get today's date  

        const leaveData = await employeeModel.getLeaveStats(today);
        const { present, absent } = await employeeModel.getAttendanceStats(today); // ✅ Fix: Correctly extract values

        console.log("Leave Data:", leaveData);                                  
         console.log("Fixed Attendance Data:", { present, absent }); // ✅ Now logs { present: X, absent: Y }

        res.render('hrDashboard', {
            user: req.user,
            employee,
            totalEmployees,
            leaveData,
            attendanceData: { present, absent } // ✅ Ensure correct format
        });

    } catch (error) {
        console.error("Error fetching HR dashboard data:", error);
        res.status(500).send("Internal Server Error");
    }
};                                                                              




//employee add render page for HR

exports.getAddEmployeePage = async (req, res) => {
    const emp_id = req.user.emp_id;
    const employee = await employeeModel.findEmployee(emp_id);
    res.render('addEmployee', {employee});
};

//creat Emp HR roll
exports.postAddEmployee = async (req, res) => {
    try {
        console.log("Received Form Data:", req.body);
        console.log("Received Files:", req.files);

        const employeeData = {
            full_name: req.body.full_name,  
            phone: req.body.phone,
            designation: req.body.designation,
            role: req.body.role,
            joining_date: req.body.joining_date,
            resign_date: req.body.resign_date,
            dob: req.body.dob,
            alt_phone: req.body.alt_phone,
            city: req.body.city,
            ctc: req.body.ctc,
            bank_number: req.body.bank_number,
            ifsc: req.body.ifsc,
            passbook_image: req.files?.passbook_image?.[0]?.path || null,
            pan_card: req.files?.pan_card?.[0]?.path || null,
            aadhar_card: req.files?.aadhar_card?.[0]?.path || null,
            last_company_name: req.body.last_company_name,
            offer_letter: req.files?.offer_letter?.[0]?.path || null,
            photo: req.files?.photo?.[0]?.path || null,
            last_company_experience_letter: req.files?.last_company_experience_letter?.[0]?.path || null
        };

        // Ensure required fields exist
        if (!employeeData.full_name || !employeeData.phone) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Insert employee into DB
        const newEmployee = await addEmployee(employeeData);
        res.json({ success: true, message: "Employee Add successfully!", employee: newEmployee });

    } catch (error) {
        console.error("Error adding employee:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};





exports.getEditEmployeePage = async (req, res) => {
    try {
        const emp_id = req.params.emp_id;
        const employee = await employeeModel.getEmployeeById(emp_id);

        if (!employee) {
            return res.status(404).send("Employee not found.");
        }

        res.render("editEmployee", { employee });
    } catch (error) {
        console.error("Error fetching employee data:", error);
        res.status(500).send("Internal Server Error");
    }
};
exports.postUpdateEmployee = async (req, res) => {
    try {
        console.log("Received Update Data:", req.body);
        console.log("Received Files:", req.files);

        const emp_id = req.params.emp_id;

        if (!emp_id) {
            return res.status(400).json({ success: false, error: "Employee ID is required." });
        }

        const updatedData = {};

        // Only add fields that have values (ignore undefined)
        if (req.body.name) updatedData.name = req.body.name;
        if (req.body.emp_number) updatedData.emp_number = req.body.emp_number;
        if (req.body.email) updatedData.email = req.body.email;
        if (req.body.pin) updatedData.pin = req.body.pin;
        if (req.body.role) updatedData.role = req.body.role;
        if (req.body.token) updatedData.token = req.body.token;
        if (req.body.status) updatedData.status = req.body.status;
        if (req.body.assign_city) updatedData.assign_city = req.body.assign_city;
        if (req.body.isdeleted) updatedData.isdeleted = req.body.isdeleted;
        if (req.body.designation) updatedData.designation = req.body.designation;
        if (req.body.joining_date) updatedData.joining_date = req.body.joining_date || null;
        if (req.body.resign_date) updatedData.resign_date = req.body.resign_date || null;
        if (req.body.dob) updatedData.dob = req.body.dob || null;
        if (req.body.alt_phone) updatedData.alt_phone = req.body.alt_phone;
        if (req.body.ctc) updatedData.ctc = req.body.ctc;
        if (req.body.bank_number) updatedData.bank_number = req.body.bank_number;
        if (req.body.ifsc) updatedData.ifsc = req.body.ifsc;

        // Only update files if new files are uploaded
        if (req.files?.passbook_image) updatedData.passbook_image = req.files.passbook_image[0].path;
        if (req.files?.pan_card) updatedData.pan_card = req.files.pan_card[0].path;
        if (req.files?.aadhar_card) updatedData.aadhar_card = req.files.aadhar_card[0].path;
        if (req.files?.offer_letter) updatedData.offer_letter = req.files.offer_letter[0].path;
        if (req.files?.photo) updatedData.photo = req.files.photo[0].path;
        if (req.files?.last_company_experience_letter) updatedData.last_company_experience_letter = req.files.last_company_experience_letter[0].path;

        if (req.body.last_company_name) updatedData.last_company_name = req.body.last_company_name;
        if (req.body.leave_balance) updatedData.leave_balance = req.body.leave_balance || 0;
        if (req.body.total_accrued_leave) updatedData.total_accrued_leave = req.body.total_accrued_leave || 0;
        if (req.body.leave_taken) updatedData.leave_taken = req.body.leave_taken || 0;

        // Ensure there is at least one field to update
        if (Object.keys(updatedData).length === 0) {
            return res.status(400).json({ success: false, error: "No data provided to update." });
        }

        // Update Employee in DB
        const updatedEmployee = await employeeModel.updateEmployee(emp_id, updatedData);

        if (!updatedEmployee) {
            return res.status(404).json({ success: false, message: "Employee not found or update failed." });
        }

        res.json({ success: true, message: "Employee updated successfully!", employee: updatedEmployee });

    } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};




//emp List For Hr
exports.renderEmployeeList = async (req, res) => {
    try {
        const emp_id = req.user.emp_id;
         const employee = await employeeModel.findEmployee(emp_id);
        
        const employees = await getEmployees();
        res.render('Employeeslist', { employees, employee });
    } catch (error) {
        console.error("Error fetching employee list:", error);
        res.status(500).send("Error loading employee list.");
    }
};
//render emp profile 
// Get Employee Details for HR Profile View
exports.renderEmployeeProfile = async (req, res) => {
    try {
        const { emp_id } = req.params; // Get employee ID from URL
        const employee = await employeeModel.findEmployee(emp_id); // Fetch employee details

        if (!employee) {
            return res.status(404).send("Employee not found");
        }

        res.render("employeeProfile", { employee }); // Pass data to EJS
    } catch (error) {
        console.error("Error fetching employee profile:", error);
        res.status(500).send("Error loading employee profile.");
    }
};



// for HR roll
exports.attendanceReport = async (req, res) => {
    try {
        const { emp_id, start_date, end_date } = req.query;

        // ✅ Fetch all employees
        const employees = await employeeModel.findEmployees();
 // ✅ Fetch logged-in employee details (Ensuring 'employee' is always passed)
 const employee = await employeeModel.findEmployee(req.user.emp_id);



        // ✅ Default dates: Current month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

        const startDate = start_date || firstDay;
        const endDate = end_date || lastDay;

        // ✅ Fetch attendance data
        const attendanceData = await employeeModel.getAttendanceReport({ emp_id, start_date: startDate, end_date: endDate });

        res.render("attendanceReport", {
            employees,
            attendanceData,
            employee,
            filters: { emp_id, start_date: startDate, end_date: endDate   }
        });
    } catch (error) {
        console.error("Error fetching attendance report:", error);
        res.status(500).send("Internal Server Error");
    }
};


//excel data export attendece
//excel data export attendece
exports.exportAttendanceReport = async (req, res) => {
    try {
        const { emp_id, start_date, end_date } = req.query;

        // ✅ Fetch attendance data based on filters
        const attendanceData = await employeeModel.getAttendanceReport({ emp_id, start_date, end_date });

        // ✅ Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Attendance Report");

        // ✅ Define Columns
        worksheet.columns = [
            { header: "Employee ID", key: "emp_id", width: 15 },
            { header: "Employee Name", key: "name", width: 20 },
            { header: "Date", key: "date", width: 15 },
            { header: "Punch In", key: "punch_in_time", width: 15 },
            { header: "Punch Out", key: "punch_out_time", width: 15 },
            { header: "Status", key: "status", width: 15 },
        ];

        // ✅ Add Data to Worksheet
        attendanceData.forEach(record => {
            worksheet.addRow({
                emp_id: record.emp_id,
                name: record.name,
                date: new Date(record.date).toLocaleDateString("en-US"),
                punch_in_time: record.punch_in_time
                    ? new Date(record.punch_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "-",
                punch_out_time: record.punch_out_time
                    ? new Date(record.punch_out_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "-",
                status: record.status,
            });
        });

        // ✅ Set Response Headers
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=Attendance_Report.xlsx`);

        // ✅ Write to Response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error exporting attendance report:", error);
        res.status(500).send("Error generating Excel file");
    }
};
//for Hr can see Leave list
exports.leaveHistory = async (req, res) => {
    try {
        const { emp_id, start_date, end_date } = req.query;
// ✅ Fetch all employees
const employee = await employeeModel.findEmployee(req.user.emp_id);

        // ✅ Fetch all employees (For HR dropdown selection)
        const employees = await employeeModel.findEmployees();
 
        // ✅ Default dates: Current month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

        const startDate = start_date || firstDay;
        const endDate = end_date || lastDay;

        let leaveData = [];

        // ✅ Fetch leave history only if an employee is selected
        if (emp_id) {
            leaveData = await leaveModel.getLeaveHistory({ emp_id, start_date: startDate, end_date: endDate });
        }

        res.render("leaveHistory", {
            employee,
            employees, // Employee dropdown
            leaveData, // Leave records
            filters: { emp_id, start_date: startDate, end_date: endDate }
        });

    } catch (error) {
        console.error("Error fetching leave history:", error);
        res.status(500).send("Internal Server Error");
    }
};



// ✅ Get all pending permissions
exports.getPendingPermissions = async (req, res) => {
    try {
           // ✅ Fetch logged-in employee details using `findEmployee`
           const employee = await employeeModel.findEmployee(req.user.emp_id);

        const pendingPermissions = await employeeModel.getPendingPermissions();

        res.render("approvePermission", { pendingPermissions,employee });
    } catch (error) {
        console.error("Error fetching pending permissions:", error);
        res.status(500).send("Internal Server Error");
    }
};

// ✅ Approve a permission request & update attendance
const moment = require("moment"); // Ensure you install moment.js using `npm install moment`

exports.approvePermission = async (req, res) => {
    try {
        const permissionId = req.params.id;
        const permission = await employeeModel.getPermissionById(permissionId);

        if (!permission) {
            return res.status(404).json({ message: "Permission not found" });
        }

        console.log("Fetched Permission Data:", permission); // Debugging step

        // Extract date from `from_time`
        const attendanceDate = moment(permission.from_time).format("YYYY-MM-DD");

        if (!attendanceDate) {
            console.error("⚠️ Missing date in permission request.");
            return res.status(400).json({ message: "Invalid permission data: missing date." });
        }

        // Approve the permission request
        await employeeModel.updatePermissionStatus(permissionId, "Approved");

        // Check if it's a "Regularization" request and update attendance accordingly
        if (permission.type.toLowerCase() === "regularization") {
            console.log("Updating attendance for:", permission.emp_id, "on", attendanceDate);

            await employeeModel.updatePunchInOut(
                permission.emp_id,
                attendanceDate, // Ensure we pass the extracted date
                permission.from_time,
                permission.to_time
            );
        } else {
            console.warn("⚠️ Permission type is not 'Regularization'.");
        }

        res.redirect("/dashboard/hr/approvePermission");
    } catch (error) {
        console.error("Approval error:", error);
        res.status(500).json({ message: "Server error" });
    }
};



                                                                                

// ✅ Reject a permission request
exports.rejectPermission = async (req, res) => {
    try {
        const permissionId = req.params.id;
        const permission = await employeeModel.getPermissionById(permissionId);

        if (!permission) {
            return res.status(404).json({ message: "Permission not found" });
        }

        // ✅ Reject the permission
        await employeeModel.updatePermissionStatus(permissionId, "Rejected");

        res.redirect("/dashboard/hr/approvePermission"); // Redirect HR back to the approval page
    } catch (error) {
        console.error("Rejection error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
