const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "hp9537213@gmail.com",
        pass: "bnfd oupg gnvk npzx",
    },
});

module.exports = transporter;
