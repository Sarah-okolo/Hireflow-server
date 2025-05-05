const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const check = require('../middleware/checkPermission');

// Candidates can apply (create application)
router.post('/apply', auth, check('create', 'applications'), (req, res) => {
  res.send('Application submitted');
});

// Recruiters and companies can read applications
router.get('/', auth, check('read', 'applications'), (req, res) => {
  res.send('Applications list');
});

// Recruiters can shortlist
router.post('/:id/shortlist', auth, check('shortlist', 'applications'), (req, res) => {
  res.send(`Application ${req.params.id} shortlisted`);
});

// Companies and recruiters can reject
router.post('/:id/reject', auth, check('reject', 'applications'), (req, res) => {
  res.send(`Application ${req.params.id} rejected`);
});

// Companies can approve
router.post('/:id/approve', auth, check('approve', 'applications'), (req, res) => {
  res.send(`Application ${req.params.id} approved`);
});

module.exports = router;