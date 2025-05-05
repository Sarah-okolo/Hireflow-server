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

// Company can view its own info
router.get('/', auth, check('read', 'companies'), async (req, res) => {
  const companyId = req.user.id; // Use the userId from the token (i.e., the logged-in user)

  const database = await connectDb();
  const usersCollection = database.collection('users');

  // Fetch company information based on userId
  const company = await usersCollection.findOne({ _id: new ObjectId(companyId), role: 'company' });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.status(200).json({ company });
});

// Company can delete itself
router.delete('/:id', auth, check('delete', 'companies'), async (req, res) => {
  const companyId = req.params.id;
  const userId = req.user.id; // The authenticated user's ID

  if (companyId !== userId) {
    return res.status(403).json({ error: 'Unauthorized to delete this company' });
  }

  const database = await connectDb();
  const usersCollection = database.collection('users');

  // Check if the company exists before deletion
  const company = await usersCollection.findOne({ _id: new ObjectId(companyId), role: 'company' });
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Perform deletion
  await usersCollection.deleteOne({ _id: new ObjectId(companyId) });
  
  res.status(200).json({ message: `Company ${companyId} deleted successfully` });
});

module.exports = router;