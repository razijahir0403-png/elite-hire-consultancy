const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const http = require('http');

const connectDB = require('../config/db');
const User = require('../models/User');
const RequestInfo = require('../models/RequestInfo');
const { app } = require('../server');
const {
  RECRUITMENT_STATUS,
  RecruitmentStatusLabel,
  recruitmentFilterOptions,
} = require('../utils/statusMaster');

const TEST_PORT = 5092;

const makeRequest = (method, path, body, token) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method,
        headers,
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
  console.log('=== Step 1: Checking Canonical Workflow Status Configuration ===');
  const options = recruitmentFilterOptions();
  console.log(`Total workflow status options: ${options.length}`);
  if (options.length !== 25) {
    throw new Error(`Expected 25 workflow statuses, found ${options.length}`);
  }

  // Ensure 0 to 24 are in exact ascending numerical order
  for (let i = 0; i <= 24; i++) {
    if (options[i].value !== i) {
      throw new Error(`Workflow status index ${i} has mismatch value ${options[i].value}`);
    }
    console.log(`  [${options[i].value}] ${options[i].label}`);
  }
  console.log('✅ Canonical workflow statuses are in exact sequential order (0 to 24).\n');

  console.log('=== Step 2: Connecting to Database ===');
  await connectDB();
  console.log('Connected to MongoDB.\n');

  console.log('=== Step 3: Starting Test HTTP Server ===');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));
  console.log(`Test server running on port ${TEST_PORT}\n`);

  try {
    console.log('=== Step 4: Authenticating User via Login API ===');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'dev@elitehire.com',
      password: 'Dev@2026',
    });
    if (loginRes.statusCode !== 200 || !loginRes.data.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }
    const token = loginRes.data.token;
    console.log(`Logged in as ${loginRes.data.name} (${loginRes.data.email}, role: ${loginRes.data.role})\n`);

    console.log('=== Step 5: Finding a RequestInfo Candidate Record ===');
    const record = await RequestInfo.findOne().lean();
    if (!record) {
      throw new Error('No RequestInfo record found in database to test.');
    }
    console.log(`Found record: ${record.idnumber} (_id: ${record._id})`);
    console.log(`Initial Status: ${record.status} (${RecruitmentStatusLabel[record.status]})`);
    console.log(`Initial statusHistory count: ${record.statusHistory?.length || 0}\n`);

    console.log('=== Step 6: Testing Workflow Status Update via API ===');
    // Test transitioning to a different workflow status (e.g. 24: On-Hold or 13: Selected or 21: Response Received)
    const targetStatus = record.status === 24 ? 13 : 24;
    const testRemarks = `Automated verification test - workflow transition to ${RecruitmentStatusLabel[targetStatus]} at ${new Date().toISOString()}`;

    const updateRes = await makeRequest(
      'PUT',
      `/api/analytics/update-status/${record._id}`,
      {
        status: targetStatus,
        description: testRemarks,
      },
      token
    );

    console.log(`Update Status HTTP response: ${updateRes.statusCode}`);
    if (updateRes.statusCode !== 200) {
      throw new Error(`Failed to update status: ${JSON.stringify(updateRes.data)}`);
    }

    console.log('Returned updated record:', {
      _id: updateRes.data._id,
      idnumber: updateRes.data.idnumber,
      status: updateRes.data.status,
      description: updateRes.data.description,
    });

    console.log('\n=== Step 7: Verifying Database Persistence in MongoDB ===');
    const reFetchedRecord = await RequestInfo.findById(record._id).lean();
    if (!reFetchedRecord) {
      throw new Error('Record not found after update');
    }

    console.log(`Saved status in MongoDB: ${reFetchedRecord.status}`);
    if (reFetchedRecord.status !== targetStatus) {
      throw new Error(`Expected status ${targetStatus}, but got ${reFetchedRecord.status}`);
    }

    const latestHistory = reFetchedRecord.statusHistory[reFetchedRecord.statusHistory.length - 1];
    console.log('Latest history entry in MongoDB:', latestHistory);
    if (latestHistory.status !== targetStatus) {
      throw new Error(`History status mismatch: ${latestHistory.status} !== ${targetStatus}`);
    }
    if (latestHistory.description !== testRemarks) {
      throw new Error(`History description mismatch: "${latestHistory.description}" !== "${testRemarks}"`);
    }
    console.log('✅ Status and Audit Trail successfully persisted in MongoDB.');

    console.log('\n=== Step 8: Verifying Status History Endpoint ===');
    const historyRes = await makeRequest('GET', `/api/analytics/history/${record._id}`, null, token);
    console.log(`History API response status: ${historyRes.statusCode}`);
    if (historyRes.statusCode !== 200 || !Array.isArray(historyRes.data)) {
      throw new Error(`History endpoint failed: ${JSON.stringify(historyRes.data)}`);
    }

    const apiLatestHistory = historyRes.data[historyRes.data.length - 1];
    console.log('Latest history entry from API:', apiLatestHistory);
    if (apiLatestHistory.status !== targetStatus) {
      throw new Error(`API history status mismatch: ${apiLatestHistory.status}`);
    }
    console.log('✅ History API immediately returns the new status transition.');

    console.log('\n=============================================');
    console.log('🎉 ALL WORKFLOW STATUS TESTS PASSED!');
    console.log('=============================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
