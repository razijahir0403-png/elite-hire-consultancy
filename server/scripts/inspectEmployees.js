const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const Employee = require('../models/Employee');
const User = require('../models/User');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  const emps = await Employee.find({ isDeleted: { $ne: true } }).lean();
  console.log(`Total non-deleted employees in employees collection: ${emps.length}`);
  emps.forEach((e, idx) => {
    console.log(`[${idx + 1}] employeeName: "${e.employeeName}" | code: ${e.employeeCode} | email: ${e.email} | domain: ${e.domain} | _id: ${e._id}`);
  });

  console.log('\nChecking users in users collection:');
  const users = await User.find({ isDeleted: { $ne: true } }).lean();
  users.forEach((u, idx) => {
    console.log(`[${idx + 1}] name: "${u.name}" | email: ${u.email} | _id: ${u._id}`);
  });

  await mongoose.disconnect();
}
inspect();
