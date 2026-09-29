'use strict';
/**
 * Test harness: spins up an in-memory MongoDB (mongodb-memory-server) and builds
 * the real Express app (server/app.js) against it — no mocks, no listen().
 *
 * One instance per test file: call buildTestApp() in beforeAll, teardownTestApp()
 * in afterAll. vitest.config.js runs each test file in its own process (pool:
 * 'forks') so the process.env mutations here and the require('../../app')
 * singleton never leak between files.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const TEST_JWT_ACCESS_SECRET = 'test-access-secret';
const TEST_JWT_REFRESH_SECRET = 'test-refresh-secret';

let mongod;

async function buildTestApp() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_LOCAL_URI = mongod.getUri('foodvibe_test');
  process.env.NODE_ENV = 'development';
  process.env.JWT_ACCESS_SECRET = TEST_JWT_ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;

  const { connectDb } = require('../../db');
  await connectDb();

  return require('../../app');
}

async function teardownTestApp() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
}

/** Signs a test-only access token for the given user payload, e.g. { userId, role }. */
function signTestToken(payload) {
  return jwt.sign(payload, TEST_JWT_ACCESS_SECRET);
}

/** Direct handle to the underlying native db, for seeding fixtures / asserting raw state. */
function testDb() {
  return mongoose.connection.db;
}

module.exports = { buildTestApp, teardownTestApp, signTestToken, testDb };
