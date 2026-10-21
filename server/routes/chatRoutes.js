const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes require authentication
router.use(protect);

// Clear All Chats for current user
router.post('/clear-all', clearAllChats);
router.delete('/clear-all', clearAllChats);

router.get('/employees', getEmployees);
router.get('/users', getUsers);
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

// Clear conversation history for current user
router.post('/conversations/clear-bulk', clearConversationsBulk);
router.delete('/conversations/clear-bulk', clearConversationsBulk);
router.post('/conversations/:id/clear', clearConversation);
router.delete('/conversations/:id/clear', clearConversation);

// Delete conversation for everyone
router.post('/conversations/:id/for-everyone', deleteConversationForEveryone);
router.delete('/conversations/:id/for-everyone', deleteConversationForEveryone);
router.delete('/conversations/:id', deleteConversationForEveryone);

// Delete for Me routes (single & bulk)
router.delete('/conversations/:id/messages/delete-for-me', deleteMessagesBulkForMe);
router.post('/conversations/:id/messages/delete-for-me', deleteMessagesBulkForMe);
router.delete('/conversations/:id/messages/:messageId/delete-for-me', deleteMessageForMe);
router.post('/conversations/:id/messages/:messageId/delete-for-me', deleteMessageForMe);

// Delete for Everyone routes (single & bulk)
router.delete('/conversations/:id/messages/delete-for-everyone', deleteMessagesBulkForEveryone);
router.post('/conversations/:id/messages/delete-for-everyone', deleteMessagesBulkForEveryone);
router.delete('/conversations/:id/messages/:messageId/delete-for-everyone', deleteMessageForEveryone);
router.post('/conversations/:id/messages/:messageId/delete-for-everyone', deleteMessageForEveryone);

// Permanent delete routes (backward compatibility)
router.delete('/conversations/:id/messages/bulk', deleteMessagesBulk);
router.post('/conversations/:id/messages/bulk-delete', deleteMessagesBulk);
router.delete('/conversations/:id/messages/:messageId', deleteMessage);

router.put('/conversations/:id/read', markConversationRead);
router.get('/unread-count', getUnreadCount);

module.exports = router;
