const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const router = express.Router();

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDb() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME);
  }
  return db;
}

router.post('/signup', async (req, res) => {
  const { username, password, role, companyId, companyName } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  const validRoles = ['candidate', 'recruiter', 'company'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be candidate, recruiter, or company.' });
  }

  const database = await connectDb();
  const usersCollection = database.collection('users');

  const existingUser = await usersCollection.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  let userData = {
    username,
    password: hashedPassword,
    role,
  };

  if (role === 'company') {
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required for company accounts' });
    }

    const generatedCompanyId = new ObjectId();
    userData.companyName = companyName;
    userData.companyId = generatedCompanyId;

  } else if (role === 'recruiter') {
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required for recruiter accounts' });
    }

    let validCompanyId;
    try {
      validCompanyId = new ObjectId(companyId);
    } catch {
      return res.status(400).json({ error: 'Invalid company ID format' });
    }

    const companyExists = await usersCollection.findOne({
      role: 'company',
      companyId: validCompanyId
    });

    if (!companyExists) {
      return res.status(400).json({ error: 'Company ID not found. Company must exist before adding recruiters.' });
    }

    userData.companyId = validCompanyId;
  }

  try {
    const result = await usersCollection.insertOne(userData);
    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Prepare full user data to return (excluding password)
    const { password: _, ...userWithoutPassword } = {
      _id: result.insertedId,
      ...userData
    };

    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const database = await connectDb();
  const usersCollection = database.collection('users');

  const user = await usersCollection.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    token,
    user: userWithoutPassword
  });
});

module.exports = router;