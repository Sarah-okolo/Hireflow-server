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

// Recruiter creation - can only be done by the company (or specific role that can create recruiters)
router.post('/create', auth, check('create', 'recruiters'), async (req, res) => {
  const { username, password, companyId } = req.body;

  if (!username || !password || !companyId) {
    return res.status(400).json({ error: 'Username, password, and companyId are required' });
  }

  const database = await connectDb();
  const usersCollection = database.collection('users');

  const existingRecruiter = await usersCollection.findOne({ username });
  if (existingRecruiter) {
    return res.status(400).json({ error: 'Recruiter with that username already exists' });
  }

  // Create recruiter only if the company ID exists
  const companyExists = await usersCollection.findOne({
    _id: new ObjectId(companyId),
    role: 'company',
  });

  if (!companyExists) {
    return res.status(400).json({ error: 'Invalid company ID. Company must exist before adding a recruiter.' });
  }

  // Create recruiter in the DB (example: hashed password for security)
  const hashedPassword = await bcrypt.hash(password, 10);
  const newRecruiter = await usersCollection.insertOne({
    username,
    password: hashedPassword,
    role: 'recruiter',
    companyId: companyExists._id,
  });

  res.status(201).json({ message: 'Recruiter created successfully', recruiterId: newRecruiter.insertedId });
});

// Company can delete a recruiter
router.delete('/:id', auth, check('delete', 'recruiters'), async (req, res) => {
  const recruiterId = req.params.id;
  const database = await connectDb();
  const usersCollection = database.collection('users');

  // Check if the recruiter exists
  const recruiter = await usersCollection.findOne({ _id: new ObjectId(recruiterId), role: 'recruiter' });
  if (!recruiter) {
    return res.status(404).json({ error: 'Recruiter not found' });
  }

  // Check if the user requesting to delete is authorized (e.g., only the company can delete a recruiter)
  const user = req.user; // Assuming this is populated by authMiddleware
  if (user.role !== 'company' || recruiter.companyId.toString() !== user.companyId.toString()) {
    return res.status(403).json({ error: 'Unauthorized to delete this recruiter' });
  }

  // Delete the recruiter
  await usersCollection.deleteOne({ _id: new ObjectId(recruiterId) });
  res.status(200).json({ message: `Recruiter ${recruiterId} deleted successfully` });
});

// Recruiter can view their own profile
router.get('/:id', auth, check('read', 'recruiters'), async (req, res) => {
  const recruiterId = req.params.id;
  const database = await connectDb();
  const usersCollection = database.collection('users');

  // Check if the recruiter exists
  const recruiter = await usersCollection.findOne({ _id: new ObjectId(recruiterId), role: 'recruiter' });
  if (!recruiter) {
    return res.status(404).json({ error: 'Recruiter not found' });
  }

  // Only allow the recruiter to view their own profile
  if (recruiter._id.toString() !== req.user.id.toString()) {
    return res.status(403).json({ error: 'Unauthorized to view this recruiter profile' });
  }

  res.status(200).json({ recruiter });
});

module.exports = router;