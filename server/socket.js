const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const chatService = require('./services/chatService');
const { getAllowedOrigins } = require('./config/cors');

// Track online users: Map<userIdString, Set<socketId>>
const onlineUsers = new Map();

const isUserOnline = (userId) => {
  const sockets = onlineUsers.get(userId.toString());
  return !!sockets && sockets.size > 0;
};

const getOnlineUserIds = () => {
  const ids = [];
  for (const [id, sockets] of onlineUsers.entries()) {
    if (sockets && sockets.size > 0) {
      ids.push(id);
    }
  }
  return ids;
};

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      const user = await User.findById(decoded.id)
        .select('-password')
        .populate('role', 'name');

      if (!user || user.isDeleted) {
        return next(new Error('Authentication error: User unauthorized or inactive'));
      }

      socket.user = user;
      return next();
    } catch (error) {
      console.error('Socket authentication failure:', error.message);
      return next(new Error('Authentication error: Server error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    // Add to online tracking
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for targeted alerts and cross-tab syncing
    socket.join(`user:${userId}`);

    // Broadcast user online status
    socket.broadcast.emit('user_status', {
      userId,
      isOnline: true,
    });

    // Send currently online user list to the connected client
    socket.emit('online_users_list', getOnlineUserIds());

    // Send initial unread count
    try {
      const initialUnread = await chatService.getTotalUnreadCount(userId);
      socket.emit('unread_count_updated', { totalUnread: initialUnread });
    } catch (err) {
      console.error('Failed to send initial unread count:', err);
    }

    // Join active conversation room
    socket.on('join_conversation', async ({ conversationId }, callback) => {
      try {
        if (!conversationId) return;

        // Verify membership
        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user._id,
          isDeleted: { $ne: true },
        });

        if (!conv) {
          if (callback) callback({ error: 'Conversation not found or access denied' });
          return;
        }

        socket.join(`conversation:${conversationId}`);

        // Automatically mark as read for this user
        const readResult = await chatService.markConversationAsRead(userId, conversationId);
        const totalUnread = await chatService.getTotalUnreadCount(userId);

        if (readResult.modifiedCount > 0) {
          // Notify conversation room about messages read
          io.to(`conversation:${conversationId}`).emit('messages_read', {
            conversationId,
            readerId: userId,
            readerName: socket.user.name,
            readMessageIds: readResult.readMessageIds,
            readAt: readResult.readAt,
          });

          // Update user's personal unread count
          io.to(`user:${userId}`).emit('unread_count_updated', { totalUnread });
        }

        if (callback) callback({ success: true, totalUnread });
      } catch (err) {
        console.error('Error in join_conversation:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Real-time message sending
    socket.on('send_message', async ({ conversationId, text, tempId }, callback) => {
      try {
        if (!conversationId || !text || !text.trim()) {
          if (callback) callback({ error: 'Conversation ID and message text are required' });
          return;
        }

        const result = await chatService.sendMessage(userId, conversationId, text);
        const { message, conversation } = result;

        // Check which participants are online and mark as delivered
        const deliveryPromises = conversation.participants
          .filter((p) => p.toString() !== userId)
          .map(async (recipientId) => {
            const rIdStr = recipientId.toString();
            if (isUserOnline(rIdStr)) {
              await chatService.markMessageAsDelivered(message._id, rIdStr);
            }
          });

        await Promise.all(deliveryPromises);

        // Fetch refreshed message with updated delivered status
        const updatedMessage = await chatService.getConversationMessages(userId, conversationId, {
          limit: 1,
        });
        const finalMessage = updatedMessage.messages[0] || message;

        // Emit new message to active conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', {
          message: finalMessage,
          conversationId,
          tempId,
        });

        // Broadcast conversation updates and unread counts to each participant concurrently
        await Promise.all(
          conversation.participants.map(async (participantId) => {
            const pIdStr = participantId.toString();
            const isSender = pIdStr === userId;

            if (!isSender) {
              try {
                const recipientUnread = await chatService.getTotalUnreadCount(pIdStr);
                io.to(`user:${pIdStr}`).emit('unread_count_updated', {
                  totalUnread: recipientUnread,
                });
              } catch (e) {
                // ignore
              }

              io.to(`user:${pIdStr}`).emit('conversation_updated', {
                conversationId,
                lastMessage: finalMessage,
                unreadIncrement: 1,
              });
            } else {
              io.to(`user:${pIdStr}`).emit('conversation_updated', {
                conversationId,
                lastMessage: finalMessage,
                unreadIncrement: 0,
              });
            }
          })
        );

        if (callback) {
          callback({ success: true, message: finalMessage, tempId });
        }
      } catch (err) {
        console.error('Error in send_message socket handler:', err);
        if (callback) callback({ error: err.message, tempId });
      }
    });

    // Mark conversation messages as read
    socket.on('mark_read', async ({ conversationId }, callback) => {
      try {
        if (!conversationId) return;

        const result = await chatService.markConversationAsRead(userId, conversationId);
        const totalUnread = await chatService.getTotalUnreadCount(userId);

        if (result.modifiedCount > 0) {
          io.to(`conversation:${conversationId}`).emit('messages_read', {
            conversationId,
            readerId: userId,
            readerName: socket.user.name,
            readMessageIds: result.readMessageIds,
            readAt: result.readAt,
          });

          io.to(`user:${userId}`).emit('unread_count_updated', { totalUnread });
        }

        if (callback) callback({ success: true, totalUnread, modifiedCount: result.modifiedCount });
      } catch (err) {
        console.error('Error in mark_read socket handler:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // Typing indicators
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing_status', {
        conversationId,
        userId,
        userName: socket.user.name,
        isTyping: !!isTyping,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user_status', {
            userId,
            isOnline: false,
          });
        }
      }
    });
  });

  return io;
};

module.exports = {
  initSocket,
  isUserOnline,
  getOnlineUserIds,
};
