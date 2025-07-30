const db = require('../db');
const { sendInvite } = require('../mailer');

exports.createNote = (req, res) => {
  const { title, content } = req.body;
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).send('Login required');

  db.query(
    'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
    [userId, title, content],
    (err) => {
      if (err) return res.status(500).send('Error creating note');
      res.send('Note created');
    }
  );
};

exports.getNotes = (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).send('Login required');

  const query = `
    SELECT n.*, s.receiver_email, s.expiry
    FROM notes n
    LEFT JOIN shared_notes s ON n.id = s.note_id
    WHERE n.user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).send('Error fetching notes');

    const groupedNotes = {};
    results.forEach(row => {
      if (!groupedNotes[row.id]) {
        groupedNotes[row.id] = {
          id: row.id,
          title: row.title,
          content: row.content,
          expiryList: [],
        };
      }
      if (row.receiver_email && row.expiry) {
        const daysLeft = Math.ceil((new Date(row.expiry) - Date.now()) / (1000 * 60 * 60 * 24));
        groupedNotes[row.id].expiryList.push({ email: row.receiver_email, daysLeft });
      }
    });

    res.json(Object.values(groupedNotes));
  });
};


exports.shareNote = (req, res) => {
  const senderId = req.session.user?.id;
  const { noteId, email, expiryDays } = req.body;
  if (!senderId) return res.status(401).send('Login required');

  // First: check if email is registered
  db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
  if (err) return res.status(500).send('Error checking user');
  if (results.length === 0) return res.status(400).send('❌ Cannot share — user not registered');

  const receiverId = results[0].id;
  const expiry = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;

  db.query(
    `INSERT INTO shared_notes (note_id, sender_id, receiver_email, receiver_id, expiry)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE expiry = VALUES(expiry), receiver_id = VALUES(receiver_id)`,
    [noteId, senderId, email, receiverId, expiry],
    (err) => {
      if (err) return res.status(500).send('Error sharing');
      sendInvite(email, noteId);
      res.send('✅ Note shared with registered user');
    }
  );
});

};

exports.acceptInvite = (req, res) => {
  const { noteId } = req.params;
  const { email } = req.query;

  db.query(
    'UPDATE shared_notes SET accepted = 1 WHERE note_id = ? AND receiver_email = ?',
    [noteId, email],
    (err) => {
      if (err) return res.status(500).send('Error accepting invite');
      res.send('Note accepted. You can now view it.');
    }
  );
};

exports.getSharedNotes = (req, res) => {
  const userEmail = req.session.user?.email;
  if (!userEmail) return res.status(401).send('Login required');

  // Step 1: Delete expired access
  db.query(
    'DELETE FROM shared_notes WHERE receiver_email = ? AND expiry IS NOT NULL AND expiry < NOW()',
    [userEmail],
    (err) => {
      if (err) return res.status(500).send('Error cleaning expired access');

      // Step 2: Return valid shared notes
      db.query(
        `SELECT n.*, s.expiry FROM notes n
         JOIN shared_notes s ON n.id = s.note_id
         WHERE s.receiver_email = ? AND s.accepted = 1`,
        [userEmail],
        (err, results) => {
          if (err) return res.status(500).send('Error fetching shared notes');
          res.json(results);
        }
      );
    }
  );
};

exports.getNoteShares = (req, res) => {
  const noteId = req.params.noteId;

  db.query(
    'SELECT receiver_email, expiry FROM shared_notes WHERE note_id = ? AND accepted = TRUE',
    [noteId],
    (error, rows) => {
      if (error) {
        console.error('getNoteShares error:', error);
        return res.status(500).json({ message: 'Error fetching shared users' });
      }

      const shares = rows.map(row => {
        const username = row.receiver_email?.split('@')[0] || 'unknown';

        let daysLeft = null;
        if (row.expiry) {
          const expiryDate = new Date(row.expiry);
          const now = new Date();
          const diffTime = expiryDate - now;
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          username,
          expiry: row.expiry,
          daysLeft
        };
      });

      res.json(shares);
    }
  );
};
