const { getDB } = require('../db/connect');
const bcrypt = require('bcryptjs');

const db = getDB();
const usersCollection = db.collection('users');

// Create user
async function createUser(username, password, role, companyId = null) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    username,
    password: hashedPassword,
    role,
    companyId,
  };
  await usersCollection.insertOne(user);
  return user;
}

// Find user by username
async function findUserByUsername(username) {
  return usersCollection.findOne({ username });
}

module.exports = { createUser, findUserByUsername };
// This module provides functions to interact with the users collection in MongoDB.
// It includes functions to create a new user and find a user by username.