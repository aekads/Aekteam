const employeeModel = require('../models/employeeModel');
// const { addEmployee } = require('../models/employeeModel');
const { addEmployee, getEmployees  } = require('../models/employeeModel');
// const { pool } = require('pg');
const ExcelJS = require("exceljs");
const leaveModel = require("../models/leaveModel");
const pool = require('../config/db');




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

// controller/hrController.js
exports.getEmployeesByStatus = async (req, res) => {
    try {
        const { status, date } = req.query; // status = present | absent | leave
        const today = date || new Date().toISOString().split("T")[0];

        let employees = [];

        if (status === "present") {
            employees = await employeeModel.getPresentEmployees(today);
        } else if (status === "absent") {
            employees = await employeeModel.getAbsentEmployees(today);
        } else if (status === "leave") {
            employees = await employeeModel.getLeaveEmployees(today);
        }

        res.json({ success: true, employees });
    } catch (err) {
        console.error("Error fetching employees by status:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
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
        if (!employeeData.full_name) {
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
      

        const updatedData = {};
        const fields = [
            "name", "emp_number", "email", "pin", "role", "token", "status", 
            "assign_city", "isdeleted", "designation", "joining_date", "resign_date", 
            "dob", "alt_phone", "ctc", "bank_number", "ifsc", "last_company_name", 
            "leave_balance", "total_accrued_leave", "leave_taken"
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) updatedData[field] = req.body[field] || null;
        });

        // Handle file uploads
        const fileFields = [
            "passbook_image", "pan_card", "aadhar_card", "offer_letter", 
            "photo", "last_company_experience_letter"
        ];

        fileFields.forEach(field => {
            if (req.files?.[field]?.[0]?.path) {
                updatedData[field] = req.files[field][0].path;
            }
        });

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
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};


// Delete Employee
exports.deleteEmployee = async (req, res) => {
    try {
        const emp_id = req.params.emp_id;

        // Check if employee exists
        const employee = await employeeModel.getEmployeeById(emp_id);
        if (!employee) {
            return res.status(404).send("Employee not found.");
        }

        // Perform delete
        const deleted = await employeeModel.deleteEmployee(emp_id);
        if (!deleted) {
            return res.status(500).send("Failed to delete employee.");
        }

        // Redirect back to HR employee list or dashboard
        res.redirect('/dashboard/hr/employees/list');  

    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).send("Internal Server Error");
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

        // Fetch employees list
        const employees = await employeeModel.findEmployees();
        const employee = await employeeModel.findEmployee(req.user.emp_id);

        let attendanceData = [];

        // Only fetch data if employee + dates selected
        if (emp_id && start_date && end_date) {
            attendanceData = await employeeModel.getAttendanceReport({ emp_id, start_date, end_date });
        }

        res.render("attendanceReport", {
            employees,
            attendanceData,
            employee,
            filters: { emp_id, start_date, end_date }
        });
    } catch (error) {
        console.error("Error fetching attendance report:", error);
        res.status(500).send("Internal Server Error");
    }
};

//excel data export attendece
exports.exportAttendanceReport = async (req, res) => {
    try {
        const { emp_id, start_date, end_date } = req.query;

        if (!emp_id || !start_date || !end_date) {
            return res.status(400).send("Please select employee and date range before exporting.");
        }

        const attendanceData = await employeeModel.getAttendanceReport({ emp_id, start_date, end_date });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Attendance Report");

        worksheet.columns = [
            { header: "Employee ID", key: "emp_id", width: 15 },
            { header: "Employee Name", key: "name", width: 20 },
            { header: "Date", key: "date", width: 15 },
            { header: "Punch In", key: "punch_in_time", width: 15 },
            { header: "Punch Out", key: "punch_out_time", width: 15 },
            { header: "Status", key: "status", width: 15 },
        ];

        attendanceData.forEach(record => {
            worksheet.addRow({
                emp_id: record.emp_id,
                name: record.name,
                date: new Date(record.date).toLocaleDateString("en-IN"),
                punch_in_time: record.punch_in_time
                    ? new Date(record.punch_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "-",
                punch_out_time: record.punch_out_time
                    ? new Date(record.punch_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "-",
                status: record.status,
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=Attendance_Report.xlsx");

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error exporting attendance report:", error);
        res.status(500).send("Error generating Excel file");
    }
};


// ==============================
// 🎉 FESTIVAL LEAVES MANAGEMENT
// ==============================

// Show Festival Leave List Page
exports.showFestivalLeaves = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM festival_leaves ORDER BY leave_date ASC");
    res.render("festivalLeaves", { leaves: result.rows });
  } catch (error) {
    console.error("Error loading festival leaves:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Add Festival Leave
exports.addFestivalLeave = async (req, res) => {
  try {
    const { leave_date, name } = req.body;

    if (!leave_date || !name)
      return res.status(400).send("Date and Name are required");

    await pool.query(
      "INSERT INTO festival_leaves (leave_date, name) VALUES ($1, $2)",
      [leave_date, name]
    );

    res.redirect("/dashboard/hr/festival-leaves");
  } catch (error) {
    console.error("Error adding festival leave:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Delete Festival Leave
exports.deleteFestivalLeave = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM festival_leaves WHERE id = $1", [id]);
    res.redirect("/dashboard/hr/festival-leaves");
  } catch (error) {
    console.error("Error deleting festival leave:", error);
    res.status(500).send("Internal Server Error");
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
// models/employeeModel.js


// Show Add Event Form + List
exports.showAddEvent = async (req, res) => {
  try {
    const emp_id = req.user.emp_id;
      const employee = await employeeModel.findEmployee(emp_id);
    const events = await pool.query(
      `SELECT id, title, description, date
       FROM events
       ORDER BY date DESC`
    );
    res.render('addEvent', { events: events.rows,employee });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading events');
  }
};

// Add Event
exports.addEvent = async (req, res) => {
  const { title, description, date } = req.body;
  try {
    await pool.query(
      'INSERT INTO events (title, description, date) VALUES ($1, $2, $3)',
      [title, description, date]
    );

    // After adding, redirect to same page to refresh list
    res.redirect('/dashboard/hr/events/add');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding event');
  }
};
