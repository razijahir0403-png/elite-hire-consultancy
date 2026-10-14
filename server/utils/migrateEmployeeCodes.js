/**
 * Migration script to update existing employee codes from EHC prefix to EMP prefix.
 * Run: node server/utils/migrateEmployeeCodes.js
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const Employee = require('../models/Employee');

const migrateEmployeeCodes = async () => {
  // Query all employee records including soft-deleted ones
  const records = await Employee.find({
    employeeCode: { $regex: '^EHC\\d+$' },
  }).setOptions({ includeDeleted: true });

  console.log(`Found ${records.length} employee record(s) with EHC prefix.`);

  let updatedCount = 0;
  for (const doc of records) {
    const oldCode = doc.employeeCode;
    const newCode = oldCode.replace(/^EHC/, 'EMP');

    // Check if new code already exists
    const existing = await Employee.findOne({ employeeCode: newCode }).setOptions({ includeDeleted: true });
    if (existing && existing._id.toString() !== doc._id.toString()) {
      console.warn(`Warning: Target code ${newCode} already belongs to another record (${existing._id}). Skipping ${doc._id}.`);
      continue;
    }

    doc.employeeCode = newCode;
    await doc.save();
    console.log(`✓ Migrated ${doc._id}: ${oldCode} -> ${newCode} (${doc.employeeName})`);
    updatedCount += 1;
  }

  return { total: records.length, updated: updatedCount };
};

const run = async () => {
  try {
    await connectDB();
    const result = await migrateEmployeeCodes();
    console.log(`\nEmployee code migration complete. Total found: ${result.total}, Updated: ${result.updated}\n`);
    process.exit(0);
  } catch (error) {
    console.error(`Employee code migration failed: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = migrateEmployeeCodes;
