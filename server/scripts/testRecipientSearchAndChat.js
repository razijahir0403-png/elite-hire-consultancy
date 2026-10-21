const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './server/.env' });

const User = require('../models/User');
const Employee = require('../models/Employee');
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE RECIPIENT SEARCH & CHAT TEST');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected successfully.\n');

  // Test Step 1: Verify all active System Users in User collection
  const allActiveUsers = await User.find({ isDeleted: { $ne: true } }).lean();
  console.log(`[Step 1] Total active users in database: ${allActiveUsers.length}`);
  assert(allActiveUsers.length >= 5, `Expected at least 5 active users, found ${allActiveUsers.length}`);

  // Test Step 2: Test getEligibleUsers for an Admin user
  const adminUser = allActiveUsers.find(u => u.email === 'admin@elitehire.com') || allActiveUsers[0];
  const eligibleUsers = await chatService.getEligibleUsers(adminUser._id);
  console.log(`\n[Step 2] Testing eligible recipients when logged in as ${adminUser.name} (${adminUser.email})`);
  console.log(`Total eligible users: ${eligibleUsers.length} (heading shows SYSTEM USERS (${eligibleUsers.length}))`);
  
  assert(eligibleUsers.length === allActiveUsers.length - 1, `Eligible count (${eligibleUsers.length}) must exclude logged-in user (${adminUser.email})`);
  assert(!eligibleUsers.some(u => u._id.toString() === adminUser._id.toString()), 'Current logged in user is excluded from eligible recipients');

  // Test Step 3: Dynamic search keystrokes simulation
  console.log('\n[Step 3] Simulating dynamic search filtering with keystrokes:');
  
  // 3a. Search 'j'
  const searchJ = eligibleUsers.filter(u => 
    (u.name || '').toLowerCase().includes('j') || 
    (u.email || '').toLowerCase().includes('j')
  );
  console.log(` - Query 'j': ${searchJ.length} matching users`);
  assert(searchJ.length > 0, `Query 'j' returned ${searchJ.length} matches`);

  // 3b. Search 'ja'
  const searchJa = eligibleUsers.filter(u => 
    (u.name || '').toLowerCase().includes('ja') || 
    (u.email || '').toLowerCase().includes('ja')
  );
  console.log(` - Query 'ja': ${searchJa.length} matching users`);
  assert(searchJa.length <= searchJ.length && searchJa.length > 0, `Query 'ja' narrowed matches down to ${searchJa.length}`);

  // 3c. Search 'jahir'
  const searchJahir = eligibleUsers.filter(u => 
    (u.name || '').toLowerCase().includes('jahir') || 
    (u.email || '').toLowerCase().includes('jahir')
  );
  console.log(` - Query 'jahir': ${searchJahir.length} matching users`);
  searchJahir.forEach(u => console.log(`     -> ${u.name} (${u.email}) [Role: ${u.role}]`));
  assert(searchJahir.length >= 1, `Searching 'jahir' MUST return at least 1 Jahir account (found ${searchJahir.length})`);
  assert(searchJahir.some(u => u.name.toLowerCase().includes('jahir')), "Matches contain name 'Jahir'");

  // 3d. Search 'san' (Santhosh)
  const searchSan = eligibleUsers.filter(u => 
    (u.name || '').toLowerCase().includes('san') || 
    (u.email || '').toLowerCase().includes('san')
  );
  console.log(` - Query 'san': ${searchSan.length} matching users`);
  assert(searchSan.some(u => u.name.toLowerCase().includes('santhosh')), "Searching 'san' matches Santhosh");

  // 3e. Search 'kam' (Kamali)
  const searchKam = eligibleUsers.filter(u => 
    (u.name || '').toLowerCase().includes('kam') || 
    (u.email || '').toLowerCase().includes('kam')
  );
  console.log(` - Query 'kam': ${searchKam.length} matching users`);
  assert(searchKam.some(u => u.name.toLowerCase().includes('kamali')), "Searching 'kam' matches Kamali");

  // 3f. Search 'nonexistent_user_xyz'
  const searchNone = eligibleUsers.filter(u => 
    (u.name || '').toLowerCase().includes('nonexistent_user_xyz') || 
    (u.email || '').toLowerCase().includes('nonexistent_user_xyz')
  );
  console.log(` - Query 'nonexistent_user_xyz': ${searchNone.length} matching users (triggers 'No users found')`);
  assert(searchNone.length === 0, 'No users match non-existent query');

  // Test Step 4: Recipient Selection logic
  console.log('\n[Step 4] Testing Recipient Selection (single, multi, and duplicate prevention):');
  let selectedRecipients = [];
  
  // Select Jahir
  const jahirRecipient = searchJahir[0];
  if (!selectedRecipients.some(r => r._id.toString() === jahirRecipient._id.toString())) {
    selectedRecipients.push(jahirRecipient);
  }
  assert(selectedRecipients.length === 1, 'Selected 1 recipient: Jahir');

  // Attempt duplicate selection
  if (!selectedRecipients.some(r => r._id.toString() === jahirRecipient._id.toString())) {
    selectedRecipients.push(jahirRecipient);
  }
  assert(selectedRecipients.length === 1, 'Duplicate selection prevented');

  // Select Santhosh
  const santhoshRecipient = searchSan[0];
  if (!selectedRecipients.some(r => r._id.toString() === santhoshRecipient._id.toString())) {
    selectedRecipients.push(santhoshRecipient);
  }
  assert(selectedRecipients.length === 2, 'Selected 2 recipients: Jahir and Santhosh');

  // Filter remaining users (must exclude already selected Jahir & Santhosh)
  const remainingSuggestions = eligibleUsers.filter(u => 
    !selectedRecipients.some(r => r._id.toString() === u._id.toString())
  );
  assert(remainingSuggestions.length === eligibleUsers.length - 2, `Remaining suggestions count is ${remainingSuggestions.length}`);
  assert(!remainingSuggestions.some(u => u._id.toString() === jahirRecipient._id.toString()), 'Already selected recipient is excluded from dropdown suggestions');

  // Test Step 5: Conversation Creation & Message Send
  console.log('\n[Step 5] Testing 1-to-1 conversation with Jahir:');
  const directConv = await chatService.getOrCreateConversation(
    adminUser._id,
    [jahirRecipient._id]
  );
  assert(directConv._id != null, `Direct conversation created with ID ${directConv._id}`);
  assert(directConv.type === 'direct', 'Conversation type is direct');

  const testMessageText = `Automated verification message to Jahir at ${new Date().toISOString()}`;
  const { message: sentMessage } = await chatService.sendMessage(adminUser._id, directConv._id, testMessageText);
  assert(sentMessage._id != null, `Message saved with ID ${sentMessage._id}`);
  assert(sentMessage.text === testMessageText, 'Message text matches');
  assert(sentMessage.sender._id.toString() === adminUser._id.toString(), 'Sender is current user');

  // Test Step 6: Group Conversation with multiple recipients
  console.log('\n[Step 6] Testing group conversation with Jahir and Santhosh:');
  const groupConv = await chatService.getOrCreateConversation(
    adminUser._id,
    [jahirRecipient._id, santhoshRecipient._id],
    'Project Alpha Team'
  );
  assert(groupConv._id != null, `Group conversation created with ID ${groupConv._id}`);
  assert(groupConv.type === 'group', 'Conversation type is group');
  assert(groupConv.name === 'Project Alpha Team', 'Group name is set properly');

  const groupMessageText = `Team announcement message at ${new Date().toISOString()}`;
  const { message: sentGroupMessage } = await chatService.sendMessage(adminUser._id, groupConv._id, groupMessageText);
  assert(sentGroupMessage._id != null, `Group message saved with ID ${sentGroupMessage._id}`);
  assert(sentGroupMessage.text === groupMessageText, 'Group message text matches');

  // Step 7: Unread count check
  console.log('\n[Step 7] Testing unread message badge count:');
  const jahirUnread = await chatService.getTotalUnreadCount(jahirRecipient._id);
  console.log(`Jahir has ${jahirUnread} unread message(s)`);
  assert(jahirUnread >= 1, 'Recipient has unread count >= 1 for new messages');

  await mongoose.disconnect();
  console.log('\n🎉 ALL 7 TEST PHASES PASSED WITH ZERO ERRORS!\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
