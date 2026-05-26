/**
 * Migrate text statuses to numeric INT storage.
 * Run: node server/utils/migrateStatuses.js
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const RequestInfo = require('../models/RequestInfo');
const {
  RECRUITMENT_TEXT_TO_CODE,
  RECRUITMENT_STATUS,
} = require('./statusMaster');

const migrateRequestInfos = async () => {
  const records = await RequestInfo.find({}).setOptions({ includeDeleted: true });
  let updated = 0;

  for (const doc of records) {
    let changed = false;

    if (typeof doc.status === 'string') {
      doc.status = RECRUITMENT_TEXT_TO_CODE[doc.status] ?? RECRUITMENT_STATUS.VERIFIED;
      changed = true;
    } else {
      doc.status = Number(doc.status);
    }

    if (Array.isArray(doc.statusHistory)) {
      doc.statusHistory = doc.statusHistory.map((item) => {
        const entry = item.toObject ? item.toObject() : { ...item };
        if (typeof entry.status === 'string') {
          entry.status = RECRUITMENT_TEXT_TO_CODE[entry.status] ?? RECRUITMENT_STATUS.VERIFIED;
          changed = true;
        } else {
          entry.status = Number(entry.status);
        }
        return entry;
      });
    }

    if (changed || typeof doc.status === 'string') {
      await doc.save();
      updated += 1;
    }
  }

  return updated;
};

const run = async () => {
  try {
    await connectDB();
    const requestInfos = await migrateRequestInfos();
    process.stderr.write(`Status migration complete. RequestInfo: ${requestInfos}\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Status migration failed: ${error.message}\n`);
    process.exit(1);
  }
};

run();
