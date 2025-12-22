const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/jsonblobs';

// Middleware
app.use(express.json({ limit: '10mb' }));

// MongoDB Schema
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

const Log = mongoose.model('Log', logSchema);

// Only accept POST requests - reject all other methods
app.all('*', (req, res, next) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are accepted.' });
  }
  next();
});

// POST endpoint to store logs
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

// Connect to MongoDB and start server
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
