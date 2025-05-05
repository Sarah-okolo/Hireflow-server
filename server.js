const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./db/connect');
const { Permit } = require("permitio");

const permit = new Permit({
  pdp: "https://cloudpdp.api.permit.io", // cloud PDP URL
  token: process.env.PERMIT_API_KEY,     // your Permit API key
});

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS configuration
const corsOptions = {
  origin: 'https://hirefloww.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit process if DB connection fails
  });

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Backend server is running 🚀💫⭐');
});

// Job routes
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

// 404 Not Found middleware
app.use((req, res) => {
  res.status(404).send('Sorry, that route does not exist.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).send('Something broke!');
});

// Graceful shutdown handling for SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received: Shutting down gracefully');
  app.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});

// Handling unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1); // Exit process after unhandled rejection
});

module.exports = app;