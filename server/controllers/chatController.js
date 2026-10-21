const asyncHandler = require('../utils/asyncHandler');
const chatService = require('../services/chatService');

const getEmployees = asyncHandler(async (req, res) => {
  const employees = await chatService.getEligibleEmployees(req.user._id, req.user.email);
  res.json({
    success: true,
    data: employees,
    employees: employees,
    users: employees,
    total: employees.length,
  });
});

const getUsers = getEmployees;

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.getUserConversations(req.user._id);
  res.json({
    success: true,
    data: conversations,
  });
});

const getConversation = asyncHandler(async (req, res) => {
  const conversation = await chatService.getConversationById(
    req.user._id,
    req.params.id
  );
  res.json({
    success: true,
    data: conversation,
  });
});

const createConversation = asyncHandler(async (req, res) => {
  const { recipientIds, groupName } = req.body;
  const conversation = await chatService.getOrCreateConversation(
    req.user._id,
    recipientIds,
    groupName
  );
  res.status(201).json({
    success: true,
    data: conversation,
  });
});

const getMessages = asyncHandler(async (req, res) => {
  const { limit, before } = req.query;
  const result = await chatService.getConversationMessages(
    req.user._id,
    req.params.id,
    { limit, before }
  );
  res.json({
    success: true,
    data: result.messages,
    hasMore: result.hasMore,
    totalCount: result.totalCount,
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const conversationId = req.params.id;
  const result = await chatService.sendMessage(
    req.user._id,
    conversationId,
    text
  );

  // Broadcast via Socket.IO if attached to req.app
  const io = req.app.get('io');
  if (io) {
    const { message, conversation } = result;

    // Emit to conversation room
    io.to(`conversation:${conversationId}`).emit('new_message', {
      message,
      conversationId,
    });

    // Notify each participant individually to update their unread badge and conversation list
    await Promise.all(
      conversation.participants.map(async (participantId) => {
        const pIdStr = participantId.toString();
        const isSender = pIdStr === req.user._id.toString();

        if (!isSender) {
          try {
            // Compute new unread count for recipient
            const recipientUnread = await chatService.getTotalUnreadCount(pIdStr);
            io.to(`user:${pIdStr}`).emit('unread_count_updated', {
              totalUnread: recipientUnread,
            });
          } catch (e) {
            // ignore
          }

          io.to(`user:${pIdStr}`).emit('conversation_updated', {
            conversationId,
            lastMessage: message,
            unreadIncrement: 1,
          });
        } else {
          io.to(`user:${pIdStr}`).emit('conversation_updated', {
            conversationId,
            lastMessage: message,
            unreadIncrement: 0,
          });
        }
      })
    );
  }

  res.status(201).json({
    success: true,
    data: result.message,
  });
});

const markConversationRead = asyncHandler(async (req, res) => {
  const conversationId = req.params.id;
  const result = await chatService.markConversationAsRead(
    req.user._id,
    conversationId
  );

  const totalUnread = await chatService.getTotalUnreadCount(req.user._id);

  // Broadcast via Socket.IO
  const io = req.app.get('io');
  if (io) {
    // Notify sender of messages that they have been read
    io.to(`conversation:${conversationId}`).emit('messages_read', {
      conversationId,
      readerId: req.user._id.toString(),
      readerName: req.user.name,
      readMessageIds: result.readMessageIds,
      readAt: result.readAt,
    });

    // Update user's unread count
    io.to(`user:${req.user._id.toString()}`).emit('unread_count_updated', {
      totalUnread,
    });
  }

  res.json({
    success: true,
    modifiedCount: result.modifiedCount,
    totalUnread,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const totalUnread = await chatService.getTotalUnreadCount(req.user._id);
  res.json({
    success: true,
    totalUnread,
  });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { id: conversationId, messageId } = req.params;
  const result = await chatService.deleteMessage(req.user._id, conversationId, messageId);

  // Broadcast via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversationId}`).emit('messages_deleted', {
      conversationId,
      messageIds: [result.messageId],
      lastMessage: result.lastMessage,
    });

    // Notify participants so sidebar lastMessage updates immediately
    if (result.participants) {
      result.participants.forEach((pId) => {
        io.to(`user:${pId.toString()}`).emit('conversation_updated', {
          conversationId,
          lastMessage: result.lastMessage,
          unreadIncrement: 0,
        });
      });
    }
  }

  res.json({
    success: true,
    message: 'Message permanently deleted',
    messageId: result.messageId,
  });
});

const deleteMessagesBulk = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { messageIds } = req.body;
  const result = await chatService.deleteMessagesBulk(req.user._id, conversationId, messageIds);

  // Broadcast via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversationId}`).emit('messages_deleted', {
      conversationId,
      messageIds: result.messageIds,
      lastMessage: result.lastMessage,
    });

    if (result.participants) {
      result.participants.forEach((pId) => {
        io.to(`user:${pId.toString()}`).emit('conversation_updated', {
          conversationId,
          lastMessage: result.lastMessage,
          unreadIncrement: 0,
        });
      });
    }
  }

  res.json({
    success: true,
    message: `${result.deletedCount} message${result.deletedCount === 1 ? '' : 's'} permanently deleted`,
    deletedCount: result.deletedCount,
    messageIds: result.messageIds,
  });
});

const deleteMessageForMe = asyncHandler(async (req, res) => {
  const { id: conversationId, messageId } = req.params;
  const result = await chatService.deleteMessageForMe(req.user._id, conversationId, messageId);

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user._id.toString()}`).emit('message_deleted_for_me', {
      conversationId,
      messageId: result.messageId,
    });
  }

  res.json({
    success: true,
    message: 'Message deleted for you',
    messageId: result.messageId,
  });
});

const deleteMessagesBulkForMe = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { messageIds } = req.body;
  const result = await chatService.deleteMessagesBulkForMe(req.user._id, conversationId, messageIds);

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user._id.toString()}`).emit('messages_deleted_for_me', {
      conversationId,
      messageIds: result.messageIds,
    });
  }

  res.json({
    success: true,
    message: `${result.deletedCount} message${result.deletedCount === 1 ? '' : 's'} deleted for you`,
    deletedCount: result.deletedCount,
    messageIds: result.messageIds,
  });
});

const deleteMessageForEveryone = asyncHandler(async (req, res) => {
  const { id: conversationId, messageId } = req.params;
  const result = await chatService.deleteMessageForEveryone(req.user._id, conversationId, messageId);

  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message_deleted_for_everyone', {
      conversationId,
      messageId: result.messageId,
    });

    if (result.participants) {
      result.participants.forEach((pId) => {
        io.to(`user:${pId.toString()}`).emit('conversation_updated', {
          conversationId,
          lastMessage: { text: 'This message was deleted' },
          unreadIncrement: 0,
        });
      });
    }
  }

  res.json({
    success: true,
    message: 'Message deleted for everyone',
    messageId: result.messageId,
  });
});

const deleteMessagesBulkForEveryone = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { messageIds } = req.body;
  const result = await chatService.deleteMessagesBulkForEveryone(req.user._id, conversationId, messageIds);

  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversationId}`).emit('messages_deleted_for_everyone', {
      conversationId,
      messageIds: result.messageIds,
    });

    if (result.participants) {
      result.participants.forEach((pId) => {
        io.to(`user:${pId.toString()}`).emit('conversation_updated', {
          conversationId,
          lastMessage: { text: 'This message was deleted' },
          unreadIncrement: 0,
        });
      });
    }
  }

  res.json({
    success: true,
    message: `${result.deletedCount} message${result.deletedCount === 1 ? '' : 's'} deleted for everyone`,
    deletedCount: result.deletedCount,
    messageIds: result.messageIds,
  });
});

const clearAllChats = asyncHandler(async (req, res) => {
  const result = await chatService.clearAllChats(req.user._id);

  const io = req.app.get('io');
  if (io) {
    // Notify ONLY the current user across all active sessions/tabs
    io.to(`user:${req.user._id.toString()}`).emit('chats_cleared', {
      userId: req.user._id.toString(),
      clearedAt: result.clearedAt,
    });
    io.to(`user:${req.user._id.toString()}`).emit('unread_count_updated', {
      totalUnread: 0,
    });
  }

  res.json({
    success: true,
    message: 'All chats have been cleared for you successfully',
    data: result,
  });
});

const clearConversation = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const result = await chatService.clearConversation(req.user._id, conversationId);

  const io = req.app.get('io');
  if (io) {
    // Notify ONLY the current user
    io.to(`user:${req.user._id.toString()}`).emit('conversation_cleared', {
      conversationId,
      clearedAt: result.clearedAt,
    });
    const unread = await chatService.getTotalUnreadCount(req.user._id);
    io.to(`user:${req.user._id.toString()}`).emit('unread_count_updated', {
      totalUnread: unread,
    });
  }

  res.json({
    success: true,
    message: 'Chat history cleared for you successfully',
    data: result,
  });
});

const clearConversationsBulk = asyncHandler(async (req, res) => {
  const { conversationIds } = req.body;
  const result = await chatService.clearConversationsBulk(req.user._id, conversationIds);

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user._id.toString()}`).emit('conversations_cleared', {
      conversationIds: result.conversationIds,
      clearedAt: result.clearedAt,
    });
    const unread = await chatService.getTotalUnreadCount(req.user._id);
    io.to(`user:${req.user._id.toString()}`).emit('unread_count_updated', {
      totalUnread: unread,
    });
  }

  res.json({
    success: true,
    message: `${result.clearedCount} conversation${result.clearedCount === 1 ? '' : 's'} cleared successfully`,
    data: result,
  });
});

const deleteConversationForEveryone = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const userRole = req.user?.role?.name || req.user?.role || '';
  const result = await chatService.deleteConversationForEveryone(req.user._id, conversationId, userRole);

  const io = req.app.get('io');
  if (io) {
    // Broadcast to conversation room and to all participants' rooms
    io.to(`conversation:${conversationId}`).emit('conversation_deleted_for_everyone', {
      conversationId,
    });

    if (result.participants) {
      await Promise.all(
        result.participants.map(async (pId) => {
          const pIdStr = pId.toString();
          io.to(`user:${pIdStr}`).emit('conversation_deleted_for_everyone', {
            conversationId,
          });
          try {
            const unread = await chatService.getTotalUnreadCount(pIdStr);
            io.to(`user:${pIdStr}`).emit('unread_count_updated', {
              totalUnread: unread,
            });
          } catch (e) {
            // ignore
          }
        })
      );
    }
  }

  res.json({
    success: true,
    message: 'Conversation and all messages deleted for everyone successfully',
    data: result,
  });
});

module.exports = {
  getEmployees,
  getUsers,
  getConversations,
  getConversation,
  createConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  getUnreadCount,
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
