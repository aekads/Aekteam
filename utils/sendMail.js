const transporter = require("../config/mailConfig");

exports.sendLeaveAppliedMail = async (employee, leave) => {
    const HR_EMAIL = "hp9537213@gmail.com";  // <-- FIXED HR EMAIL

    const mailOptions = {
        from: `"Leave Portal" <yourcompanyemail@gmail.com>`,
        to: HR_EMAIL,
        subject: `New Leave Request - ${employee.name}`,
        html: `
            <h3>New Leave Request</h3>
            <p><strong>Employee:</strong> ${employee.name} (${employee.emp_id})</p>
            <p><strong>Leave Type:</strong> ${leave.leave_type}</p>
            <p><strong>Start Date:</strong> ${leave.start_date}</p>
            <p><strong>End Date:</strong> ${leave.end_date}</p>
            <p><strong>Reason:</strong> ${leave.reason}</p>
            <br/>
            <p>Please login to HR Dashboard for approval.</p>
        `,
    };

    await transporter.sendMail(mailOptions);
};
