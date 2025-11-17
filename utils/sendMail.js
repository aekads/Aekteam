const transporter = require("../config/mailConfig");

exports.sendLeaveAppliedMail = async (employee, leave) => {
    const HR_EMAILS = ["hr@aekads.com", "aravind@aekads.com"];

    // const HR_EMAILS = ["hp9537213@gmail.com"];

    const mailOptions = {
        from: `"AEKADS - Leave Portal" <yourcompanyemail@gmail.com>`,
        to: HR_EMAILS,
        subject: `Leave Request Submitted by ${employee.name} (${employee.emp_id})`,
        html: `
            <div style="
                font-family: Arial, sans-serif;
                background: #f4f4f4;
                padding: 20px;
            ">
                <div style="
                    max-width: 600px;
                    margin: auto;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                ">
                    <h2 style="color: #333; text-align: center; margin-top: 0;">
                        Leave Request Notification
                    </h2>

                    <p style="font-size: 14px; color: #555;">
                        A new leave request has been submitted. Below are the details:
                    </p>

                    <table style="
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    ">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee Name</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${employee.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee ID</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${employee.emp_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Type</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${leave.leave_type}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Start Date</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${leave.start_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>End Date</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${leave.end_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${leave.reason}</td>
                        </tr>
                    </table>

                    <p style="
                        font-size: 13px; 
                        color: #666; 
                        margin-top: 20px; 
                        text-align: center;
                    ">
                        Please login to the HR Dashboard to review and approve this request.
                    </p>

                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">

                    <p style="font-size: 12px; color: #999; text-align: center;">
                        This is an automated email from AEKADS Leave Portal.
                    </p>
                </div>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};
