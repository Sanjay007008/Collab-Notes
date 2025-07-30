const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();


const cron = require('node-cron');

cron.schedule('* * * * *', () => {
  const now = new Date();
  const query = `
    DELETE FROM shared_notes
    WHERE accepted = 1
      AND expiry IS NOT NULL
      AND expiry < ?
  `;

  db.query(query, [now], (err, result) => {
    if (err) {
      console.error('[Cron] Failed to delete expired shares:', err);
    } else if (result.affectedRows > 0) {
      console.log(`[Cron] Deleted ${result.affectedRows} expired shared notes.`);
    }
  });
});


const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');

const app = express();



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});


app.use('/', require('./routes/notes'));


app.use(express.static('public'));

app.use('/auth', authRoutes);
app.use('/notes', noteRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
