const db = require('../db');

exports.register = (req, res) => {
  const { email, password } = req.body;
  db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (err) => {
    if (err) return res.status(500).send('User already exists');
    res.send('Registered');
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (results.length > 0) {
      req.session.user = results[0];
      res.send('Logged in');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.send('Logged out');
};
