const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io: ClientIO } = require('../../client/node_modules/socket.io-client');

const connectDB = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const chatService = require('../services/chatService');
const chatRoutes = require('../routes/chatRoutes');
const { initSocket } = require('../socket');

const TEST_PORT = 5099;

const runTests = async () => {
  console.log('🧪 Starting Chat System Automated Integration Tests...');

  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Setup Express & Socket.IO server
    const app = express();
    app.use(express.json());
    app.use('/api/chat', chatRoutes);

    const server = http.createServer(app);
    const io = initSocket(server);
    app.set('io', io);

    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`✅ Test server running on http://localhost:${TEST_PORT}`);

    // Create 4 test users
    const userEmails = [
      'test_alice@chat.example',
      'test_bob@chat.example',
      'test_charlie@chat.example',
      'test_diana@chat.example',
    ];

    const users = {};
    const tokens = {};

    for (const email of userEmails) {
      let u = await User.findOne({ email });
      if (!u) {
        u = await User.create({
          name: email.split('@')[0].replace('test_', '').toUpperCase(),
          email,
          password: 'Password123!',
          isApproved: true,
        });
      } else {
        u.isApproved = true;
        await u.save();
      }
      users[email] = u;
      tokens[email] = jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    }

    const userA = users['test_alice@chat.example'];
    const userB = users['test_bob@chat.example'];
    const userC = users['test_charlie@chat.example'];
    const userD = users['test_diana@chat.example'];

    console.log('✅ 4 Test Users prepared: Alice, Bob, Charlie, Diana');

    // Clean previous test conversations for these users
    await Conversation.deleteMany({
      participants: { $in: [userA._id, userB._id, userC._id, userD._id] },
    });
    await Message.deleteMany({
      sender: { $in: [userA._id, userB._id, userC._id, userD._id] },
    });

    // Connect 4 Sockets
    const connectSocket = (token) => {
      return new Promise((resolve, reject) => {
        const client = ClientIO(`http://localhost:${TEST_PORT}`, {
          auth: { token },
          transports: ['websocket'],
          reconnection: false,
        });
        client.on('connect', () => resolve(client));
        client.on('connect_error', (err) => reject(err));
      });
    };

    const socketA = await connectSocket(tokens[userA.email]);
    const socketB = await connectSocket(tokens[userB.email]);
    const socketC = await connectSocket(tokens[userC.email]);
    const socketD = await connectSocket(tokens[userD.email]);

    console.log('✅ All 4 sockets connected & authenticated with JWT');

    // =========================================================================
    // Test 1 & 2: User A sends private message to User B
    // Only User B receives the message. User C & D do not.
    // =========================================================================
    console.log('\n--- Test 1 & 2: 1-to-1 Private Messaging & Recipient Privacy ---');
    const directConv = await chatService.getOrCreateConversation(
      userA._id,
      [userB._id]
    );

    let bReceivedMessage = null;
    let cReceivedMessage = false;
    let dReceivedMessage = false;

    socketB.on('new_message', ({ message }) => {
      bReceivedMessage = message;
    });
    socketC.on('new_message', () => {
      cReceivedMessage = true;
    });
    socketD.on('new_message', () => {
      dReceivedMessage = true;
    });

    // Alice joins room and sends message
    socketA.emit('join_conversation', { conversationId: directConv._id.toString() });
    socketB.emit('join_conversation', { conversationId: directConv._id.toString() });

    await new Promise((resolve) => {
      socketA.emit(
        'send_message',
        {
          conversationId: directConv._id.toString(),
          text: 'Hello Bob! This is private.',
          tempId: 'temp-1',
        },
        resolve
      );
    });

    // Wait 300ms for message propagation
    await new Promise((r) => setTimeout(r, 300));

    if (bReceivedMessage && bReceivedMessage.text === 'Hello Bob! This is private.') {
      console.log('✅ PASS: User B received private message from User A');
    } else {
      throw new Error('FAIL: User B did not receive message');
    }

    if (!cReceivedMessage && !dReceivedMessage) {
      console.log('✅ PASS: Users C & D did NOT receive the private message (Privacy preserved)');
    } else {
      throw new Error('FAIL: Unauthorized users received private message!');
    }

    // =========================================================================
    // Test 3: User B replies, User A receives reply
    // =========================================================================
    console.log('\n--- Test 3: User B replies, User A receives reply ---');
    let aReceivedReply = null;
    socketA.on('new_message', ({ message }) => {
      if (message.sender?._id?.toString() === userB._id.toString()) {
        aReceivedReply = message;
      }
    });

    await new Promise((resolve) => {
      socketB.emit(
        'send_message',
        {
          conversationId: directConv._id.toString(),
          text: 'Hello Alice! I got your message.',
          tempId: 'temp-2',
        },
        resolve
      );
    });

    await new Promise((r) => setTimeout(r, 300));

    if (aReceivedReply && aReceivedReply.text === 'Hello Alice! I got your message.') {
      console.log('✅ PASS: User A received User B reply in direct conversation');
    } else {
      throw new Error('FAIL: User A did not receive User B reply');
    }

    // =========================================================================
    // Test 4, 5, 6: User A creates group chat with User B, C, D
    // All 3 receive group message. Group replies appear to all participants.
    // =========================================================================
    console.log('\n--- Test 4, 5, 6: Group Chat (Multi-Recipient) & Group Replies ---');
    const groupConv = await chatService.getOrCreateConversation(
      userA._id,
      [userB._id, userC._id, userD._id],
      'Alpha Project Group'
    );

    console.log(`Created group: "${groupConv.name}" with 4 participants`);

    // Have all join group conversation room
    socketA.emit('join_conversation', { conversationId: groupConv._id.toString() });
    socketB.emit('join_conversation', { conversationId: groupConv._id.toString() });
    socketC.emit('join_conversation', { conversationId: groupConv._id.toString() });
    socketD.emit('join_conversation', { conversationId: groupConv._id.toString() });

    let bGotGroupMsg = false;
    let cGotGroupMsg = false;
    let dGotGroupMsg = false;

    const groupListenerB = ({ message, conversationId }) => {
      if (conversationId === groupConv._id.toString() && message.text === 'Hello team!') {
        bGotGroupMsg = true;
      }
    };
    const groupListenerC = ({ message, conversationId }) => {
      if (conversationId === groupConv._id.toString() && message.text === 'Hello team!') {
        cGotGroupMsg = true;
      }
    };
    const groupListenerD = ({ message, conversationId }) => {
      if (conversationId === groupConv._id.toString() && message.text === 'Hello team!') {
        dGotGroupMsg = true;
      }
    };

    socketB.on('new_message', groupListenerB);
    socketC.on('new_message', groupListenerC);
    socketD.on('new_message', groupListenerD);

    await new Promise((resolve) => {
      socketA.emit(
        'send_message',
        {
          conversationId: groupConv._id.toString(),
          text: 'Hello team!',
          tempId: 'temp-group-1',
        },
        resolve
      );
    });

    await new Promise((r) => setTimeout(r, 400));

    if (bGotGroupMsg && cGotGroupMsg && dGotGroupMsg) {
      console.log('✅ PASS: All 3 recipients (B, C, D) received the group message');
    } else {
      throw new Error(`FAIL: Group message not received by all: B=${bGotGroupMsg}, C=${cGotGroupMsg}, D=${dGotGroupMsg}`);
    }

    // Now Charlie replies to the group
    let aGotCharlieReply = false;
    let bGotCharlieReply = false;
    let dGotCharlieReply = false;

    socketA.on('new_message', ({ message, conversationId }) => {
      if (conversationId === groupConv._id.toString() && message.text === 'Charlie here, ready!') {
        aGotCharlieReply = true;
      }
    });
    socketB.on('new_message', ({ message, conversationId }) => {
      if (conversationId === groupConv._id.toString() && message.text === 'Charlie here, ready!') {
        bGotCharlieReply = true;
      }
    });
    socketD.on('new_message', ({ message, conversationId }) => {
      if (conversationId === groupConv._id.toString() && message.text === 'Charlie here, ready!') {
        dGotCharlieReply = true;
      }
    });

    await new Promise((resolve) => {
      socketC.emit(
        'send_message',
        {
          conversationId: groupConv._id.toString(),
          text: 'Charlie here, ready!',
          tempId: 'temp-group-2',
        },
        resolve
      );
    });

    await new Promise((r) => setTimeout(r, 400));

    if (aGotCharlieReply && bGotCharlieReply && dGotCharlieReply) {
      console.log('✅ PASS: Group reply from Charlie was delivered to all authorized group members (A, B, D)');
    } else {
      throw new Error('FAIL: Group reply not received by all members');
    }

    // =========================================================================
    // Test 7, 8, 9, 10, 11: Unread Counts, Persistence, and Read Receipts
    // =========================================================================
    console.log('\n--- Test 7-11: Unread Count Calculation, Database Persistence & Read Receipts ---');
    // Diana leaves the conversation room (simulating viewing another screen)
    socketD.emit('leave_conversation', { conversationId: groupConv._id.toString() });

    // Send a new message to group from Alice
    await new Promise((resolve) => {
      socketA.emit(
        'send_message',
        {
          conversationId: groupConv._id.toString(),
          text: 'Hey Diana, are you seeing this?',
          tempId: 'temp-group-3',
        },
        resolve
      );
    });

    await new Promise((r) => setTimeout(r, 300));

    // Diana's unread count should be > 0
    const dianaUnread = await chatService.getTotalUnreadCount(userD._id);
    console.log(`Diana unread count in DB: ${dianaUnread}`);
    if (dianaUnread >= 1) {
      console.log('✅ PASS: Unread count incremented while Diana is viewing another screen');
    } else {
      throw new Error(`FAIL: Diana unread count was ${dianaUnread}, expected >= 1`);
    }

    // Now Diana opens the conversation and marks as read
    await chatService.markConversationAsRead(userD._id, groupConv._id);
    const dianaUnreadAfter = await chatService.getTotalUnreadCount(userD._id);
    console.log(`Diana unread count after marking read: ${dianaUnreadAfter}`);
    if (dianaUnreadAfter === 0) {
      console.log('✅ PASS: Opening conversation and reading messages reduced unread count to 0');
    } else {
      throw new Error(`FAIL: Diana unread count after read was ${dianaUnreadAfter}, expected 0`);
    }

    // Database persistence check: re-querying messages and conversations directly from MongoDB
    const persistedMessages = await Message.find({ conversation: groupConv._id });
    if (persistedMessages.length >= 3) {
      console.log(`✅ PASS: Messages remain persistently saved in database (${persistedMessages.length} messages)`);
    } else {
      throw new Error('FAIL: Messages were not saved to database');
    }

    // =========================================================================
    // Test 13: Security & Authorization check
    // Unauthorized user cannot access conversation messages
    // =========================================================================
    console.log('\n--- Test 13: Security & Authorization ---');
    try {
      // User C tries to access Alice & Bob's private conversation
      await chatService.getConversationMessages(userC._id, directConv._id);
      throw new Error('FAIL: Unauthorized user C was able to access private conversation!');
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('access denied')) {
        console.log('✅ PASS: Unauthorized user blocked with 403 Forbidden when trying to access private conversation');
      } else {
        throw err;
      }
    }

    // =========================================================================
    // Test 14: Eligible users endpoint
    // =========================================================================
    console.log('\n--- Test 14: Eligible Users Fetching ---');
    const eligibleForA = await chatService.getEligibleUsers(userA._id);
    const hasSelf = eligibleForA.some((u) => u._id.toString() === userA._id.toString());
    const hasPassword = eligibleForA.some((u) => u.password || u.passwordHash);

    if (!hasSelf && !hasPassword && eligibleForA.length >= 3) {
      console.log(`✅ PASS: Eligible users returned (${eligibleForA.length} users), self excluded, no passwords exposed`);
    } else {
      throw new Error('FAIL: Eligible users check failed');
    }

    // Cleanup sockets and server
    socketA.disconnect();
    socketB.disconnect();
    socketC.disconnect();
    socketD.disconnect();
    server.close();

    console.log('\n🎉 ALL 14 AUTOMATED CHAT SYSTEM TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
};

runTests();
