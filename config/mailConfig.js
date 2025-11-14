const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
         user: 'aekads.otp@gmail.com',
          pass: "cyns hdye yfwg bezn",
    },
});

module.exports = transporter;
