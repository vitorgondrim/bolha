// ============================================================
// BOLHA - TEST SUITE INFRASTRUCTURE
// setup.js — Global test setup with mongodb-memory-server
// Provides: isolated in-memory MongoDB, app factory, auth helper
// ============================================================

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const path = require('path');

// Load .env from backend root
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ─── Global mongo instance (per file) ────────────────────────
let mongoServer;

/**
 * Starts an in-memory MongoDB.
 * Call in describe-level `beforeAll` in each test file.
 */
async function startMemoryServer() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Stops the in-memory MongoDB.
 * Call in describe-level `afterAll`.
 */
async function stopMemoryServer() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Drops all collections — full isolation between tests.
 * Call in `afterEach`.
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

// ─── App factory ─────────────────────────────────────────────
function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Stub socket.io so controllers don't crash
  app.use((req, res, next) => {
    req.io = {
      emit: () => {},
      to: () => ({ emit: () => {} }),
    };
    next();
  });

  return app;
}

// ─── Auth helper ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

async function createTestUser(overrides = {}) {
  const suffix = Date.now() + Math.random().toString(36).slice(2, 6);
  const userData = {
    username: overrides.username || `tuser_${suffix}`,
    email: overrides.email || `test_${suffix}@example.com`,
    password: 'password123',
    ...overrides,
  };

  const user = await User.create(userData);

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

  return { user: user.toObject(), token };
}

module.exports = {
  startMemoryServer,
  stopMemoryServer,
  clearDatabase,
  createApp,
  createTestUser,
};
