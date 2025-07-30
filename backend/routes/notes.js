const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController'); // ✅ Add this line
const db = require('../db')


const {
  createNote, getNotes, shareNote, acceptInvite, getSharedNotes,getNoteShares
} = require('../controllers/noteController');


router.get('/:noteId/shares', getNoteShares);



router.post('/create', createNote);
router.get('/my-notes', getNotes);
router.get('/shared', getSharedNotes);
router.post('/share', shareNote);
router.get('/accept/:noteId', acceptInvite);

module.exports = router;
