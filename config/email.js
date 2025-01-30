const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'aekads.otp@gmail.com',
          pass: "nait yiag ebyg cxwk",
    },
});

module.exports = transporter;
