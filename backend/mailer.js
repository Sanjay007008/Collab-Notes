const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendInvite(email, noteId) {
  const link = `http://localhost:3000/notes/accept/${noteId}?email=${email}`;
  const options = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Note Share Invitation',
    html: `<p>You have been invited to view a note. <a href="${link}">Click here to accept</a></p>`
  };
  transporter.sendMail(options, (err, info) => {
    if (err) console.error(err);
    else console.log('Email sent: ' + info.response);
  });
}

module.exports = { sendInvite };
