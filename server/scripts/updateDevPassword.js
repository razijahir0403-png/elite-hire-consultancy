const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');

const connectDB = require('../config/db');
const User = require('../models/User');
const { app } = require('../server');

const TARGET_EMAIL = 'dev@elitehire.com';
const NEW_PASSWORD = 'Dev@2026';
const SALT_ROUNDS = 10;
const TEST_PORT = 5088;

const makeRequest = (method, path, body) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(responseBody) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: responseBody });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const run = async () => {
  console.log('=== Step 1: Connecting to Database ===');
  await connectDB();
  console.log('Connected to MongoDB successfully.\n');

  console.log(`=== Step 2: Finding Existing User (${TARGET_EMAIL}) ===`);
  const existingUser = await User.findOne({ email: TARGET_EMAIL }).select('+password').lean();
  if (!existingUser) {
    throw new Error(`User with email ${TARGET_EMAIL} not found in database.`);
  }

  console.log('Existing User Found:');
  console.log({
    _id: existingUser._id.toString(),
    name: existingUser.name,
    email: existingUser.email,
    role: existingUser.role?.toString(),
    isApproved: existingUser.isApproved,
    isDeleted: existingUser.isDeleted,
    createdAt: existingUser.createdAt,
    updatedAt: existingUser.updatedAt,
    passwordHashLength: existingUser.password?.length,
  });

  const oldPasswordHash = existingUser.password;
  console.log(`Current password hash prefix: ${oldPasswordHash.substring(0, 10)}...\n`);

  console.log('=== Step 3: Hashing New Password using bcrypt with 10 salt rounds ===');
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

  console.log(`New password hashed successfully.`);
  console.log(`Hashed password prefix: ${hashedPassword.substring(0, 10)}... (length: ${hashedPassword.length})`);
  console.log(`Verified plain-text is NOT stored: ${hashedPassword !== NEW_PASSWORD}`);
  console.log(`Verified new password matches hash: ${bcrypt.compareSync(NEW_PASSWORD, hashedPassword)}\n`);

  console.log('=== Step 4: Updating ONLY Password Field in MongoDB ===');
  const updateResult = await User.collection.updateOne(
    { email: TARGET_EMAIL },
    { $set: { password: hashedPassword } }
  );

  console.log('MongoDB updateOne result:', {
    matchedCount: updateResult.matchedCount,
    modifiedCount: updateResult.modifiedCount,
    acknowledged: updateResult.acknowledged,
  });

  console.log('\n=== Step 5: Verifying Document Integrity After Update ===');
  const updatedUser = await User.findOne({ email: TARGET_EMAIL }).select('+password').lean();

  if (!updatedUser) {
    throw new Error('Could not retrieve user after update.');
  }

  // Verification checks:
  const checks = [
    { name: '_id unchanged', pass: updatedUser._id.toString() === existingUser._id.toString() },
    { name: 'name unchanged', pass: updatedUser.name === existingUser.name },
    { name: 'email unchanged', pass: updatedUser.email === existingUser.email },
    { name: 'role unchanged', pass: String(updatedUser.role) === String(existingUser.role) },
    { name: 'isApproved unchanged', pass: updatedUser.isApproved === existingUser.isApproved },
    { name: 'isDeleted unchanged', pass: updatedUser.isDeleted === existingUser.isDeleted },
    { name: 'password updated to new hash', pass: updatedUser.password === hashedPassword },
    { name: 'password not plain text', pass: updatedUser.password !== NEW_PASSWORD },
    { name: 'new password verifies with bcrypt', pass: bcrypt.compareSync(NEW_PASSWORD, updatedUser.password) },
    { name: 'old password hash replaced', pass: updatedUser.password !== oldPasswordHash },
  ];

  for (const check of checks) {
    if (!check.pass) {
      throw new Error(`Integrity check failed: ${check.name}`);
    }
    console.log(`✅ ${check.name}`);
  }

  console.log('\n=== Step 6: Starting Test HTTP Server for Existing Login API ===');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));
  console.log(`Test server listening on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    console.log('=== Step 7: Verifying Login API with New Password (Dev@2026) ===');
    const validLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: TARGET_EMAIL,
      password: NEW_PASSWORD,
    });

    console.log(`Status Code: ${validLoginRes.statusCode}`);
    console.log('Response Payload:', {
      _id: validLoginRes.data._id,
      name: validLoginRes.data.name,
      email: validLoginRes.data.email,
      role: validLoginRes.data.role,
      hasToken: Boolean(validLoginRes.data.token),
    });

    if (validLoginRes.statusCode !== 200 || !validLoginRes.data.token) {
      throw new Error(`Login API failed for new password: ${JSON.stringify(validLoginRes.data)}`);
    }
    console.log('✅ Login with NEW password succeeded with HTTP 200 and valid JWT token.');

    console.log('\n=== Step 8: Ensuring Old / Invalid Passwords Fail on Login API ===');
    const testCases = [
      { label: 'Original seed password (Password123!)', password: 'Password123!' },
      { label: 'Incorrect casing (dev@2026)', password: 'dev@2026' },
      { label: 'Arbitrary wrong password (WrongPassword@2026)', password: 'WrongPassword@2026' },
    ];

    for (const testCase of testCases) {
      const failedLoginRes = await makeRequest('POST', '/api/auth/login', {
        email: TARGET_EMAIL,
        password: testCase.password,
      });

      console.log(`Testing ${testCase.label} -> Status: ${failedLoginRes.statusCode}, Message: ${failedLoginRes.data.message || failedLoginRes.data.error || JSON.stringify(failedLoginRes.data)}`);
      if (failedLoginRes.statusCode !== 401) {
        throw new Error(`Expected HTTP 401 for ${testCase.label}, but got ${failedLoginRes.statusCode}`);
      }
      console.log(`✅ ${testCase.label} correctly rejected with HTTP 401.`);
    }

    console.log('\n=============================================');
    console.log('🎉 ALL REQUIREMENTS SUCCESSFULLY VERIFIED!');
    console.log('=============================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
