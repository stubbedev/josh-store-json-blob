/**
 * @file JSON Blob Storage Service
 * @description Express server that stores JSON blobs with session IDs in MongoDB
 */

const express = require('express');
const mongoose = require('mongoose');

const app = express();

/** @type {number} Server port from environment or default 3000 */
const PORT = process.env.PORT || 3000;

/** @type {string} MongoDB connection URI */
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/jsonblobs';

// CORS Middleware - Allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// JSON body parser middleware
app.use(express.json({ limit: '10mb' }));

/**
 * Health check endpoint
 * @route GET /health
 * @returns {Object} 200 - Health status object
 * @returns {Object} 503 - Unhealthy status object
 */
app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const isDbConnected = dbState === 1;

    res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'healthy' : 'unhealthy',
      mongo: isDbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

/**
 * MongoDB Schema for log entries
 * @typedef {Object} LogSchema
 * @property {string} sessionId - UUID session identifier (indexed)
 * @property {*} data - Mixed type data payload
 * @property {Date} createdAt - Timestamp of log creation
 */
const logSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/** @type {mongoose.Model} Log model */
const Log = mongoose.model('Log', logSchema);

/**
 * Export all data as downloadable JSON file
 * @route GET /export
 * @returns {File} 200 - JSON file download with all logs
 * @returns {Object} 500 - Internal server error
 */
app.get('/export', async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ createdAt: 1 }).lean();

    const data = logs.map(log => ({
      id: log._id.toString(),
      sessionId: log.sessionId,
      data: log.data,
      createdAt: log.createdAt.toISOString()
    }));

    // Set headers for file download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="export-${timestamp}.json"`);

    res.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Middleware to enforce POST-only requests (except /health and /export endpoints)
 * @middleware
 * @returns {Object} 405 - Method not allowed error for non-POST requests
 */
app.all('*', (req, res, next) => {
  if (req.path === '/health' || req.path === '/export') {
    return next();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }
  next();
});

/**
 * Store JSON blob endpoint
 * @route POST /:sessionId
 * @param {string} sessionId - UUID session identifier (must be valid UUID format)
 * @param {Object} req.body - JSON data to store
 * @returns {Object} 201 - Success response with log details
 * @returns {Object} 400 - Invalid session ID error
 * @returns {Object} 500 - Internal server error
 */
app.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Validate UUID format (basic validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID. Must be a valid UUID.' });
    }

    const log = new Log({
      sessionId,
      data: req.body
    });

    await log.save();

    res.status(201).json({
      message: 'Log stored successfully',
      id: log._id,
      sessionId: log.sessionId,
      createdAt: log.createdAt
    });
  } catch (error) {
    console.error('Error storing log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Initialize MongoDB connection and start Express server
 * @async
 */
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
