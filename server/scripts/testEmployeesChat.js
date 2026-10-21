const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const Employee = require('../models/Employee');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const chatService = require('../services/chatService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function run() {
  console.log('--- STARTING EMPLOYEES CHAT BACKEND TEST ---');
  await mongoose.connect(process.env.MONGO_URI);

  // 1. Check all employees in Employees table
  const allEmps = await Employee.find({ isDeleted: { $ne: true } }).lean();
  console.log(`[Test 1] Found ${allEmps.length} active employees in Employees table:`);
  allEmps.forEach(e => console.log(`   - employeeName: "${e.employeeName}", code: "${e.employeeCode}", email: "${e.email}"`));
  assert(allEmps.length > 0, 'Employees table contains active records');

  // Pick an employee as logged in user
  const loggedInEmp = allEmps.find(e => e.email === 'admin@elitehire.com') || allEmps[0];
  console.log(`\n[Test 2] Simulating login as: ${loggedInEmp.employeeName} (${loggedInEmp.email})`);
  
  const eligible = await chatService.getEligibleEmployees(null, loggedInEmp.email);
  console.log(`Eligible employees count: ${eligible.length}`);
  eligible.forEach(e => {
    console.log(`   * ${e.employeeName} (code: ${e.employeeCode}, email: ${e.email})`);
  });

  assert(eligible.length === allEmps.length - 1, `Eligible count (${eligible.length}) excludes logged-in employee`);
  assert(!eligible.some(e => e.email === loggedInEmp.email), 'Logged-in employee is excluded from eligible recipients');
  assert(eligible.every(e => e.employeeName != null && e.employeeName.length > 0), 'Every eligible record has valid employeeName');

  // Verify Jahir is present in eligible list
  const jahirEmp = eligible.find(e => e.employeeName.toLowerCase().includes('jahir') || e.email.includes('jahir'));
  console.log(`\n[Test 3] Checking Jahir employee: ${jahirEmp ? jahirEmp.employeeName : 'NOT FOUND'}`);
  assert(jahirEmp != null, "Jahir exists in eligible employees list with employeeName 'Jahir'");

  // Verify Santhosh is present in eligible list
  const santhoshEmp = eligible.find(e => e.employeeName.toLowerCase().includes('santhosh'));
  console.log(`[Test 4] Checking Santhosh employee: ${santhoshEmp ? santhoshEmp.employeeName : 'NOT FOUND'}`);
  assert(santhoshEmp != null, 'Santhosh exists in eligible employees list');

  // Test 1-to-1 conversation with Jahir
  const loggedInUser = await User.findOne({ email: loggedInEmp.email });
  assert(loggedInUser != null, 'Logged-in user account exists');

  console.log(`\n[Test 5] Creating 1-to-1 conversation with employee ${jahirEmp.employeeName}:`);
  const directConv = await chatService.getOrCreateConversation(loggedInUser._id, [jahirEmp._id]);
  console.log(`Direct conversation created/retrieved: ID ${directConv._id}, title: "${directConv.displayName}"`);
  assert(directConv.type === 'direct', 'Conversation is direct');
  assert(directConv.displayName === jahirEmp.employeeName, `Conversation title matches employeeName "${jahirEmp.employeeName}"`);

  // Send message
  const msgText = 'Hello Jahir! Testing employee messaging.';
  const { message: sentMsg } = await chatService.sendMessage(loggedInUser._id, directConv._id, msgText);
  console.log(`Message sent: ID ${sentMsg._id}, text: "${sentMsg.text}"`);
  assert(sentMsg.text === msgText, 'Message text matches');

  // Test group conversation with Jahir and Santhosh
  console.log(`\n[Test 6] Creating Group conversation with ${jahirEmp.employeeName} and ${santhoshEmp.employeeName}:`);
  const groupConv = await chatService.getOrCreateConversation(
    loggedInUser._id,
    [jahirEmp._id, santhoshEmp._id],
    'Project Engineering'
  );
  console.log(`Group conversation created: ID ${groupConv._id}, title: "${groupConv.displayName}"`);
  assert(groupConv.type === 'group', 'Conversation is group');
  assert(groupConv.name === 'Project Engineering', 'Group name is set properly');

  // Check user conversations list
  console.log('\n[Test 7] Checking getUserConversations:');
  const userConvs = await chatService.getUserConversations(loggedInUser._id);
  console.log(`Found ${userConvs.length} conversations for ${loggedInEmp.employeeName}:`);
  userConvs.forEach(c => {
    console.log(`   - Type: ${c.type} | Display: "${c.displayName}" | LastMsg: "${c.lastMessageText || 'None'}"`);
  });
  assert(userConvs.length >= 2, 'User has at least 2 conversations');

  await mongoose.disconnect();
  console.log('\n🎉 ALL BACKEND EMPLOYEES CHAT TESTS PASSED!\n');
}

run().catch(err => {
  console.error('Backend test failed:', err);
  process.exit(1);
});
