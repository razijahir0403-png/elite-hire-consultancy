const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Role = require('../models/Role');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');

/**
 * Fetch all eligible employees from the existing Employees database table
 * Excludes currently logged-in employee and soft-deleted records.
 * Uses `employeeName` as the primary display name.
 * Reliable mapping between Employee records and authenticated User accounts.
 */
const getEligibleEmployees = async (currentUserId, currentUserEmail) => {
  let currentEmail = (currentUserEmail || '').trim().toLowerCase();
  let currentEmpId = null;

  if (currentUserId && !currentEmail) {
    try {
      const userDoc = await User.findById(currentUserId).select('email').lean();
      if (userDoc?.email) {
        currentEmail = userDoc.email.trim().toLowerCase();
      }
    } catch (e) {
      // ignore
    }
  }

  // 1. Fetch all active employees from the existing Employees collection
  const employees = await Employee.find({
    isDeleted: { $ne: true },
  })
    .select('_id employeeCode employeeName email domain contactNumber bloodGroup createdAt')
    .sort({ employeeName: 1 })
    .lean();

  if (currentEmail) {
    const matchingCurrent = employees.find(
      (e) => (e.email || '').trim().toLowerCase() === currentEmail
    );
    if (matchingCurrent) {
      currentEmpId = matchingCurrent._id.toString();
    }
  }

  // 2. Map/sync Employee records to User authentication accounts
  const emails = employees
    .map((e) => (e.email || '').trim().toLowerCase())
    .filter(Boolean);

  const existingUsers = await User.find({
    email: { $in: emails },
    isDeleted: { $ne: true },
  })
    .select('_id email name')
    .lean();

  const userByEmail = new Map();
  existingUsers.forEach((u) => {
    if (u.email) userByEmail.set(u.email.toLowerCase(), u);
  });

  const eligibleList = [];

  for (const emp of employees) {
    const empEmail = (emp.email || '').trim().toLowerCase();

    // Exclude currently logged-in employee
    if (
      (currentEmpId && emp._id.toString() === currentEmpId) ||
      (currentEmail && empEmail === currentEmail)
    ) {
      continue;
    }

    let mappedUser = empEmail ? userByEmail.get(empEmail) : null;
    if (!mappedUser && empEmail) {
      try {
        const newUser = await User.create({
          name: emp.employeeName,
          email: empEmail,
          password: 'Password123!',
          isApproved: true,
        });
        mappedUser = { _id: newUser._id, email: empEmail, name: emp.employeeName };
        userByEmail.set(empEmail, mappedUser);
      } catch (err) {
        console.error('Error auto-provisioning user for employee:', err);
      }
    } else if (mappedUser && mappedUser.name !== emp.employeeName) {
      User.updateOne({ _id: mappedUser._id }, { name: emp.employeeName }).catch(() => {});
    }

    eligibleList.push({
      _id: mappedUser ? mappedUser._id.toString() : emp._id.toString(),
      employeeId: emp._id.toString(),
      accountId: mappedUser ? mappedUser._id.toString() : emp._id.toString(),
      employeeName: emp.employeeName, // Exact required database field
      name: emp.employeeName,
      email: emp.email || '',
      employeeCode: emp.employeeCode || '',
      domain: emp.domain || '',
      contactNumber: emp.contactNumber || '',
    });
  }

  return eligibleList;
};

// Alias to maintain backward compatibility
const getEligibleUsers = async (currentUserId, currentUserEmail) => {
  return getEligibleEmployees(currentUserId, currentUserEmail);
};

/**
 * Helper to fetch a map of email -> employeeName from the Employees table
 */
const getEmployeeNameMap = async (emails = []) => {
  const normEmails = emails.map((e) => (e || '').toLowerCase()).filter(Boolean);
  if (normEmails.length === 0) return new Map();

  const empDocs = await Employee.find({
    email: { $in: normEmails },
    isDeleted: { $ne: true },
  })
    .select('email employeeName employeeCode')
    .lean();

  const map = new Map();
  empDocs.forEach((e) => {
    if (e.email) {
      map.set(e.email.toLowerCase(), e.employeeName);
    }
  });
  return map;
};

/**
 * Helper to compute the effective cleared cutoff date for a user in a conversation
 */
const getUserCutoffDate = (userId, conversation, userChatClearedAt = null) => {
  const userIdStr = userId.toString();
  let cutoff = null;

  if (userChatClearedAt) {
    cutoff = new Date(userChatClearedAt);
  }

  if (conversation?.clearedBy && Array.isArray(conversation.clearedBy)) {
    const entry = conversation.clearedBy.find(
      (c) => c.user && c.user.toString() === userIdStr
    );
    if (entry && entry.clearedAt) {
      const convClearedAt = new Date(entry.clearedAt);
      if (!cutoff || convClearedAt > cutoff) {
        cutoff = convClearedAt;
      }
    }
  }

  return cutoff;
};

/**
 * Get all conversations for a user with unread counts and employeeName titles
 * Respects user-specific clear history cutoff dates
 */
const getUserConversations = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const userDoc = await User.findById(userObjectId).select('chatClearedAt').lean();
  const globalCutoff = userDoc?.chatClearedAt ? new Date(userDoc.chatClearedAt) : null;

  const conversations = await Conversation.find({
    participants: userObjectId,
    isDeleted: { $ne: true },
    hiddenFor: { $ne: userObjectId },
  })
    .populate('participants', 'name email role')
    .populate('creator', 'name email')
    .populate({
      path: 'lastMessageSender',
      select: 'name email',
    })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  if (conversations.length === 0) {
    return [];
  }

  // Map participant emails to employeeName from the Employees table
  const allParticipantEmails = conversations
    .flatMap((c) => (c.participants || []).map((p) => p.email))
    .filter(Boolean);
  const empNameMap = await getEmployeeNameMap(allParticipantEmails);

  const enrichedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const cutoff = getUserCutoffDate(userId, conv, globalCutoff);

      // Unread count respecting user cutoff
      const unreadMatch = {
        conversation: conv._id,
        sender: { $ne: userObjectId },
        'readBy.user': { $ne: userObjectId },
        isDeleted: { $ne: true },
        deletedFor: { $ne: userObjectId },
      };
      if (cutoff) {
        unreadMatch.createdAt = { $gt: cutoff };
      }
      const unreadCount = await Message.countDocuments(unreadMatch);

      // Find latest visible message for this user (respecting cutoff, deletedFor, isDeleted)
      const latestMatch = {
        conversation: conv._id,
        isDeleted: { $ne: true },
        deletedFor: { $ne: userObjectId },
      };
      if (cutoff) {
        latestMatch.createdAt = { $gt: cutoff };
      }
      const latestVisible = await Message.findOne(latestMatch)
        .sort({ createdAt: -1 })
        .populate('sender', 'name email')
        .lean();

      let lastMsgText = '';
      let lastMsgAt = conv.updatedAt || conv.createdAt;
      let lastMsgSender = null;

      if (latestVisible) {
        lastMsgText = latestVisible.isDeletedForEveryone
          ? 'This message was deleted'
          : latestVisible.text;
        lastMsgAt = latestVisible.createdAt;
        lastMsgSender = latestVisible.sender;
      }

      // Attach employeeName to all participants
      const participantsWithEmployeeName = (conv.participants || []).map((p) => {
        const empName = empNameMap.get((p.email || '').toLowerCase()) || p.name;
        return {
          ...p,
          employeeName: empName,
          name: empName,
        };
      });

      let displayName = conv.name;
      if (conv.type === 'direct') {
        const otherUser = participantsWithEmployeeName.find(
          (p) => p._id.toString() !== userId.toString()
        );
        displayName = otherUser
          ? (otherUser.employeeName || otherUser.name)
          : 'Unknown Employee';
      } else if (!displayName) {
        displayName = participantsWithEmployeeName
          .filter((p) => p._id.toString() !== userId.toString())
          .map((p) => p.employeeName || p.name)
          .join(', ');
      }

      return {
        ...conv,
        lastMessage: latestVisible ? latestVisible._id : null,
        lastMessageText: lastMsgText,
        lastMessageAt: lastMsgAt,
        lastMessageSender: lastMsgSender,
        participants: participantsWithEmployeeName,
        displayName,
        unreadCount,
      };
    })
  );

  return enrichedConversations;
};

/**
 * Get or create a direct or group conversation
 * Supports recipient IDs from either User accounts or Employee records
 */
const getOrCreateConversation = async (userId, recipientIds, groupName = '') => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw new AppError('At least one employee recipient must be specified', 400);
  }

  // Deduplicate and filter out self
  const rawRecipientIds = [
    ...new Set(
      recipientIds
        .map((id) => (id?._id || id)?.toString())
        .filter((id) => id && id !== userId.toString())
    ),
  ];

  if (rawRecipientIds.length === 0) {
    throw new AppError('Cannot create conversation with only yourself', 400);
  }

  // Resolve recipient IDs (handling both User IDs and Employee IDs)
  const resolvedUsers = [];
  for (const idStr of rawRecipientIds) {
    if (!mongoose.Types.ObjectId.isValid(idStr)) continue;
    const objId = new mongoose.Types.ObjectId(idStr);

    let u = await User.findOne({ _id: objId, isDeleted: { $ne: true } }).select('_id name email');
    if (!u) {
      // Check if it's an Employee ID
      const emp = await Employee.findOne({ _id: objId, isDeleted: { $ne: true } });
      if (emp && emp.email) {
        const normEmail = emp.email.trim().toLowerCase();
        u = await User.findOne({ email: normEmail, isDeleted: { $ne: true } }).select('_id name email');
        if (!u) {
          u = await User.create({
            name: emp.employeeName,
            email: normEmail,
            password: 'Password123!',
            isApproved: true,
          });
        }
      }
    }
    if (u && !resolvedUsers.some((ru) => ru._id.toString() === u._id.toString())) {
      resolvedUsers.push(u);
    }
  }

  if (resolvedUsers.length === 0) {
    throw new AppError('None of the specified employee recipients are valid active accounts', 400);
  }

  // Lookup employeeName for all resolved recipients
  const emails = resolvedUsers.map((r) => r.email).filter(Boolean);
  const empNameMap = await getEmployeeNameMap(emails);

  // 1-to-1 conversation
  if (resolvedUsers.length === 1) {
    const targetRecipientId = resolvedUsers[0]._id;

    let existingDirect = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userObjectId, targetRecipientId], $size: 2 },
      isDeleted: { $ne: true },
    })
      .populate('participants', 'name email role')
      .populate('creator', 'name email')
      .populate('lastMessageSender', 'name email');

    if (existingDirect) {
      if (existingDirect.hiddenFor && existingDirect.hiddenFor.some((id) => id.toString() === userObjectId.toString())) {
        await Conversation.updateOne({ _id: existingDirect._id }, { $pull: { hiddenFor: userObjectId } });
      }
      const convObj = existingDirect.toObject();
      const otherUser = convObj.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      const otherEmpName = otherUser
        ? (empNameMap.get((otherUser.email || '').toLowerCase()) || otherUser.name)
        : 'Unknown Employee';

      convObj.displayName = otherEmpName;
      convObj.unreadCount = await Message.countDocuments({
        conversation: existingDirect._id,
        sender: { $ne: userObjectId },
        'readBy.user': { $ne: userObjectId },
        isDeleted: { $ne: true },
      });
      return convObj;
    }

    // Create new direct conversation
    const newConv = await Conversation.create({
      type: 'direct',
      participants: [userObjectId, targetRecipientId],
      creator: userObjectId,
      lastMessageAt: new Date(),
    });

    const populated = await Conversation.findById(newConv._id)
      .populate('participants', 'name email role')
      .populate('creator', 'name email');

    const convObj = populated.toObject();
    const otherUser = convObj.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );
    const otherEmpName = otherUser
      ? (empNameMap.get((otherUser.email || '').toLowerCase()) || otherUser.name)
      : 'Unknown Employee';

    convObj.displayName = otherEmpName;
    convObj.unreadCount = 0;
    return convObj;
  }

  // Group conversation with 2 or more employees
  const allParticipantIds = [
    userObjectId,
    ...resolvedUsers.map((r) => r._id),
  ];

  // Reuse existing group conversation when exact participant set matches
  const existingGroup = await Conversation.findOne({
    type: 'group',
    participants: { $all: allParticipantIds, $size: allParticipantIds.length },
    ...(groupName && groupName.trim() ? { name: groupName.trim() } : {}),
    isDeleted: { $ne: true },
  })
    .populate('participants', 'name email role')
    .populate('creator', 'name email')
    .populate('lastMessageSender', 'name email');

  if (existingGroup) {
    if (existingGroup.hiddenFor && existingGroup.hiddenFor.some((id) => id.toString() === userObjectId.toString())) {
      await Conversation.updateOne({ _id: existingGroup._id }, { $pull: { hiddenFor: userObjectId } });
    }
    const groupObj = existingGroup.toObject();
    groupObj.displayName = existingGroup.name;
    groupObj.unreadCount = await Message.countDocuments({
      conversation: existingGroup._id,
      sender: { $ne: userObjectId },
      'readBy.user': { $ne: userObjectId },
      isDeleted: { $ne: true },
    });
    return groupObj;
  }

  const defaultGroupName =
    (groupName || '').trim() ||
    `Group (${resolvedUsers.map((r) => empNameMap.get((r.email || '').toLowerCase()) || r.name).join(', ')})`;

  const newGroup = await Conversation.create({
    type: 'group',
    name: defaultGroupName,
    participants: allParticipantIds,
    creator: userObjectId,
    lastMessageAt: new Date(),
  });

  const populatedGroup = await Conversation.findById(newGroup._id)
    .populate('participants', 'name email role')
    .populate('creator', 'name email');

  const groupObj = populatedGroup.toObject();
  groupObj.displayName = newGroup.name;
  groupObj.unreadCount = 0;
  return groupObj;
};

/**
 * Get messages for a specific conversation with pagination
 * Enforces participant-only security
 */
const getConversationMessages = async (userId, conversationId, { limit = 50, before } = {}) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);

  // Authorize: check if user is an authorized participant
  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const userDoc = await User.findById(userObjectId).select('chatClearedAt').lean();
  const cutoff = getUserCutoffDate(userId, conversation, userDoc?.chatClearedAt);

  const query = {
    conversation: convObjectId,
    isDeleted: { $ne: true },
    deletedFor: { $ne: userObjectId },
  };

  if (cutoff) {
    query.createdAt = { $gt: cutoff };
  }

  if (before) {
    const beforeDate = new Date(before);
    if (query.createdAt) {
      query.createdAt.$lt = beforeDate;
    } else {
      query.createdAt = { $lt: beforeDate };
    }
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .populate('sender', 'name email')
    .populate('readBy.user', 'name email')
    .populate('deliveredTo.user', 'name email')
    .lean();

  const totalCount = await Message.countDocuments(query);

  // Attach employeeName to message senders and format deleted messages
  const senderEmails = messages.map((m) => m.sender?.email).filter(Boolean);
  const empNameMap = await getEmployeeNameMap(senderEmails);

  messages.forEach((msg) => {
    if (msg.isDeletedForEveryone) {
      msg.text = 'This message was deleted';
    }
    if (msg.sender && msg.sender.email) {
      const empName = empNameMap.get(msg.sender.email.toLowerCase());
      if (empName) {
        msg.sender.employeeName = empName;
        msg.sender.name = empName;
      }
    }
  });

  // Return in chronological order
  messages.reverse();

  return {
    messages,
    hasMore: messages.length === parsedLimit && totalCount > messages.length,
    totalCount,
  };
};

/**
 * Send a message to a conversation
 * Strictly restricted to authorized conversation participants
 */
const sendMessage = async (userId, conversationId, text) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);

  if (!text || !text.trim()) {
    throw new AppError('Message text cannot be empty', 400);
  }

  // Authorize: sender MUST be a participant of this conversation
  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or you are not an authorized participant', 403);
  }

  // Create message
  const message = await Message.create({
    conversation: convObjectId,
    sender: userObjectId,
    text: text.trim(),
    status: 'sent',
    deliveredTo: [],
    readBy: [{ user: userObjectId, readAt: new Date() }],
  });

  // Update conversation lastMessage metadata and unhide for all participants
  conversation.lastMessage = message._id;
  conversation.lastMessageText = text.trim();
  conversation.lastMessageSender = userObjectId;
  conversation.lastMessageAt = message.createdAt;
  conversation.hiddenFor = [];
  await conversation.save();

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name email')
    .populate('readBy.user', 'name email')
    .populate('deliveredTo.user', 'name email')
    .lean();

  // Attach sender employeeName
  if (populatedMessage.sender?.email) {
    const empNameMap = await getEmployeeNameMap([populatedMessage.sender.email]);
    const empName = empNameMap.get(populatedMessage.sender.email.toLowerCase());
    if (empName) {
      populatedMessage.sender.employeeName = empName;
      populatedMessage.sender.name = empName;
    }
  }

  return {
    message: populatedMessage,
    conversation,
  };
};

/**
 * Mark messages in a conversation as read for a user
 */
const markConversationAsRead = async (userId, conversationId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const now = new Date();

  const unreadMessages = await Message.find({
    conversation: convObjectId,
    sender: { $ne: userObjectId },
    'readBy.user': { $ne: userObjectId },
    isDeleted: { $ne: true },
  }).select('_id');

  const unreadIds = unreadMessages.map((m) => m._id);

  if (unreadIds.length > 0) {
    await Message.updateMany(
      { _id: { $in: unreadIds } },
      {
        $push: { readBy: { user: userObjectId, readAt: now } },
        $set: { status: 'read' },
      }
    );
  }

  return {
    modifiedCount: unreadIds.length,
    readMessageIds: unreadIds,
    readAt: now,
  };
};

/**
 * Mark message as delivered for a user
 */
const markMessageAsDelivered = async (messageId, userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const msgObjectId = new mongoose.Types.ObjectId(messageId);

  const message = await Message.findOne({
    _id: msgObjectId,
    'deliveredTo.user': { $ne: userObjectId },
  });

  if (message) {
    message.deliveredTo.push({ user: userObjectId, deliveredAt: new Date() });
    if (message.status === 'sent') {
      message.status = 'delivered';
    }
    await message.save();
  }

  return message;
};

/**
 * Get total unread count for a user across all active conversations
 * Respects user-specific clear history cutoff dates
 */
const getTotalUnreadCount = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const userDoc = await User.findById(userObjectId).select('chatClearedAt').lean();
  const globalCutoff = userDoc?.chatClearedAt ? new Date(userDoc.chatClearedAt) : null;

  const userConversations = await Conversation.find({
    participants: userObjectId,
    isDeleted: { $ne: true },
    hiddenFor: { $ne: userObjectId },
  }).select('_id clearedBy');

  if (userConversations.length === 0) return 0;

  let totalUnread = 0;
  for (const conv of userConversations) {
    const cutoff = getUserCutoffDate(userId, conv, globalCutoff);
    const q = {
      conversation: conv._id,
      sender: { $ne: userObjectId },
      'readBy.user': { $ne: userObjectId },
      isDeleted: { $ne: true },
      deletedFor: { $ne: userObjectId },
    };
    if (cutoff) {
      q.createdAt = { $gt: cutoff };
    }
    const count = await Message.countDocuments(q);
    totalUnread += count;
  }

  return totalUnread;
};

/**
 * Get single conversation by ID with membership check
 * Respects user-specific clear history cutoff dates
 */
const getConversationById = async (userId, conversationId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  })
    .populate('participants', 'name email role')
    .populate('creator', 'name email')
    .populate('lastMessageSender', 'name email')
    .lean();

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const userDoc = await User.findById(userObjectId).select('chatClearedAt').lean();
  const cutoff = getUserCutoffDate(userId, conversation, userDoc?.chatClearedAt);

  // Lookup employeeName
  const emails = (conversation.participants || []).map((p) => p.email).filter(Boolean);
  const empNameMap = await getEmployeeNameMap(emails);

  const enrichedParticipants = (conversation.participants || []).map((p) => {
    const empName = empNameMap.get((p.email || '').toLowerCase()) || p.name;
    return {
      ...p,
      employeeName: empName,
      name: empName,
    };
  });

  let displayName = conversation.name;
  if (conversation.type === 'direct') {
    const otherUser = enrichedParticipants.find(
      (p) => p._id.toString() !== userId.toString()
    );
    displayName = otherUser
      ? (otherUser.employeeName || otherUser.name)
      : 'Unknown Employee';
  }

  const unreadMatch = {
    conversation: convObjectId,
    sender: { $ne: userObjectId },
    'readBy.user': { $ne: userObjectId },
    isDeleted: { $ne: true },
    deletedFor: { $ne: userObjectId },
  };
  if (cutoff) {
    unreadMatch.createdAt = { $gt: cutoff };
  }

  const unreadCount = await Message.countDocuments(unreadMatch);

  // Latest visible message
  const latestMatch = {
    conversation: convObjectId,
    isDeleted: { $ne: true },
    deletedFor: { $ne: userObjectId },
  };
  if (cutoff) {
    latestMatch.createdAt = { $gt: cutoff };
  }
  const latestVisible = await Message.findOne(latestMatch)
    .sort({ createdAt: -1 })
    .populate('sender', 'name email')
    .lean();

  let lastMsgText = '';
  let lastMsgAt = conversation.updatedAt || conversation.createdAt;
  if (latestVisible) {
    lastMsgText = latestVisible.isDeletedForEveryone
      ? 'This message was deleted'
      : latestVisible.text;
    lastMsgAt = latestVisible.createdAt;
  }

  return {
    ...conversation,
    participants: enrichedParticipants,
    displayName,
    unreadCount,
    lastMessage: latestVisible ? latestVisible._id : null,
    lastMessageText: lastMsgText,
    lastMessageAt: lastMsgAt,
  };
};

/**
 * Permanently delete a single message by ID
 * Ensures user is an authorized participant or admin
 * Updates conversation lastMessage if needed
 */
const deleteMessage = async (userId, conversationId, messageId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);
  const msgObjectId = new mongoose.Types.ObjectId(messageId);

  // Authorize: sender or conversation participant
  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const message = await Message.findOne({
    _id: msgObjectId,
    conversation: convObjectId,
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Permanently delete message from the database
  await Message.deleteOne({ _id: msgObjectId });

  // Recalculate conversation's last message if this was the latest
  const latestRemaining = await Message.findOne({
    conversation: convObjectId,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (latestRemaining) {
    conversation.lastMessage = latestRemaining._id;
    conversation.lastMessageText = latestRemaining.text;
    conversation.lastMessageSender = latestRemaining.sender;
    conversation.lastMessageAt = latestRemaining.createdAt;
  } else {
    conversation.lastMessage = null;
    conversation.lastMessageText = '';
    conversation.lastMessageSender = null;
    conversation.lastMessageAt = conversation.createdAt;
  }
  await conversation.save();

  return {
    success: true,
    messageId: messageId.toString(),
    conversationId: conversationId.toString(),
    lastMessage: latestRemaining,
    participants: conversation.participants,
  };
};

/**
 * Permanently delete multiple messages in bulk
 * Ensures user is an authorized participant or admin
 * Updates conversation lastMessage if needed
 */
const deleteMessagesBulk = async (userId, conversationId, messageIds) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw new AppError('No message IDs provided for deletion', 400);
  }

  const validMsgObjectIds = messageIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (validMsgObjectIds.length === 0) {
    throw new AppError('No valid message IDs provided', 400);
  }

  // Authorize: conversation participant
  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  // Permanently delete messages from database
  const deleteResult = await Message.deleteMany({
    _id: { $in: validMsgObjectIds },
    conversation: convObjectId,
  });

  // Recalculate latest remaining message
  const latestRemaining = await Message.findOne({
    conversation: convObjectId,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (latestRemaining) {
    conversation.lastMessage = latestRemaining._id;
    conversation.lastMessageText = latestRemaining.text;
    conversation.lastMessageSender = latestRemaining.sender;
    conversation.lastMessageAt = latestRemaining.createdAt;
  } else {
    conversation.lastMessage = null;
    conversation.lastMessageText = '';
    conversation.lastMessageSender = null;
    conversation.lastMessageAt = conversation.createdAt;
  }
  await conversation.save();

  return {
    success: true,
    deletedCount: deleteResult.deletedCount,
    messageIds: validMsgObjectIds.map((id) => id.toString()),
    conversationId: conversationId.toString(),
    lastMessage: latestRemaining,
    participants: conversation.participants,
  };
};

/**
 * Delete a message for current user only ("Delete for Me")
 * Does not permanently delete the original message from database.
 * Other participants continue to see the original message.
 */
const deleteMessageForMe = async (userId, conversationId, messageId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);
  const msgObjectId = new mongoose.Types.ObjectId(messageId);

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const message = await Message.findOne({
    _id: msgObjectId,
    conversation: convObjectId,
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Add userId to deletedFor array
  await Message.updateOne(
    { _id: msgObjectId },
    { $addToSet: { deletedFor: userObjectId } }
  );

  return {
    success: true,
    messageId: messageId.toString(),
    conversationId: conversationId.toString(),
  };
};

/**
 * Bulk delete messages for current user only ("Delete for Me")
 */
const deleteMessagesBulkForMe = async (userId, conversationId, messageIds) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw new AppError('No message IDs provided', 400);
  }

  const validMsgObjectIds = messageIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (validMsgObjectIds.length === 0) {
    throw new AppError('No valid message IDs provided', 400);
  }

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const result = await Message.updateMany(
    {
      _id: { $in: validMsgObjectIds },
      conversation: convObjectId,
    },
    { $addToSet: { deletedFor: userObjectId } }
  );

  return {
    success: true,
    deletedCount: result.modifiedCount,
    messageIds: validMsgObjectIds.map((id) => id.toString()),
    conversationId: conversationId.toString(),
  };
};

/**
 * Delete a message for all participants ("Delete for Everyone")
 * Restricted to message sender only.
 * Replaces message text with "This message was deleted".
 * Respects configurable time limit (default 48 hours).
 */
const deleteMessageForEveryone = async (userId, conversationId, messageId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);
  const msgObjectId = new mongoose.Types.ObjectId(messageId);

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const message = await Message.findOne({
    _id: msgObjectId,
    conversation: convObjectId,
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Security: ONLY sender can delete for everyone
  if (message.sender.toString() !== userObjectId.toString()) {
    throw new AppError('You can only delete your own messages for everyone', 403);
  }

  // Check configurable time limit
  const limitHours = parseFloat(process.env.DELETE_FOR_EVERYONE_TIME_LIMIT_HOURS || '48');
  if (limitHours > 0) {
    const ageHours = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > limitHours) {
      throw new AppError(
        `Messages can only be deleted for everyone within ${limitHours} hours of sending`,
        400
      );
    }
  }

  // Idempotent: already deleted for everyone
  if (message.isDeletedForEveryone) {
    return {
      success: true,
      messageId: messageId.toString(),
      conversationId: conversationId.toString(),
      alreadyDeleted: true,
      participants: conversation.participants,
    };
  }

  // Replace text with placeholder and mark deleted for everyone
  message.isDeletedForEveryone = true;
  message.deletedForEveryoneAt = new Date();
  message.text = 'This message was deleted';
  await message.save();

  // Update conversation lastMessageText if this was the latest message
  if (conversation.lastMessage?.toString() === message._id.toString()) {
    conversation.lastMessageText = 'This message was deleted';
    await conversation.save();
  }

  return {
    success: true,
    messageId: messageId.toString(),
    conversationId: conversationId.toString(),
    participants: conversation.participants,
    message,
  };
};

/**
 * Bulk delete messages for all participants ("Delete for Everyone")
 * All specified messages must have been sent by current user.
 */
const deleteMessagesBulkForEveryone = async (userId, conversationId, messageIds) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw new AppError('No message IDs provided', 400);
  }

  const validMsgObjectIds = messageIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (validMsgObjectIds.length === 0) {
    throw new AppError('No valid message IDs provided', 400);
  }

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  const messages = await Message.find({
    _id: { $in: validMsgObjectIds },
    conversation: convObjectId,
  });

  // Verify ownership: all messages must be sent by current user
  const nonOwned = messages.filter((m) => m.sender.toString() !== userObjectId.toString());
  if (nonOwned.length > 0) {
    throw new AppError('You can only delete your own messages for everyone', 403);
  }

  // Check configurable time limit
  const limitHours = parseFloat(process.env.DELETE_FOR_EVERYONE_TIME_LIMIT_HOURS || '48');
  if (limitHours > 0) {
    const expired = messages.filter(
      (m) => (Date.now() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60) > limitHours
    );
    if (expired.length > 0) {
      throw new AppError(
        `Some selected messages are older than ${limitHours} hours and cannot be deleted for everyone`,
        400
      );
    }
  }

  await Message.updateMany(
    {
      _id: { $in: validMsgObjectIds },
      conversation: convObjectId,
    },
    {
      $set: {
        isDeletedForEveryone: true,
        deletedForEveryoneAt: new Date(),
        text: 'This message was deleted',
      },
    }
  );

  if (
    conversation.lastMessage &&
    validMsgObjectIds.some((id) => id.toString() === conversation.lastMessage.toString())
  ) {
    conversation.lastMessageText = 'This message was deleted';
    await conversation.save();
  }

  return {
    success: true,
    deletedCount: messages.length,
    messageIds: validMsgObjectIds.map((id) => id.toString()),
    conversationId: conversationId.toString(),
    participants: conversation.participants,
  };
};

/**
 * Clear all chats for the current user across individual & group conversations
 * Preserves other participants' history completely.
 * Resets user's unread counts, clears message history, and sets cutoff timestamp.
 */
const clearAllChats = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  // 1. Update user chatClearedAt timestamp
  await User.findByIdAndUpdate(userObjectId, { chatClearedAt: now });

  // 2. Find all active conversations user is a participant in
  const userConversations = await Conversation.find({
    participants: userObjectId,
    isDeleted: { $ne: true },
  }).select('_id');

  const convIds = userConversations.map((c) => c._id);

    if (convIds.length > 0) {
    // 3. Update clearedBy on each conversation concurrently
    await Promise.all(
      convIds.map(async (convId) => {
        await Conversation.updateOne(
          { _id: convId, 'clearedBy.user': userObjectId },
          { $set: { 'clearedBy.$.clearedAt': now } }
        );
        await Conversation.updateOne(
          { _id: convId, 'clearedBy.user': { $ne: userObjectId } },
          { $push: { clearedBy: { user: userObjectId, clearedAt: now } } }
        );
      })
    );

    // Hide all cleared conversations from user's list
    await Conversation.updateMany(
      { _id: { $in: convIds } },
      { $addToSet: { hiddenFor: userObjectId } }
    );

    // 4. Mark all existing messages as deletedFor this user
    await Message.updateMany(
      {
        conversation: { $in: convIds },
        deletedFor: { $ne: userObjectId },
      },
      {
        $addToSet: { deletedFor: userObjectId },
      }
    );
  }

  return {
    success: true,
    clearedAt: now,
    clearedConversationsCount: convIds.length,
  };
};

/**
 * Clear message history for current user in a single conversation
 * Preserves other participants' history completely.
 */
const clearConversation = async (userId, conversationId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);
  const now = new Date();

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  // 1. Update clearedBy entry on conversation
  await Conversation.updateOne(
    { _id: convObjectId, 'clearedBy.user': userObjectId },
    { $set: { 'clearedBy.$.clearedAt': now } }
  );
  await Conversation.updateOne(
    { _id: convObjectId, 'clearedBy.user': { $ne: userObjectId } },
    { $push: { clearedBy: { user: userObjectId, clearedAt: now } } }
  );

  // 2. Hide conversation from user's list
  await Conversation.updateOne(
    { _id: convObjectId },
    { $addToSet: { hiddenFor: userObjectId } }
  );

  // 3. Add userId to deletedFor of all messages currently in this conversation
  const result = await Message.updateMany(
    {
      conversation: convObjectId,
      deletedFor: { $ne: userObjectId },
    },
    {
      $addToSet: { deletedFor: userObjectId },
    }
  );

  return {
    success: true,
    conversationId: conversationId.toString(),
    clearedAt: now,
    clearedMessagesCount: result.modifiedCount,
  };
};

/**
 * Clear multiple selected conversations for current user
 */
const clearConversationsBulk = async (userId, conversationIds) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    throw new AppError('No conversation IDs provided', 400);
  }

  const validConvObjectIds = conversationIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (validConvObjectIds.length === 0) {
    throw new AppError('No valid conversation IDs provided', 400);
  }

  // 1. Update clearedBy on each conversation concurrently
  await Promise.all(
    validConvObjectIds.map(async (convId) => {
      await Conversation.updateOne(
        { _id: convId, participants: userObjectId, 'clearedBy.user': userObjectId },
        { $set: { 'clearedBy.$.clearedAt': now } }
      );
      await Conversation.updateOne(
        { _id: convId, participants: userObjectId, 'clearedBy.user': { $ne: userObjectId } },
        { $push: { clearedBy: { user: userObjectId, clearedAt: now } } }
      );
    })
  );

  // 2. Hide selected conversations for this user
  await Conversation.updateMany(
    { _id: { $in: validConvObjectIds }, participants: userObjectId },
    { $addToSet: { hiddenFor: userObjectId } }
  );

  // 3. Mark messages as deletedFor this user
  const result = await Message.updateMany(
    {
      conversation: { $in: validConvObjectIds },
      deletedFor: { $ne: userObjectId },
    },
    {
      $addToSet: { deletedFor: userObjectId },
    }
  );

  return {
    success: true,
    clearedCount: validConvObjectIds.length,
    conversationIds: validConvObjectIds.map((id) => id.toString()),
    clearedMessagesCount: result.modifiedCount,
    clearedAt: now,
  };
};

/**
 * Delete a conversation and all its messages for everyone (Destructive admin / creator action)
 * Restricted to Admins, group creators, or 1-to-1 conversation participants.
 */
const deleteConversationForEveryone = async (userId, conversationId, userRole = '') => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const convObjectId = new mongoose.Types.ObjectId(conversationId);
  const now = new Date();

  const conversation = await Conversation.findOne({
    _id: convObjectId,
    participants: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!conversation) {
    throw new AppError('Conversation not found or access denied', 403);
  }

  // Permission check: Admin OR creator OR direct 1-to-1 conversation
  const isAdmin = ['admin', 'Admin', 'ADMIN'].includes(userRole);
  const isCreator = conversation.creator && conversation.creator.toString() === userObjectId.toString();
  const isDirect = conversation.type === 'direct';

  if (!isAdmin && !isCreator && !isDirect) {
    throw new AppError('Only an admin or the group creator can delete this conversation for everyone', 403);
  }

  // Soft delete conversation
  conversation.isDeleted = true;
  conversation.deletedAt = now;
  conversation.deletedBy = userObjectId;
  await conversation.save();

  // Mark all messages as deleted
  await Message.updateMany(
    { conversation: convObjectId },
    { $set: { isDeleted: true } }
  );

  return {
    success: true,
    conversationId: conversationId.toString(),
    participants: conversation.participants,
    deletedAt: now,
  };
};

module.exports = {
  getEligibleEmployees,
  getEligibleUsers,
  getUserConversations,
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  markMessageAsDelivered,
  getTotalUnreadCount,
  getConversationById,
  deleteMessage,
  deleteMessagesBulk,
  deleteMessageForMe,
  deleteMessagesBulkForMe,
  deleteMessageForEveryone,
  deleteMessagesBulkForEveryone,
  clearAllChats,
  clearConversation,
  clearConversationsBulk,
  deleteConversationForEveryone,
};
