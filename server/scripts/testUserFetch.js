const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const User = require('../models/User');
const Employee = require('../models/Employee');
const chatService = require('../services/chatService');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.find({ isDeleted: { $ne: true } }).lean();
    console.log(`Total users in DB: ${totalUsers}`);
    console.log(`Active users in DB: ${activeUsers.length}`);

    activeUsers.forEach((u, i) => {
      console.log(`[${i + 1}] ${u.name} | ${u.email} | isApproved: ${u.isApproved} | role: ${u.role}`);
    });

    const adminUser = activeUsers.find((u) => u.email === 'admin@elitehire.com') || activeUsers[0];
    console.log(`\nTesting getEligibleUsers for: ${adminUser.name} (${adminUser.email})`);
    const eligible = await chatService.getEligibleUsers(adminUser._id);
    console.log(`Returned ${eligible.length} eligible users:`);
    eligible.forEach((u) => {
      console.log(` - ${u.name} (${u.email}) [${u.role}] [${u.domain || 'no-domain'}]`);
    });

    // Check if Jahir is found when searching 'jahir'
    const jahirMatches = eligible.filter(
      (u) =>
        u.name.toLowerCase().includes('jahir') ||
        u.email.toLowerCase().includes('jahir')
    );
    console.log(`\nUsers matching 'jahir': ${jahirMatches.length}`);
    jahirMatches.forEach((u) => console.log(`   Found: ${u.name} (${u.email})`));

    await mongoose.disconnect();
    console.log('\nTest completed successfully');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

test();
