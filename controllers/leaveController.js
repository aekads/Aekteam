const leaveModel = require("../models/leaveModel");
const employeeModel = require('../models/employeeModel');
// ✅ Apply for Leave
exports.applyLeave = async (req, res) => {
    try {
        const emp_id = req.user.emp_id; // Get from token
        const { start_date, end_date, leave_type, half_day, reason, cc } = req.body;

        const leave = await leaveModel.applyLeave({
            emp_id,
            start_date,
            end_date,
            leave_type,
            half_day,
            reason,
            cc // Pass CC recipients to the model
        });

        // Send notification emails to CC recipients
        // if (cc && cc.length > 0) {
        //     await sendCCNotificationEmails(cc, leave);
        // }

        res.json({ success: true, message: "Leave applied successfully", leave });
    } catch (error) {
        console.error("Error applying leave:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.cancelLeave = async (req, res) => {
    try {
        console.log("Received cancel leave request:", req.body); // Debug log

        const { leaveId } = req.body;
        if (!leaveId) {
            return res.status(400).json({ success: false, message: "Leave ID is required" });
        }

        // Check if leave exists and is still pending
        const leave = await leaveModel.findLeaveById(leaveId);
        if (!leave) {
            return res.status(400).json({ success: false, message: "Leave not found or already processed" });
        }

        // Cancel leave (update status)
        const isCanceled = await leaveModel.cancelLeaveById(leaveId);
        if (!isCanceled) {
            return res.status(400).json({ success: false, message: "Failed to cancel leave" });
        }

        return res.json({ success: true, message: "Leave request canceled successfully" });

    } catch (error) {
        console.error("Error canceling leave:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ✅ Get Leaves with Filters
exports.getLeaves = async (req, res) => {
    try {
        const filters = {
            emp_id: req.user.role !== "HR" ? req.user.emp_id : null, // Employees can only see their own leaves
            status: req.query.status,
            date: req.query.date,
        };

        const leaves = await leaveModel.getLeaves(filters);
        res.json({ success: true, leaves });
    } catch (error) {
        console.error("Error fetching leaves:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ✅ HR Updates Leave Status
// exports.updateLeaveStatus = async (req, res) => {
//     try {
       

//         const { leave_id, status } = req.body;
//         const updatedLeave = await leaveModel.updateLeaveStatus(leave_id, status, req.user.emp_id);

//         res.json({ success: true, message: "Leave status updated", updatedLeave });
//     } catch (error) {
//         console.error("Error updating leave status:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { leave_id, status } = req.body;
        await leaveModel.updateLeaveStatus(leave_id, status, req.user.emp_id);

        req.flash("success", `Leave request has been ${status.toLowerCase()} successfully!`);
    } catch (error) {
        console.error("Error updating leave status:", error);
        req.flash("error", "Something went wrong while updating leave status.");
    }
    res.redirect("/dashboard/hr/approval"); // Redirect back
};

//for Hr
exports.renderApprovalPage = async (req, res) => {
    try {
           const emp_id = req.user.emp_id;
            const employee = await employeeModel.findEmployee(emp_id);

            
        const leaveApplications = await leaveModel.getPendingLeaves();
        res.render('leave-approval', { leaveApplications ,employee});
    } catch (error) {
        console.error('Error fetching leave applications:', error);
        res.status(500).send('Server Error');
    }
};




exports.renderLeavePage = async (req, res) => {
    try {
        const emp_id = req.user?.emp_id;
        const employee = await employeeModel.findEmployee(emp_id);
      
        // if (!emp_id) {
        //     return res.redirect('/login'); // Redirect if not logged in
        // }
        const employeeData = await leaveModel.getEmployeeLeaveData(emp_id);
        res.render('employee/leave', {employee, emp_id,employeeData  });
    } catch (error) {
        console.error("Error rendering attendance page:", error);
        res.status(500).send("Server Error");
    }
};


//for cc in list show
exports.getEmployeeList = async (req, res) => {
    try {
        const employees = await employeeModel.getEmployees();
        res.json({ success: true, employees });
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};





