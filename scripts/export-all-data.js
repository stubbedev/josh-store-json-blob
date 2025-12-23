#!/usr/bin/env node

/**
 * @file Export all data from MongoDB
 * @description Script to retrieve and export all JSON blobs from the database
 * Usage: node scripts/export-all-data.js [options]
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

/** @type {string} MongoDB connection URI */
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jsonblobs';

/** @type {string} Output format (json or csv) */
const FORMAT = process.env.FORMAT || 'json';

/** @type {string} Output directory */
const OUTPUT_DIR = process.env.OUTPUT_DIR || './exports';

/**
 * MongoDB Schema for log entries
 * @typedef {Object} LogSchema
 * @property {string} sessionId - UUID session identifier
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

const Log = mongoose.model('Log', logSchema);

/**
 * Ensure output directory exists
 * @param {string} dir - Directory path
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Export data as JSON file
 * @param {Array} logs - Array of log documents
 * @param {string} outputPath - Output file path
 */
function exportAsJson(logs, outputPath) {
  const data = logs.map(log => ({
    id: log._id.toString(),
    sessionId: log.sessionId,
    data: log.data,
    createdAt: log.createdAt.toISOString()
  }));
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Exported ${logs.length} records to ${outputPath}`);
}

/**
 * Export data as NDJSON (newline-delimited JSON) file
 * @param {Array} logs - Array of log documents
 * @param {string} outputPath - Output file path
 */
function exportAsNdjson(logs, outputPath) {
  const lines = logs.map(log => JSON.stringify({
    id: log._id.toString(),
    sessionId: log.sessionId,
    data: log.data,
    createdAt: log.createdAt.toISOString()
  }));
  
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`Exported ${logs.length} records to ${outputPath}`);
}

/**
 * Export data grouped by session ID
 * @param {Array} logs - Array of log documents
 * @param {string} outputDir - Output directory path
 */
function exportBySession(logs, outputDir) {
  const sessionDir = path.join(outputDir, 'by-session');
  ensureDirectoryExists(sessionDir);
  
  const sessionGroups = {};
  
  logs.forEach(log => {
    if (!sessionGroups[log.sessionId]) {
      sessionGroups[log.sessionId] = [];
    }
    sessionGroups[log.sessionId].push({
      id: log._id.toString(),
      data: log.data,
      createdAt: log.createdAt.toISOString()
    });
  });
  
  Object.keys(sessionGroups).forEach(sessionId => {
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(sessionGroups[sessionId], null, 2));
  });
  
  console.log(`Exported ${Object.keys(sessionGroups).length} sessions to ${sessionDir}`);
}

/**
 * Print statistics about the data
 * @param {Array} logs - Array of log documents
 */
function printStatistics(logs) {
  const sessions = new Set(logs.map(log => log.sessionId));
  const totalSize = JSON.stringify(logs).length;
  
  console.log('\n=== Statistics ===');
  console.log(`Total records: ${logs.length}`);
  console.log(`Unique sessions: ${sessions.size}`);
  console.log(`Total data size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (logs.length > 0) {
    const oldest = logs.reduce((a, b) => a.createdAt < b.createdAt ? a : b);
    const newest = logs.reduce((a, b) => a.createdAt > b.createdAt ? a : b);
    console.log(`Date range: ${oldest.createdAt.toISOString()} to ${newest.createdAt.toISOString()}`);
  }
  console.log('==================\n');
}

/**
 * Main export function
 * @async
 */
async function exportAllData() {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    console.log('Fetching all logs...');
    const logs = await Log.find({}).sort({ createdAt: 1 }).lean();
    
    if (logs.length === 0) {
      console.log('No data found in database');
      await mongoose.connection.close();
      return;
    }
    
    printStatistics(logs);
    
    ensureDirectoryExists(OUTPUT_DIR);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    // Export as single JSON file
    const jsonPath = path.join(OUTPUT_DIR, `all-data-${timestamp}.json`);
    exportAsJson(logs, jsonPath);
    
    // Export as NDJSON
    const ndjsonPath = path.join(OUTPUT_DIR, `all-data-${timestamp}.ndjson`);
    exportAsNdjson(logs, ndjsonPath);
    
    // Export grouped by session
    exportBySession(logs, OUTPUT_DIR);
    
    console.log('\nExport completed successfully!');
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error exporting data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the export
exportAllData();
