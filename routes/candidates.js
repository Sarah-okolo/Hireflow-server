const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const check = require('../middleware/checkPermission');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// Initialize MongoDB client and connect
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDb() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME);
  }
  return db;
}

// Get candidate profile - only allow the candidate to view their own profile
router.get('/profile', auth, check('read', 'candidates'), async (req, res) => {
  const userId = req.user.id;
  const database = await connectDb();
  const usersCollection = database.collection('users');

  const candidate = await usersCollection.findOne({ _id: new ObjectId(userId), role: 'candidate' });
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  res.status(200).json({ profile: candidate });
});

// Update candidate profile - candidates can only update their own profiles
router.put('/profile', auth, check('update', 'candidates'), async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, email, skills } = req.body;

  // Validate required fields (you can add more validation as needed)
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  const database = await connectDb();
  const usersCollection = database.collection('users');

  const updatedCandidate = await usersCollection.updateOne(
    { _id: new ObjectId(userId), role: 'candidate' },
    { $set: { firstName, lastName, email, skills } }
  );

  if (updatedCandidate.modifiedCount === 0) {
    return res.status(400).json({ error: 'Could not update profile' });
  }

  res.status(200).json({ message: 'Profile updated successfully' });
});

// Recruiter or company can create a candidate profile
router.post('/create', auth, check('create', 'candidates'), async (req, res) => {
  const { firstName, lastName, email, skills, companyId } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !companyId) {
    return res.status(400).json({ error: 'First name, last name, email, and company ID are required' });
  }

  const database = await connectDb();
  const usersCollection = database.collection('users');

  // Ensure the company exists (recruiters should not create candidates)
  const companyExists = await usersCollection.findOne({
    _id: new ObjectId(companyId),
    role: 'company',
  });

  if (!companyExists) {
    return res.status(400).json({ error: 'Invalid company ID. Company must exist before creating a candidate profile.' });
  }

  // Create the candidate profile
  const newCandidate = await usersCollection.insertOne({
    firstName,
    lastName,
    email,
    skills,
    role: 'candidate',
    companyId: new ObjectId(companyId),
  });

  res.status(201).json({ message: 'Candidate profile created successfully', candidateId: newCandidate.insertedId });
});

// Company can delete a candidate profile
router.delete('/:id', auth, check('delete', 'candidates'), async (req, res) => {
  const candidateId = req.params.id;
  const userId = req.user.id;
  const database = await connectDb();
  const usersCollection = database.collection('users');

  // Check if the candidate exists
  const candidate = await usersCollection.findOne({ _id: new ObjectId(candidateId), role: 'candidate' });
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  // Ensure the user requesting the deletion is authorized (only companies can delete candidates)
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (user.role !== 'company' || candidate.companyId.toString() !== user.companyId.toString()) {
    return res.status(403).json({ error: 'Unauthorized to delete this candidate' });
  }

  // Delete the candidate profile
  await usersCollection.deleteOne({ _id: new ObjectId(candidateId) });
  res.status(200).json({ message: `Candidate ${candidateId} deleted successfully` });
});

module.exports = router;