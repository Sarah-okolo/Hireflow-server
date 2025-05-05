const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./db/connect');
const { Permit } = require("permitio");

const permit = new Permit({
  pdp: "https://cloudpdp.api.permit.io", // cloud PDP URL
  token: process.env.PERMIT_API_KEY,     // my permit API key
});


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Backend server is running 🚀💫⭐');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});

// 404 Not Found middleware
app.use((req, res) => {
  res.status(404).send('Sorry, that route does not exist.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const jobsRoutes = require('./routes/jobs');
const appsRoutes = require('./routes/applications');
const companiesRoutes = require('./routes/companies');
const recruitersRoutes = require('./routes/recruiters');
const candidatesRoutes = require('./routes/candidates'); 

app.use('/jobs', jobsRoutes);
app.use('/applications', appsRoutes);
app.use('/companies', companiesRoutes);
app.use('/recruiters', recruitersRoutes);
app.use('/candidates', candidatesRoutes); 



module.exports = app;