const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/checkPermission');
const { getDB } = require('../db/connect');

// Create a job (Recruiters can create jobs)
router.post(
  '/create',
  authMiddleware,
  checkPermission('create', 'jobs'),
  async (req, res) => {
    try {
      const db = getDB();
      const jobData = {
        title: req.body.title,
        description: req.body.description,
        location: req.body.location,
        companyId: req.user.companyId, // assuming authMiddleware sets this
        recruiterId: req.user.id,      // owner
        createdAt: new Date(),
      };

      const result = await db.collection('jobs').insertOne(jobData);
      res.status(201).json({ message: 'Job created!', jobId: result.insertedId });
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  }
);

// View all jobs
router.get(
  '/',
  authMiddleware,
  checkPermission('read', 'jobs'),
  async (req, res) => {
    try {
      const db = getDB();
      const jobs = await db.collection('jobs').find().toArray();
      res.status(200).json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  }
);

// View a specific job
router.get(
  '/:id',
  authMiddleware,
  checkPermission('read', 'jobs'),
  async (req, res) => {
    try {
      const db = getDB();
      const job = await db.collection('jobs').findOne({ _id: new ObjectId(req.params.id) });

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.status(200).json(job);
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  }
);

// Delete a job (Only recruiters who created the job can delete it)
router.delete(
  '/:id',
  authMiddleware,
  checkPermission('delete', 'jobs'),
  async (req, res) => {
    try {
      const db = getDB();
      const jobId = new ObjectId(req.params.id);

      // Find the job
      const job = await db.collection('jobs').findOne({ _id: jobId });
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Only allow the recruiter who created it to delete
      if (job.recruiterId !== req.user.id) {
        return res.status(403).json({ error: 'You are not authorized to delete this job' });
      }

      await db.collection('jobs').deleteOne({ _id: jobId });
      res.status(200).json({ message: `Job ${req.params.id} deleted successfully!` });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({ error: 'Failed to delete job' });
    }
  }
);

module.exports = router;