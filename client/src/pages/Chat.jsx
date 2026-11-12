import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Send,
  Plus,
  Users,
  User,
  ArrowLeft,
  Check,
  CheckCheck,
  X,
  MessageSquare,
  Bell,
  AlertCircle,
  RotateCw,
  Trash2,
  MoreVertical,
  Ban,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../context/ChatContext';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';

// Date/time formatting helpers
const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatConversationTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const getDateDividerLabel = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

// Generates a deterministic pleasant pastel background color from a string
const getAvatarColor = (str = '') => {
  const colors = [
    'from-teal-600 to-cyan-700',
    'from-emerald-600 to-teal-700',
    'from-blue-600 to-indigo-700',
    'from-violet-600 to-purple-700',
    'from-rose-600 to-pink-700',
    'from-amber-600 to-orange-700',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const Chat = () => {
  const { user } = useAuth();
  const {
    socket,
    isConnected,
    setActiveConversationId,
    refreshUnreadCount,
    isUserOnline,
    notificationPermission,
    requestNotificationPermission,
  } = useChat();

  // Conversations and system users state
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedMessage, setFailedMessage] = useState(null);

  // Recipient selection & dynamic search suggestions state
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [highlightedUserIndex, setHighlightedUserIndex] = useState(-1);
  const highlightedItemRef = useRef(null);

  // New Chat Modal state (Employees database source)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSelectedEmployees, setModalSelectedEmployees] = useState([]);
  const [modalGroupName, setModalGroupName] = useState('');

  // Message Selection & Deletion state
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    mode: 'choose',
    type: 'single',
    messageId: null,
    count: 0,
    canDeleteForEveryone: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);

  // Clear All Chats and Conversation menu state
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isConvMenuOpen, setIsConvMenuOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearConvModalOpen, setIsClearConvModalOpen] = useState(false);
  const [isClearingConv, setIsClearingConv] = useState(false);
  const [isDeleteConvEveryoneModalOpen, setIsDeleteConvEveryoneModalOpen] = useState(false);
  const [isDeletingConvEveryone, setIsDeletingConvEveryone] = useState(false);

  // Sidebar conversation selection state
  const [selectedConvIds, setSelectedConvIds] = useState([]);
  const [isClearSelectedConvsModalOpen, setIsClearSelectedConvsModalOpen] = useState(false);
  const [isClearingSelectedConvs, setIsClearingSelectedConvs] = useState(false);
  const selectAllConvsCheckboxRef = useRef(null);

  // Single conversation delete from hover icon
  const [convToDelete, setConvToDelete] = useState(null);
  const [isDeleteConvModalOpen, setIsDeleteConvModalOpen] = useState(false);
  const [isDeletingConv, setIsDeletingConv] = useState(false);

  const chatMenuRef = useRef(null);
  const convMenuRef = useRef(null);

  // Mobile navigation: 'list' or 'chat'
  const [mobileView, setMobileView] = useState('list');

  // Typing state
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);
  const isTypingActiveRef = useRef(false);

  // Clear typing timeout on component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const messagesEndRef = useRef(null);
  const recipientInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const selectAllCheckboxRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target)) {
        setIsChatMenuOpen(false);
      }
      if (convMenuRef.current && !convMenuRef.current.contains(e.target)) {
        setIsConvMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-scroll to latest message
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Keep ChatContext aware of active conversation for badges and sound
  useEffect(() => {
    setActiveConversationId(selectedConversation?._id || null);
    return () => {
      setActiveConversationId(null);
    };
  }, [selectedConversation?._id, setActiveConversationId]);

  // Fetch all eligible Employees from database via backend API
  const fetchEligibleEmployees = useCallback(async () => {
    setLoadingUsers(true);
    try {
      let res;
      try {
        res = await api.get('/chat/employees');
      } catch (fetchErr) {
        if (fetchErr?.response?.status === 404) {
          res = await api.get('/chat/users');
        } else {
          throw fetchErr;
        }
      }
      const data = res?.data;
      const empList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.employees)
        ? data.employees
        : Array.isArray(data?.users)
        ? data.users
        : [];
      setAllUsers(empList);
    } catch (err) {
      console.error('Failed to fetch Employees from database:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);
  const fetchEligibleUsers = fetchEligibleEmployees;

  // Fetch conversations belonging to current user
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      if (data?.success && Array.isArray(data.data)) {
        setConversations(data.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Fetch message history for a conversation
  const loadConversationMessages = useCallback(
    async (convId) => {
      setLoadingMessages(true);
      setErrorMessage('');
      try {
        const { data } = await api.get(`/chat/conversations/${convId}/messages?limit=100`);
        if (data?.success && Array.isArray(data.data)) {
          setMessages(data.data);
          setTimeout(() => scrollToBottom('auto'), 50);
        }

        // Mark conversation as read via API and socket
        api.put(`/chat/conversations/${convId}/read`).catch(() => {});
        if (socket && isConnected) {
          socket.emit('mark_read', { conversationId: convId });
        }

        // Update local conversation list unread count
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c))
        );
        refreshUnreadCount();
      } catch (err) {
        console.error('Failed to load messages:', err);
        setErrorMessage('Failed to load messages for this conversation.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [socket, isConnected, refreshUnreadCount]
  );

  // Initialize data on mount and whenever authenticated user becomes available
  useEffect(() => {
    fetchConversations();
    fetchEligibleUsers();
  }, [fetchConversations, fetchEligibleUsers, user?._id]);

  // Handle click outside to close the recipient dropdown and message action menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowRecipientDropdown(false);
      }
      if (!e.target.closest('[data-message-menu]')) {
        setActiveMessageMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    if (selectedConversation?._id) {
      socket.emit('join_conversation', {
        conversationId: selectedConversation._id,
      });
    }

    const handleNewMessage = ({ message, conversationId, tempId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages((prev) => {
          if (tempId) {
            const index = prev.findIndex((m) => m._tempId === tempId || m._id === message._id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = message;
              return updated;
            }
          }
          if (prev.some((m) => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });

        setTimeout(() => scrollToBottom('smooth'), 50);

        if (message.sender?._id !== user._id && message.sender !== user._id) {
          socket.emit('mark_read', { conversationId });
          api.put(`/chat/conversations/${conversationId}/read`).catch(() => {});
        }
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversationId);
        if (index !== -1) {
          const conv = { ...prev[index] };
          conv.lastMessage = message._id;
          conv.lastMessageText = message.text;
          conv.lastMessageSender = message.sender;
          conv.lastMessageAt = message.createdAt;
          if (selectedConversation?._id !== conversationId) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
          const filtered = prev.filter((c) => c._id !== conversationId);
          return [conv, ...filtered];
        }
        fetchConversations();
        return prev;
      });
    };

    const handleMessagesRead = ({ conversationId, readerId, readMessageIds, readAt }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (readMessageIds?.includes(msg._id)) {
              const alreadyReadBy = msg.readBy?.some(
                (r) => (r.user?._id || r.user)?.toString() === readerId
              );
              const updatedReadBy = alreadyReadBy
                ? msg.readBy
                : [...(msg.readBy || []), { user: readerId, readAt }];
              return {
                ...msg,
                status: 'read',
                readBy: updatedReadBy,
              };
            }
            return msg;
          })
        );
      }
    };

    const handleTypingStatus = ({ conversationId, userId, userName, isTyping }) => {
      if (selectedConversation?._id === conversationId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (isTyping) {
            next[userId] = userName;
          } else {
            delete next[userId];
          }
          return next;
        });
      }
    };

    const handleConversationUpdated = ({ conversationId, lastMessage }) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversationId);
        if (index !== -1) {
          const conv = { ...prev[index] };
          conv.lastMessageText = lastMessage?.text || conv.lastMessageText;
          conv.lastMessageAt = lastMessage?.createdAt || new Date();
          conv.lastMessageSender = lastMessage?.sender || conv.lastMessageSender;
          const filtered = prev.filter((c) => c._id !== conversationId);
          return [conv, ...filtered];
        }
        fetchConversations();
        return prev;
      });
    };

    const handleMessagesDeleted = ({ conversationId, messageIds, lastMessage }) => {
      if (selectedConversation?._id === conversationId && Array.isArray(messageIds)) {
        const set = new Set(messageIds);
        setMessages((prev) => prev.filter((m) => !set.has(m._id)));
        setSelectedMessageIds((prev) => prev.filter((id) => !set.has(id)));
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversationId) {
            return {
              ...c,
              lastMessage: lastMessage ? lastMessage._id : null,
              lastMessageText: lastMessage ? lastMessage.text : 'No messages yet',
              lastMessageAt: lastMessage ? lastMessage.createdAt : c.updatedAt,
            };
          }
          return c;
        })
      );
    };

    const handleMessageDeletedForMe = ({ conversationId, messageId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
        setSelectedMessageIds((prev) => prev.filter((id) => id !== messageId));
      }
    };

    const handleMessagesDeletedForMe = ({ conversationId, messageIds }) => {
      if (selectedConversation?._id === conversationId && Array.isArray(messageIds)) {
        const set = new Set(messageIds);
        setMessages((prev) => prev.filter((m) => !set.has(m._id)));
        setSelectedMessageIds((prev) => prev.filter((id) => !set.has(id)));
      }
    };

    const handleMessageDeletedForEveryone = ({ conversationId, messageId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeletedForEveryone: true, text: 'This message was deleted' }
              : m
          )
        );
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversationId && (c.lastMessage === messageId || c.lastMessage?._id === messageId)) {
            return { ...c, lastMessageText: 'This message was deleted' };
          }
          return c;
        })
      );
    };

    const handleMessagesDeletedForEveryone = ({ conversationId, messageIds }) => {
      if (selectedConversation?._id === conversationId && Array.isArray(messageIds)) {
        const set = new Set(messageIds);
        setMessages((prev) =>
          prev.map((m) =>
            set.has(m._id)
              ? { ...m, isDeletedForEveryone: true, text: 'This message was deleted' }
              : m
          )
        );
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversationId && messageIds.includes(c.lastMessage?._id || c.lastMessage)) {
            return { ...c, lastMessageText: 'This message was deleted' };
          }
          return c;
        })
      );
    };

    const handleChatsCleared = ({ userId }) => {
      if (userId === user?._id?.toString()) {
        setConversations([]);
        setSelectedConversation(null);
        setSelectedRecipients([]);
        setMessages([]);
        setSelectedMessageIds([]);
        setSelectedConvIds([]);
      }
    };

    const handleConversationCleared = ({ conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setSelectedRecipients([]);
        setMessages([]);
        setSelectedMessageIds([]);
        setMobileView('list');
      }
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      setSelectedConvIds((prev) => prev.filter((id) => id !== conversationId));
    };

    const handleConversationsCleared = ({ conversationIds }) => {
      if (Array.isArray(conversationIds)) {
        const set = new Set(conversationIds);
        setConversations((prev) => prev.filter((c) => !set.has(c._id)));
        if (selectedConversation && set.has(selectedConversation._id)) {
          setSelectedConversation(null);
          setSelectedRecipients([]);
          setMessages([]);
          setSelectedMessageIds([]);
          setMobileView('list');
        }
        setSelectedConvIds((prev) => prev.filter((id) => !set.has(id)));
      }
    };

    const handleConversationDeletedForEveryone = ({ conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setSelectedRecipients([]);
        setMessages([]);
        setSelectedMessageIds([]);
        setMobileView('list');
      }
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('typing_status', handleTypingStatus);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('messages_deleted', handleMessagesDeleted);
    socket.on('message_deleted_for_me', handleMessageDeletedForMe);
    socket.on('messages_deleted_for_me', handleMessagesDeletedForMe);
    socket.on('message_deleted_for_everyone', handleMessageDeletedForEveryone);
    socket.on('messages_deleted_for_everyone', handleMessagesDeletedForEveryone);
    socket.on('chats_cleared', handleChatsCleared);
    socket.on('conversation_cleared', handleConversationCleared);
    socket.on('conversations_cleared', handleConversationsCleared);
    socket.on('conversation_deleted_for_everyone', handleConversationDeletedForEveryone);

    return () => {
      if (selectedConversation?._id) {
        socket.emit('leave_conversation', {
          conversationId: selectedConversation._id,
        });
      }
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('typing_status', handleTypingStatus);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('messages_deleted', handleMessagesDeleted);
      socket.off('message_deleted_for_me', handleMessageDeletedForMe);
      socket.off('messages_deleted_for_me', handleMessagesDeletedForMe);
      socket.off('message_deleted_for_everyone', handleMessageDeletedForEveryone);
      socket.off('messages_deleted_for_everyone', handleMessagesDeletedForEveryone);
      socket.off('chats_cleared', handleChatsCleared);
      socket.off('conversation_cleared', handleConversationCleared);
      socket.off('conversations_cleared', handleConversationsCleared);
      socket.off('conversation_deleted_for_everyone', handleConversationDeletedForEveryone);
    };
  }, [socket, isConnected, selectedConversation?._id, user._id, fetchConversations]);

  // Selecting a conversation from the left sidebar
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setSelectedMessageIds([]);
    setMobileView('chat');
    setRecipientQuery('');
    setShowRecipientDropdown(false);
    setErrorMessage('');

    // Pre-populate recipient chips based on conversation participants (excluding self)
    const otherParticipants = (conv.participants || []).filter(
      (p) => (p._id || p)?.toString() !== user?._id?.toString()
    );
    setSelectedRecipients(otherParticipants);

    loadConversationMessages(conv._id);
  };

  // Start composing a new conversation via New Chat
  const handleStartCompose = () => {
    setSelectedConversation(null);
    setSelectedRecipients([]);
    setSelectedMessageIds([]);
    setMessages([]);
    setGroupNameInput('');
    setRecipientQuery('');
    setModalSearchQuery('');
    setModalSelectedEmployees([]);
    setModalGroupName('');
    setMobileView('chat');
    setIsNewChatModalOpen(true);
    setErrorMessage('');
    if (allUsers.length === 0 && !loadingUsers) {
      fetchEligibleEmployees();
    }
  };

  // Toggle selection of single message for bulk delete
  const handleToggleSelectMessage = (msgId) => {
    if (!msgId) return;
    setSelectedMessageIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  // Select all or deselect all messages in current chat
  const handleToggleSelectAllMessages = () => {
    const allIds = messages.map((m) => m._id).filter(Boolean);
    if (selectedMessageIds.length === allIds.length && allIds.length > 0) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(allIds);
    }
  };

  // Open delete options dialog for single message
  const handleOpenSingleDelete = (msg) => {
    const isOwn = msg.sender?._id === user._id || msg.sender === user._id;
    const canEveryone = isOwn && !msg.isDeletedForEveryone;
    setDeleteConfirmModal({
      isOpen: true,
      mode: 'choose',
      type: 'single',
      message: msg,
      messageId: msg._id,
      count: 1,
      canDeleteForEveryone: canEveryone,
    });
  };

  // Open delete options dialog for bulk delete
  const handleOpenBulkDelete = () => {
    if (selectedMessageIds.length === 0) return;
    const selectedMsgs = messages.filter((m) => selectedMessageIds.includes(m._id));
    const allOwn =
      selectedMsgs.length > 0 &&
      selectedMsgs.every(
        (m) =>
          (m.sender?._id === user._id || m.sender === user._id) &&
          !m.isDeletedForEveryone
      );
    setDeleteConfirmModal({
      isOpen: true,
      mode: 'choose',
      type: 'bulk',
      message: null,
      messageId: null,
      count: selectedMessageIds.length,
      canDeleteForEveryone: allOwn,
    });
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeleteConfirmModal({
      isOpen: false,
      mode: 'choose',
      type: 'single',
      message: null,
      messageId: null,
      count: 0,
      canDeleteForEveryone: false,
    });
  };

  // Trigger Delete for Me directly from action menu
  const handleTriggerDeleteForMe = (msg) => {
    setActiveMessageMenuId(null);
    setDeleteConfirmModal({
      isOpen: true,
      mode: 'confirm_me',
      type: 'single',
      message: msg,
      messageId: msg._id,
      count: 1,
      canDeleteForEveryone: false,
    });
  };

  // Trigger Delete for Everyone directly from action menu
  const handleTriggerDeleteForEveryone = (msg) => {
    setActiveMessageMenuId(null);
    setDeleteConfirmModal({
      isOpen: true,
      mode: 'confirm_everyone',
      type: 'single',
      message: msg,
      messageId: msg._id,
      count: 1,
      canDeleteForEveryone: true,
    });
  };

  // Execute Delete for Me
  const handleExecuteDeleteForMe = async (msgId = null) => {
    if (!selectedConversation?._id) return;
    setIsDeleting(true);
    try {
      if (msgId || deleteConfirmModal.type === 'single') {
        const idToDelete = msgId || deleteConfirmModal.messageId;
        await api.post(`/chat/conversations/${selectedConversation._id}/messages/${idToDelete}/delete-for-me`);
        setMessages((prev) => prev.filter((m) => m._id !== idToDelete));
        setSelectedMessageIds((prev) => prev.filter((id) => id !== idToDelete));
        toast.success('Message deleted for you');
      } else {
        const idsToDelete = [...selectedMessageIds];
        await api.post(`/chat/conversations/${selectedConversation._id}/messages/delete-for-me`, {
          messageIds: idsToDelete,
        });
        const set = new Set(idsToDelete);
        setMessages((prev) => prev.filter((m) => !set.has(m._id)));
        setSelectedMessageIds([]);
        toast.success(`${idsToDelete.length} message${idsToDelete.length === 1 ? '' : 's'} deleted for you`);
      }
      setDeleteConfirmModal({
        isOpen: false,
        mode: 'choose',
        type: 'single',
        message: null,
        messageId: null,
        count: 0,
        canDeleteForEveryone: false,
      });
      fetchConversations();
    } catch (err) {
      console.error('Failed to delete for me:', err);
      toast.error(err.response?.data?.message || 'Failed to delete message for you');
    } finally {
      setIsDeleting(false);
      setActiveMessageMenuId(null);
    }
  };

  // Execute Delete for Everyone
  const handleExecuteDeleteForEveryone = async (msgId = null) => {
    if (!selectedConversation?._id) return;
    setIsDeleting(true);
    try {
      if (msgId || deleteConfirmModal.type === 'single') {
        const idToDelete = msgId || deleteConfirmModal.messageId;
        await api.post(`/chat/conversations/${selectedConversation._id}/messages/${idToDelete}/delete-for-everyone`);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === idToDelete
              ? { ...m, isDeletedForEveryone: true, text: 'This message was deleted' }
              : m
          )
        );
        setSelectedMessageIds((prev) => prev.filter((id) => id !== idToDelete));
        toast.success('Message deleted for everyone');
      } else {
        const idsToDelete = [...selectedMessageIds];
        await api.post(`/chat/conversations/${selectedConversation._id}/messages/delete-for-everyone`, {
          messageIds: idsToDelete,
        });
        const set = new Set(idsToDelete);
        setMessages((prev) =>
          prev.map((m) =>
            set.has(m._id)
              ? { ...m, isDeletedForEveryone: true, text: 'This message was deleted' }
              : m
          )
        );
        setSelectedMessageIds([]);
        toast.success(`${idsToDelete.length} messages deleted for everyone`);
      }
      setDeleteConfirmModal({
        isOpen: false,
        mode: 'choose',
        type: 'single',
        message: null,
        messageId: null,
        count: 0,
        canDeleteForEveryone: false,
      });
      fetchConversations();
    } catch (err) {
      console.error('Failed to delete for everyone:', err);
      toast.error(err.response?.data?.message || 'Failed to delete message for everyone');
    } finally {
      setIsDeleting(false);
      setActiveMessageMenuId(null);
    }
  };

  // Check if current user can delete active conversation for everyone
  const canDeleteConvForEveryone = useMemo(() => {
    if (!selectedConversation) return false;
    const userRoleStr = (user?.role?.name || user?.role || '').toString().toLowerCase();
    const isAdmin = userRoleStr === 'admin';
    const isCreator =
      (selectedConversation.creator?._id || selectedConversation.creator)?.toString() ===
      user?._id?.toString();
    const isDirect = selectedConversation.type === 'direct';
    return isAdmin || isCreator || isDirect;
  }, [selectedConversation, user]);

  // Execute Clear All Chats for current user
  const handleClearAllChats = async () => {
    setIsClearingAll(true);
    try {
      const { data } = await api.post('/chat/clear-all');
      setConversations([]);
      setSelectedConversation(null);
      setSelectedRecipients([]);
      setMessages([]);
      setSelectedMessageIds([]);
      setSelectedConvIds([]);
      setMobileView('list');
      toast.success(data?.message || 'All chats have been cleared for you');
      setIsClearAllModalOpen(false);
    } catch (err) {
      console.error('Failed to clear all chats:', err);
      toast.error(err.response?.data?.message || 'Failed to clear all chats');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Execute Clear single conversation for current user
  const handleClearConversation = async () => {
    if (!selectedConversation?._id) return;
    setIsClearingConv(true);
    try {
      const convId = selectedConversation._id;
      const { data } = await api.post(`/chat/conversations/${convId}/clear`);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      setSelectedConversation(null);
      setSelectedRecipients([]);
      setMessages([]);
      setSelectedMessageIds([]);
      setSelectedConvIds((prev) => prev.filter((id) => id !== convId));
      setMobileView('list');
      toast.success(data?.message || 'Chat history cleared for you');
      setIsClearConvModalOpen(false);
    } catch (err) {
      console.error('Failed to clear conversation:', err);
      toast.error(err.response?.data?.message || 'Failed to clear chat');
    } finally {
      setIsClearingConv(false);
    }
  };

  // Execute Delete conversation for everyone
  const handleDeleteConversationForEveryone = async () => {
    if (!selectedConversation?._id) return;
    setIsDeletingConvEveryone(true);
    try {
      const convId = selectedConversation._id;
      const { data } = await api.post(`/chat/conversations/${convId}/for-everyone`);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      setSelectedConversation(null);
      setSelectedRecipients([]);
      setMessages([]);
      setSelectedMessageIds([]);
      setMobileView('list');
      toast.success(data?.message || 'Conversation deleted for everyone');
      setIsDeleteConvEveryoneModalOpen(false);
    } catch (err) {
      console.error('Failed to delete conversation for everyone:', err);
      toast.error(err.response?.data?.message || 'Failed to delete conversation for everyone');
    } finally {
      setIsDeletingConvEveryone(false);
    }
  };

  // Toggle selection of employee in New Chat Modal (supports multiple selections)
  const handleToggleModalEmployee = (emp) => {
    const empId = (emp._id || emp.employeeId)?.toString();
    setModalSelectedEmployees((prev) => {
      const isSelected = prev.some((e) => (e._id || e.employeeId)?.toString() === empId);
      if (isSelected) {
        return prev.filter((e) => (e._id || e.employeeId)?.toString() !== empId);
      } else {
        return [...prev, emp];
      }
    });
  };

  // Confirm starting chat from modal
  const handleConfirmStartChat = async () => {
    if (modalSelectedEmployees.length === 0) return;
    const chosen = [...modalSelectedEmployees];
    setIsNewChatModalOpen(false);
    setSelectedRecipients(chosen);
    setSelectedMessageIds([]);
    setMobileView('chat');
    setRecipientQuery('');
    setErrorMessage('');

    const recipientIds = chosen.map((e) => e._id || e.employeeId);

    if (chosen.length === 1) {
      const singleEmp = chosen[0];
      const singleId = (singleEmp._id || singleEmp.employeeId)?.toString();
      const existingDirect = conversations.find(
        (c) =>
          c.type === 'direct' &&
          c.participants?.some(
            (p) =>
              (p._id || p)?.toString() === singleId ||
              (p.email && singleEmp.email && p.email.toLowerCase() === singleEmp.email.toLowerCase())
          )
      );
      if (existingDirect) {
        setSelectedConversation(existingDirect);
        loadConversationMessages(existingDirect._id);
        return;
      }
    } else {
      const chosenAccountIds = new Set(
        chosen.map((e) => (e.accountId || e._id || e.employeeId)?.toString())
      );
      const existingGroup = conversations.find((c) => {
        if (c.type !== 'group' || !c.participants) return false;
        const otherParticipants = c.participants.filter(
          (p) => (p._id || p)?.toString() !== user?._id?.toString()
        );
        if (otherParticipants.length !== chosen.length) return false;
        return otherParticipants.every((p) =>
          chosenAccountIds.has((p._id || p)?.toString()) ||
          (p.email && chosen.some((e) => e.email && e.email.toLowerCase() === p.email.toLowerCase()))
        );
      });
      if (existingGroup && (!modalGroupName.trim() || existingGroup.name === modalGroupName.trim())) {
        setSelectedConversation(existingGroup);
        loadConversationMessages(existingGroup._id);
        return;
      }
    }

    setLoadingMessages(true);
    try {
      const { data } = await api.post('/chat/conversations', {
        recipientIds,
        groupName: modalGroupName.trim(),
      });
      if (data?.success && data.data) {
        setSelectedConversation(data.data);
        setMessages([]);
        fetchConversations();
        loadConversationMessages(data.data._id);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to start conversation');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Add a recipient when clicked from suggestion dropdown (single-recipient restriction)
  const handleAddRecipient = (userToAdd) => {
    if (!userToAdd || (!userToAdd._id && !userToAdd.employeeId)) return;

    // Maintain single-recipient restriction: user can select only one employee at a time
    // Check if employee is already selected; if so, do not duplicate
    if (
      selectedRecipients.some(
        (r) => (r._id || r.employeeId)?.toString() === (userToAdd._id || userToAdd.employeeId)?.toString()
      )
    ) {
      setRecipientQuery('');
      setShowRecipientDropdown(false);
      return;
    }

    const updated = [...selectedRecipients, userToAdd];
    setSelectedRecipients(updated);
    setRecipientQuery('');
    setShowRecipientDropdown(false);
    setErrorMessage('');
    setHighlightedUserIndex(-1);

    // If single recipient selected, find existing direct conversation
    if (updated.length === 1) {
      const single = updated[0];
      const singleId = (single._id || single.employeeId)?.toString();
      const existingDirect = conversations.find(
        (c) =>
          c.type === 'direct' &&
          c.participants?.some(
            (p) =>
              (p._id || p)?.toString() === singleId ||
              (p.email && single.email && p.email.toLowerCase() === single.email.toLowerCase())
          )
      );
      if (existingDirect) {
        setSelectedConversation(existingDirect);
        loadConversationMessages(existingDirect._id);
      } else {
        setSelectedConversation(null);
        setMessages([]);
      }
    } else {
      // Multiple recipients: check if matching group conversation exists
      const chosenAccountIds = new Set(
        updated.map((e) => (e.accountId || e._id || e.employeeId)?.toString())
      );
      const existingGroup = conversations.find((c) => {
        if (c.type !== 'group' || !c.participants) return false;
        const otherParticipants = c.participants.filter(
          (p) => (p._id || p)?.toString() !== user?._id?.toString()
        );
        if (otherParticipants.length !== updated.length) return false;
        return otherParticipants.every((p) =>
          chosenAccountIds.has((p._id || p)?.toString()) ||
          (p.email && updated.some((e) => e.email && e.email.toLowerCase() === p.email.toLowerCase()))
        );
      });
      if (existingGroup) {
        setSelectedConversation(existingGroup);
        loadConversationMessages(existingGroup._id);
      } else {
        setSelectedConversation(null);
        setMessages([]);
      }
    }
  };

  // Recipient removal action has been disabled per single-recipient workflow rules
  const handleRemoveRecipient = () => {
    // No-op: selected recipient cannot be removed via removal controls
  };

  // Input change for message text with throttled typing event emission
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (socket && isConnected && selectedConversation?._id) {
      if (!isTypingActiveRef.current) {
        socket.emit('typing', {
          conversationId: selectedConversation._id,
          isTyping: true,
        });
        isTypingActiveRef.current = true;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          conversationId: selectedConversation._id,
          isTyping: false,
        });
        isTypingActiveRef.current = false;
      }, 2000);
    }
  };

  // Send message handler (works for 1-to-1 and group)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sendingMessage) return;

    if (selectedRecipients.length === 0 && !selectedConversation) {
      setErrorMessage('Please select at least one recipient before sending.');
      return;
    }

    setErrorMessage('');
    setSendingMessage(true);

    try {
      let targetConv = selectedConversation;

      // If no target conversation, create/get conversation
      if (!targetConv) {
        const recipientIds = selectedRecipients.map((r) => r.accountId || r._id || r.employeeId);
        const { data: convData } = await api.post('/chat/conversations', {
          recipientIds,
          groupName: groupNameInput.trim(),
        });

        if (!convData?.success || !convData.data) {
          throw new Error('Failed to establish conversation');
        }

        targetConv = convData.data;
        setSelectedConversation(targetConv);
        fetchConversations();
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        _id: tempId,
        _tempId: tempId,
        conversation: targetConv._id,
        sender: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        text: textToSend,
        status: 'sent',
        readBy: [{ user: user._id, readAt: new Date() }],
        deliveredTo: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setInputText('');
      setTimeout(() => scrollToBottom('smooth'), 50);

      if (socket && isConnected) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        isTypingActiveRef.current = false;
        socket.emit('typing', {
          conversationId: targetConv._id,
          isTyping: false,
        });
      }

      // Send via Socket.IO
      if (socket && isConnected) {
        socket.emit(
          'send_message',
          {
            conversationId: targetConv._id,
            text: textToSend,
            tempId,
          },
          (response) => {
            if (response?.error) {
              console.error('Socket send error:', response.error);
              setErrorMessage(`Failed to send: ${response.error}`);
              setFailedMessage({ conversationId: targetConv._id, text: textToSend });
            } else if (response?.message) {
              setMessages((prev) =>
                prev.map((m) => (m._tempId === tempId ? response.message : m))
              );
            }
          }
        );
      } else {
        // Fallback to REST API
        const { data } = await api.post(
          `/chat/conversations/${targetConv._id}/messages`,
          { text: textToSend }
        );
        if (data?.success && data.data) {
          setMessages((prev) =>
            prev.map((m) => (m._tempId === tempId ? data.data : m))
          );
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      const errText = err.response?.data?.message || err.message || 'Failed to send message';
      setErrorMessage(errText);
      setFailedMessage({ conversationId: selectedConversation?._id, text: textToSend });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRetryFailedMessage = () => {
    if (failedMessage) {
      setInputText(failedMessage.text);
      setFailedMessage(null);
      setErrorMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Dynamic filter for suggestions: case-insensitive, employeeName, email, employeeCode, domain
  const filteredUsers = useMemo(() => {
    const q = (recipientQuery || '').trim().toLowerCase();
    return allUsers.filter((u) => {
      // Exclude already selected
      const isAlreadySelected = selectedRecipients.some(
        (r) =>
          (r._id || r.employeeId || r)?.toString() === (u._id || u.employeeId || u)?.toString() ||
          (r.email && u.email && r.email.toLowerCase() === u.email.toLowerCase())
      );
      if (isAlreadySelected) return false;

      // Exclude self (both by id and email)
      if ((u.email || '').toLowerCase() === (user?.email || '').toLowerCase()) return false;
      if ((u._id || u)?.toString() === user?._id?.toString()) return false;

      if (!q) return true;

      const nameMatch = (u.employeeName || u.name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const domainMatch = (u.domain || '').toLowerCase().includes(q);
      const codeMatch = (u.employeeCode || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || domainMatch || codeMatch;
    });
  }, [allUsers, recipientQuery, selectedRecipients, user?._id, user?.email]);

  // Filter employees for the New Chat modal
  const filteredModalEmployees = useMemo(() => {
    const q = (modalSearchQuery || '').trim().toLowerCase();
    return allUsers.filter((emp) => {
      // Exclude current logged in employee
      if ((emp.email || '').toLowerCase() === (user?.email || '').toLowerCase()) {
        return false;
      }
      if (!q) return true;
      const nameMatch = (emp.employeeName || emp.name || '').toLowerCase().includes(q);
      const codeMatch = (emp.employeeCode || '').toLowerCase().includes(q);
      const emailMatch = (emp.email || '').toLowerCase().includes(q);
      const domainMatch = (emp.domain || '').toLowerCase().includes(q);
      return nameMatch || codeMatch || emailMatch || domainMatch;
    });
  }, [allUsers, modalSearchQuery, user?.email]);

  // Select All state calculations for New Chat modal
  const allFilteredSelected = useMemo(() => {
    if (filteredModalEmployees.length === 0) return false;
    return filteredModalEmployees.every((emp) => {
      const empId = (emp._id || emp.employeeId)?.toString();
      return modalSelectedEmployees.some(
        (s) => (s._id || s.employeeId)?.toString() === empId
      );
    });
  }, [filteredModalEmployees, modalSelectedEmployees]);

  const someFilteredSelected = useMemo(() => {
    if (filteredModalEmployees.length === 0 || allFilteredSelected) return false;
    return filteredModalEmployees.some((emp) => {
      const empId = (emp._id || emp.employeeId)?.toString();
      return modalSelectedEmployees.some(
        (s) => (s._id || s.employeeId)?.toString() === empId
      );
    });
  }, [filteredModalEmployees, modalSelectedEmployees, allFilteredSelected]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const handleToggleSelectAll = () => {
    if (filteredModalEmployees.length === 0) return;

    if (allFilteredSelected) {
      // Deselect all employees in the current filtered list, preserving other selections
      const filteredIds = new Set(
        filteredModalEmployees.map((e) => (e._id || e.employeeId)?.toString())
      );
      setModalSelectedEmployees((prev) =>
        prev.filter((e) => !filteredIds.has((e._id || e.employeeId)?.toString()))
      );
    } else {
      // Select all employees in the current filtered list (preserving existing selections without duplicates)
      setModalSelectedEmployees((prev) => {
        const existingIds = new Set(
          prev.map((e) => (e._id || e.employeeId)?.toString())
        );
        const toAdd = filteredModalEmployees.filter(
          (e) => !existingIds.has((e._id || e.employeeId)?.toString())
        );
        return [...prev, ...toAdd];
      });
    }
  };

  // Reset highlighted suggestion index when search query or dropdown visibility changes
  useEffect(() => {
    if (showRecipientDropdown && filteredUsers.length > 0) {
      setHighlightedUserIndex(0);
    } else {
      setHighlightedUserIndex(-1);
    }
  }, [recipientQuery, showRecipientDropdown, filteredUsers.length]);

  // Keep highlighted suggestion scrolled into view during keyboard navigation
  useEffect(() => {
    if (highlightedItemRef.current) {
      highlightedItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedUserIndex]);

  // Filter conversations list on left
  const filteredConversations = useMemo(() => {
    const q = (conversationSearch || '').trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const nameMatch = (c.displayName || '').toLowerCase().includes(q);
      const textMatch = (c.lastMessageText || '').toLowerCase().includes(q);
      const participantMatch = c.participants?.some(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q)
      );
      return nameMatch || textMatch || participantMatch;
    });
  }, [conversations, conversationSearch]);

  // Indeterminate state for conversation select all checkbox
  useEffect(() => {
    if (selectAllConvsCheckboxRef.current) {
      const allCount = filteredConversations.length;
      const selCount = selectedConvIds.length;
      selectAllConvsCheckboxRef.current.indeterminate = selCount > 0 && selCount < allCount;
    }
  }, [selectedConvIds, filteredConversations]);

  // Toggle selection of conversation in sidebar
  const handleToggleSelectConversation = (convId, e) => {
    if (e) e.stopPropagation();
    if (!convId) return;
    setSelectedConvIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  // Toggle select all conversations currently in list
  const handleToggleSelectAllConversations = () => {
    const allIds = filteredConversations.map((c) => c._id).filter(Boolean);
    if (selectedConvIds.length === allIds.length && allIds.length > 0) {
      setSelectedConvIds([]);
    } else {
      setSelectedConvIds(allIds);
    }
  };

  // Execute clearing of selected conversations (bulk clear)
  const handleClearSelectedConversations = async () => {
    if (selectedConvIds.length === 0) return;
    setIsClearingSelectedConvs(true);
    try {
      const idsToClear = [...selectedConvIds];
      const { data } = await api.post('/chat/conversations/clear-bulk', {
        conversationIds: idsToClear,
      });
      const set = new Set(idsToClear);
      setConversations((prev) => prev.filter((c) => !set.has(c._id)));
      if (selectedConversation && set.has(selectedConversation._id)) {
        setSelectedConversation(null);
        setSelectedRecipients([]);
        setMessages([]);
        setSelectedMessageIds([]);
        setMobileView('list');
      }
      setSelectedConvIds([]);
      setIsClearSelectedConvsModalOpen(false);
      toast.success(data?.message || `${idsToClear.length} conversation${idsToClear.length === 1 ? '' : 's'} cleared`);
    } catch (err) {
      console.error('Failed to clear selected conversations:', err);
      toast.error(err.response?.data?.message || 'Failed to clear conversations');
    } finally {
      setIsClearingSelectedConvs(false);
    }
  };

  // Prompt single conversation delete from hover trash icon
  const handlePromptDeleteConversation = (conv, e) => {
    if (e) e.stopPropagation();
    setConvToDelete(conv);
    setIsDeleteConvModalOpen(true);
  };

  // Confirm delete single conversation
  const handleConfirmDeleteConversation = async () => {
    if (!convToDelete?._id) return;
    setIsDeletingConv(true);
    try {
      const convId = convToDelete._id;
      const { data } = await api.post(`/chat/conversations/${convId}/clear`);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (selectedConversation?._id === convId) {
        setSelectedConversation(null);
        setSelectedRecipients([]);
        setMessages([]);
        setSelectedMessageIds([]);
        setMobileView('list');
      }
      setSelectedConvIds((prev) => prev.filter((id) => id !== convId));
      toast.success(data?.message || 'Conversation deleted successfully');
      setIsDeleteConvModalOpen(false);
      setConvToDelete(null);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast.error(err.response?.data?.message || 'Failed to delete conversation');
    } finally {
      setIsDeletingConv(false);
    }
  };

  const getOtherParticipant = (conv) => {
    if (!conv?.participants) return null;
    return conv.participants.find(
      (p) => (p._id || p).toString() !== user._id.toString()
    );
  };

  // Group messages chronologically by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];

    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  return (
    <div className="flex w-full h-[calc(100dvh-7.5rem)] sm:h-[calc(100vh-theme(spacing.28))] min-h-[460px] sm:min-h-[550px] bg-white rounded-xl sm:rounded-2xl shadow-sm border border-[#D8E9E2] overflow-hidden min-w-0">
      {/* ========================================================================= */}
      {/* LEFT PANE: CONVERSATION LIST                                              */}
      {/* ========================================================================= */}
      <aside
        className={`${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 xl:w-[380px] border-r border-[#D8E9E2] bg-[#F4FBF8] flex-shrink-0 min-w-0 h-full`}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-[#D8E9E2] bg-white flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#D5F5E7] flex items-center justify-center text-[#07566A] flex-shrink-0">
              <MessageSquare size={17} className="text-[#00B96B]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-[#07566A] tracking-tight truncate">
                Messages
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#526B70] flex items-center space-x-1.5 truncate">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isConnected ? 'bg-[#00B96B]' : 'bg-amber-400'
                  }`}
                />
                <span className="truncate">{isConnected ? 'Real-time online' : 'Connecting...'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {notificationPermission !== 'granted' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                title="Enable browser notifications"
                className="p-1.5 sm:p-2 rounded-xl text-[#526B70] hover:text-[#07566A] hover:bg-[#D5F5E7] transition-colors cursor-pointer"
              >
                <Bell size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={handleStartCompose}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-[#00B96B] hover:bg-[#00D98B] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Start a new chat with registered users"
            >
              <Plus size={14} />
              <span>New</span>
            </button>

            {/* Chat Options Menu */}
            <div className="relative" ref={chatMenuRef}>
              <button
                type="button"
                onClick={() => setIsChatMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-xl text-[#526B70] hover:text-[#07566A] hover:bg-[#D5F5E7] transition-colors cursor-pointer"
                title="Chat options"
              >
                <MoreVertical size={16} />
              </button>

              {isChatMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 sm:w-52 bg-white rounded-2xl border border-[#D8E9E2] shadow-xl py-1.5 z-50 text-xs animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChatMenuOpen(false);
                      setIsClearAllModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2.5 font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} className="text-red-500" />
                    <span>Clear All Chats</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search input for existing chats */}
        <div className="p-2.5 sm:p-3 border-b border-[#D8E9E2] bg-[#F4FBF8]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#526B70]"
            />
            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white rounded-xl border border-[#D8E9E2] text-xs text-[#07566A] placeholder-[#526B70]/70 focus:outline-none focus:border-[#00B96B] transition-colors shadow-2xs"
            />
            {conversationSearch && (
              <button
                onClick={() => setConversationSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#526B70] hover:text-[#07566A]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Conversation Selection & Action Bar */}
        {filteredConversations.length > 0 && (
          <div className="px-3 sm:px-3.5 py-2 bg-white border-b border-[#D8E9E2] flex items-center justify-between text-xs text-[#526B70] select-none gap-2 min-w-0">
            <label className="flex items-center space-x-2 font-bold cursor-pointer text-[#07566A] flex-shrink-0">
              <input
                type="checkbox"
                ref={selectAllConvsCheckboxRef}
                checked={
                  filteredConversations.length > 0 &&
                  selectedConvIds.length === filteredConversations.length
                }
                onChange={handleToggleSelectAllConversations}
                className="w-4 h-4 rounded text-[#00B96B] focus:ring-0 focus:outline-none cursor-pointer accent-[#00B96B]"
              />
              <span className="text-xs">Select All</span>
            </label>

            {selectedConvIds.length > 0 ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2 animate-fadeIn flex-shrink-0">
                <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 bg-[#D5F5E7] text-[#07566A] rounded-full border border-[#00B96B]/30 whitespace-nowrap">
                  {selectedConvIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedConvIds([])}
                  className="text-[10px] sm:text-[11px] font-semibold text-[#526B70] hover:text-[#07566A] px-1 py-0.5 rounded cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsClearSelectedConvsModalOpen(true)}
                  className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Clear selected conversations"
                >
                  <Trash2 size={12} className="sm:w-[13px] sm:h-[13px]" />
                  <span>Clear Chat</span>
                </button>
              </div>
            ) : (
              <span className="text-[10px] sm:text-[11px] text-[#526B70]/70 font-medium whitespace-nowrap">
                {filteredConversations.length} conversation{filteredConversations.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#D8E9E2]/50">
          {loadingConversations ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#526B70]">
              <Spinner size="sm" />
              <p className="mt-2 text-xs font-semibold">Loading chats...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 px-6 text-center text-[#526B70]">
              <div className="w-12 h-12 rounded-2xl bg-[#D5F5E7] text-[#07566A] mx-auto flex items-center justify-center mb-3">
                <Users size={22} className="text-[#00B96B]" />
              </div>
              <h4 className="text-xs font-bold text-[#07566A] mb-1">
                {conversationSearch ? 'No matches found' : 'No conversations yet'}
              </h4>
              <p className="text-[11px] text-[#526B70] mb-4">
                {conversationSearch
                  ? 'Try searching with another keyword.'
                  : 'Start a direct or group conversation with any colleague.'}
              </p>
              <button
                onClick={handleStartCompose}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white text-[#07566A] border border-[#D8E9E2] hover:bg-[#D5F5E7] rounded-xl text-xs font-bold shadow-2xs transition-colors"
              >
                <Plus size={14} className="text-[#00B96B]" />
                <span>Start New Chat</span>
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConversation?._id === conv._id;
              const isChecked = selectedConvIds.includes(conv._id);
              const otherUser = conv.type === 'direct' ? getOtherParticipant(conv) : null;
              const isOtherOnline = otherUser ? isUserOnline(otherUser._id || otherUser) : false;
              const hasUnread = conv.unreadCount > 0;

              return (
                <div
                  key={conv._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectConversation(conv)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectConversation(conv);
                    }
                  }}
                  className={`w-full p-3.5 flex items-start space-x-3 text-left transition-colors relative group cursor-pointer ${
                    isSelected
                      ? 'bg-white border-l-4 border-[#00B96B] shadow-2xs'
                      : isChecked
                      ? 'bg-[#EAF8F3]/70'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${getAvatarColor(
                        conv.displayName || ''
                      )} flex items-center justify-center text-white font-extrabold text-sm shadow-xs`}
                    >
                      {conv.type === 'group' ? (
                        <Users size={18} />
                      ) : (
                        (conv.displayName?.charAt(0) || 'U').toUpperCase()
                      )}
                    </div>
                    {conv.type === 'direct' && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isOtherOnline ? 'bg-[#00B96B]' : 'bg-slate-300'
                        }`}
                        title={isOtherOnline ? 'Online' : 'Offline'}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3
                        className={`text-xs truncate ${
                          hasUnread
                            ? 'font-black text-[#07566A]'
                            : 'font-bold text-[#07566A]/90'
                        }`}
                      >
                        {conv.displayName}
                      </h3>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                        <span className="text-[10px] text-[#526B70]">
                          {formatConversationTime(conv.lastMessageAt || conv.updatedAt)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handlePromptDeleteConversation(conv, e)}
                          className="opacity-70 md:opacity-0 md:group-hover:opacity-100 text-[#526B70] hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-all cursor-pointer flex-shrink-0"
                          title="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p
                        className={`text-[11px] truncate pr-2 ${
                          hasUnread
                            ? 'font-bold text-[#07566A]'
                            : 'text-[#526B70]'
                        }`}
                      >
                        {conv.lastMessageText || 'No messages yet'}
                      </p>

                      {hasUnread && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-[#00B96B] rounded-full shadow-2xs">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT PANE: ACTIVE CHAT AREA WITH DYNAMIC RECIPIENT PICKER                */}
      {/* ========================================================================= */}
      <section
        className={`${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        } flex-col flex-1 h-full min-w-0 bg-[#EAF8F3]/40 relative`}
      >
        {/* ----------------------------------------------------------------------- */}
        {/* TOP RECIPIENT SELECTION AREA (ALWAYS VISIBLE & ACCESSIBLE)              */}
        {/* ----------------------------------------------------------------------- */}
        <div
          ref={dropdownRef}
          className="relative px-3 sm:px-4 py-2 sm:py-3 bg-white border-b border-[#D8E9E2] z-30 shadow-2xs"
        >
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            {/* Mobile Back Button */}
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="md:hidden p-1.5 -ml-1 rounded-xl text-[#526B70] hover:bg-[#D5F5E7] hover:text-[#07566A] flex-shrink-0 cursor-pointer"
              title="Back to conversation list"
            >
              <ArrowLeft size={18} />
            </button>

            <span className="text-xs font-black text-[#07566A] tracking-wider uppercase flex-shrink-0">
              To:
            </span>

            {/* Recipient Chips & Search Input Box */}
            <div
              onClick={() => {
                if (selectedRecipients.length === 0) {
                  recipientInputRef.current?.focus();
                }
              }}
              className={`flex-1 flex flex-wrap items-center gap-1 sm:gap-1.5 min-h-[36px] sm:min-h-[38px] p-1 sm:p-1.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl transition-all min-w-0 ${
                selectedRecipients.length === 0
                  ? 'focus-within:border-[#00B96B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00B96B]/20 cursor-text'
                  : 'cursor-default'
              }`}
            >
              {/* Selected recipient chips/tags */}
              {selectedRecipients.map((rec) => {
                const displayName = rec.employeeName || rec.name;
                const recId = rec._id || rec.employeeId;
                return (
                  <span
                    key={recId}
                    className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-[#D5F5E7] text-[#07566A] border border-[#00B96B]/30 rounded-full text-xs font-bold shadow-2xs animate-fadeIn max-w-[190px] sm:max-w-none min-w-0"
                  >
                    <span className="truncate">{displayName}</span>
                    <span className="text-[10px] text-[#526B70] font-normal truncate hidden xs:inline sm:inline">
                      {rec.employeeCode ? `(${rec.employeeCode})` : rec.email ? `(${rec.email})` : ''}
                    </span>
                  </span>
                );
              })}

              {/* Dynamic Search Input - ONLY displayed when NO recipients are selected */}
              {selectedRecipients.length === 0 && (
                <input
                  ref={recipientInputRef}
                  type="text"
                  value={recipientQuery}
                  onChange={(e) => {
                    setRecipientQuery(e.target.value);
                    setShowRecipientDropdown(true);
                  }}
                  onFocus={() => {
                    setShowRecipientDropdown(true);
                    if (allUsers.length === 0 && !loadingUsers) {
                      fetchEligibleEmployees();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!showRecipientDropdown) {
                        setShowRecipientDropdown(true);
                        return;
                      }
                      if (filteredUsers.length > 0) {
                        setHighlightedUserIndex((prev) =>
                          prev < filteredUsers.length - 1 ? prev + 1 : 0
                        );
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (!showRecipientDropdown) {
                        setShowRecipientDropdown(true);
                        return;
                      }
                      if (filteredUsers.length > 0) {
                        setHighlightedUserIndex((prev) =>
                          prev > 0 ? prev - 1 : filteredUsers.length - 1
                        );
                      }
                    } else if (e.key === 'Enter') {
                      if (showRecipientDropdown && highlightedUserIndex >= 0 && filteredUsers[highlightedUserIndex]) {
                        e.preventDefault();
                        handleAddRecipient(filteredUsers[highlightedUserIndex]);
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowRecipientDropdown(false);
                    }
                  }}
                  placeholder="Search employee name, code, or email..."
                  className="flex-1 min-w-[110px] sm:min-w-[180px] py-1 px-2 text-xs text-[#07566A] placeholder-[#526B70]/70 border-none focus:outline-none bg-transparent"
                />
              )}
            </div>

            {/* Conversation options menu (Clear Chat / Delete for Everyone) */}
            {selectedConversation && (
              <div className="relative flex-shrink-0" ref={convMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsConvMenuOpen((prev) => !prev)}
                  className="p-2 rounded-xl text-[#526B70] hover:text-[#07566A] hover:bg-[#D5F5E7] transition-colors cursor-pointer"
                  title="Conversation options"
                >
                  <MoreVertical size={17} />
                </button>

                {isConvMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-[#D8E9E2] shadow-xl py-1.5 z-50 text-xs animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setIsConvMenuOpen(false);
                        setIsClearConvModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-[#07566A] hover:bg-[#D5F5E7]/60 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} className="text-[#00B96B]" />
                      <span>Clear Chat (For Me)</span>
                    </button>

                    {canDeleteConvForEveryone && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsConvMenuOpen(false);
                          setIsDeleteConvEveryoneModalOpen(true);
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2.5 font-bold border-t border-[#D8E9E2]/60 transition-colors cursor-pointer"
                      >
                        <ShieldAlert size={14} className="text-red-500" />
                        <span>Delete for Everyone</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Group Name input if 2 or more recipients are selected */}
          {selectedRecipients.length > 1 && (
            <div className="mt-2.5 pt-2 border-t border-[#D8E9E2]/60 flex items-center space-x-2 animate-fadeIn">
              <span className="text-[11px] font-bold text-[#526B70] flex-shrink-0">
                Group Name (optional):
              </span>
              <input
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder={`e.g. Group (${selectedRecipients.map((r) => r.employeeName || r.name).join(', ')})`}
                className="flex-1 px-2.5 py-1 bg-[#F4FBF8] border border-[#D8E9E2] rounded-lg text-xs text-[#07566A] placeholder-[#526B70]/60 focus:outline-none focus:border-[#00B96B]"
              />
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* DYNAMIC USER SUGGESTIONS DROPDOWN (Employees Table Source)          */}
          {/* ------------------------------------------------------------------- */}
          {selectedRecipients.length === 0 && showRecipientDropdown && (
            <div className="absolute left-2 sm:left-4 right-2 sm:right-4 top-full mt-1.5 max-h-56 sm:max-h-72 overflow-y-auto bg-white rounded-2xl border border-[#D8E9E2] shadow-xl z-50 divide-y divide-[#D8E9E2]/50">
              <div className="px-3.5 py-2 bg-[#F4FBF8] text-[10px] font-extrabold text-[#526B70] uppercase tracking-wider flex items-center justify-between">
                <span>Employees ({filteredUsers.length})</span>
                {recipientQuery ? (
                  <span className="text-[#00B96B] lowercase font-semibold">
                    matching "{recipientQuery}"
                  </span>
                ) : (
                  <span className="text-[#526B70]/70 lowercase font-medium">
                    all from database ({allUsers.length})
                  </span>
                )}
              </div>

              {loadingUsers ? (
                <div className="py-6 flex items-center justify-center space-x-2 text-xs text-[#526B70]">
                  <Spinner size="xs" />
                  <span>Loading employees from database...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-xs font-semibold text-[#526B70]">
                  {allUsers.length === 0 ? (
                    <div className="space-y-2">
                      <p>No employee records loaded</p>
                      <button
                        type="button"
                        onClick={fetchEligibleEmployees}
                        className="text-xs text-[#00B96B] hover:underline font-bold inline-flex items-center space-x-1"
                      >
                        <RotateCw size={12} />
                        <span>Click to reload employees</span>
                      </button>
                    </div>
                  ) : (
                    'No employees found'
                  )}
                </div>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isOnline = isUserOnline(u.accountId || u._id);
                  const isHighlighted = idx === highlightedUserIndex;
                  const displayName = u.employeeName || u.name;
                  return (
                    <div
                      key={u._id || u.employeeId}
                      ref={isHighlighted ? highlightedItemRef : null}
                      onMouseEnter={() => setHighlightedUserIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents input blur and keeps focus
                        handleAddRecipient(u);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors group ${
                        isHighlighted ? 'bg-[#D5F5E7] text-[#07566A]' : 'hover:bg-[#D5F5E7]/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(
                              displayName
                            )} flex items-center justify-center text-white text-xs font-bold shadow-2xs`}
                          >
                            {displayName?.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                              isOnline ? 'bg-[#00B96B]' : 'bg-slate-300'
                            }`}
                          />
                        </div>

                        <div className="overflow-hidden min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-bold text-[#07566A] truncate group-hover:text-[#00B96B] transition-colors">
                              {displayName}
                            </h4>
                            {u.employeeCode && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#D5F5E7] text-[#07566A] rounded-md">
                                {u.employeeCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#526B70] truncate">
                            {u.email}
                            {u.domain ? ` • ${u.domain}` : ''}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold text-[#00B96B] transition-opacity pl-2 ${
                          isHighlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        + Select
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* BULK ACTION & SELECT ALL TOOLBAR                                        */}
        {/* ----------------------------------------------------------------------- */}
        {messages.length > 0 && selectedConversation && (
          <div className="px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-xs border-b border-[#D8E9E2] flex flex-wrap items-center justify-between gap-2 z-10 transition-all shadow-2xs min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <label className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold text-[#07566A] cursor-pointer select-none flex-shrink-0">
                <input
                  type="checkbox"
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedMessageIds.length > 0 &&
                        selectedMessageIds.length < messages.length;
                    }
                  }}
                  checked={messages.length > 0 && selectedMessageIds.length === messages.length}
                  onChange={handleToggleSelectAllMessages}
                  className="w-4 h-4 rounded text-[#00B96B] focus:ring-0 focus:outline-none cursor-pointer accent-[#00B96B]"
                />
                <span className="text-xs">Select All</span>
              </label>

              {selectedMessageIds.length > 0 ? (
                <span className="text-[10px] sm:text-xs font-extrabold px-2 sm:px-2.5 py-0.5 bg-[#D5F5E7] text-[#07566A] rounded-full border border-[#00B96B]/30 animate-fadeIn whitespace-nowrap">
                  {selectedMessageIds.length} <span className="hidden xs:inline">of {messages.length}</span> selected
                </span>
              ) : (
                <span className="text-[11px] text-[#526B70]/70 font-medium hidden sm:inline whitespace-nowrap">
                  ({messages.length} message{messages.length === 1 ? '' : 's'})
                </span>
              )}
            </div>

            {selectedMessageIds.length > 0 && (
              <div className="flex items-center space-x-1.5 sm:space-x-2 animate-fadeIn flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedMessageIds([])}
                  className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-[#526B70] hover:text-[#07566A] hover:bg-[#D5F5E7]/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenBulkDelete}
                  className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] sm:text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 size={12} className="sm:w-[13px] sm:h-[13px]" />
                  <span>Delete ({selectedMessageIds.length})</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* MESSAGES STREAM / CHAT HISTORY AREA                                     */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 min-w-0">
          {loadingMessages ? (
            <div className="h-full flex flex-col items-center justify-center text-[#526B70]">
              <Spinner size="md" />
              <p className="mt-3 text-xs font-semibold">Loading messages...</p>
            </div>
          ) : selectedRecipients.length === 0 && !selectedConversation ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#526B70]">
              <div className="w-16 h-16 rounded-3xl bg-[#D5F5E7] flex items-center justify-center text-[#07566A] mb-3 shadow-2xs">
                <MessageSquare size={30} className="text-[#00B96B]" />
              </div>
              <h3 className="text-base font-extrabold text-[#07566A] mb-1.5 tracking-tight">
                Select a Recipient to Chat
              </h3>
              <p className="text-xs text-[#526B70] max-w-sm leading-relaxed mb-4">
                Click the recipient input above and start typing a name or email to select
                one or more colleagues.
              </p>
              <button
                type="button"
                onClick={() => recipientInputRef.current?.focus()}
                className="px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#07566A] rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95"
              >
                Search System Users
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#526B70]">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#D8E9E2] flex items-center justify-center text-[#00B96B] mb-2 shadow-2xs">
                <MessageSquare size={22} />
              </div>
              <h4 className="text-xs font-bold text-[#07566A] mb-1">
                No messages yet
              </h4>
              <p className="text-[11px] text-[#526B70] max-w-xs">
                Type your message below and press Send to start the conversation!
              </p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date} className="space-y-3">
                <div className="flex items-center justify-center my-3">
                  <span className="px-3 py-1 bg-white border border-[#D8E9E2] text-[#526B70] text-[10px] font-bold rounded-full shadow-2xs">
                    {getDateDividerLabel(group.date)}
                  </span>
                </div>

                {group.messages.map((msg) => {
                  const isOwn =
                    msg.sender?._id === user._id || msg.sender === user._id;
                  const senderName = msg.sender?.name || 'User';
                  const isSelected = selectedMessageIds.includes(msg._id);

                  return (
                    <div
                      key={msg._id || msg._tempId}
                      className={`flex items-center gap-2 group transition-colors ${
                        isOwn ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Selection checkbox for incoming message */}
                      {!isOwn && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectMessage(msg._id)}
                          className={`w-4 h-4 rounded text-[#00B96B] focus:ring-0 focus:outline-none cursor-pointer accent-[#00B96B] transition-opacity flex-shrink-0 ${
                            selectedMessageIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Select message"
                        />
                      )}

                      <div
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMessageMenuId(activeMessageMenuId === msg._id ? null : msg._id);
                        }}
                        className={`max-w-[88%] sm:max-w-[78%] md:max-w-[70%] rounded-2xl px-3 sm:px-3.5 py-2 sm:py-2.5 shadow-2xs relative transition-all min-w-[70px] ${
                          isSelected ? 'ring-2 ring-[#00B96B]' : ''
                        } ${
                          msg.isDeletedForEveryone
                            ? isOwn
                              ? 'bg-[#07566A]/75 text-white/80 rounded-tr-xs border border-white/20'
                              : 'bg-slate-100 text-[#526B70] border border-[#D8E9E2] rounded-tl-xs'
                            : isOwn
                            ? 'bg-[#07566A] text-white rounded-tr-xs'
                            : 'bg-white text-[#07566A] border border-[#D8E9E2] rounded-tl-xs'
                        }`}
                      >
                        {/* Group Sender Name */}
                        {!isOwn && (selectedConversation?.type === 'group' || selectedRecipients.length > 1) && (
                          <p className="text-[10px] font-black text-[#00B96B] mb-0.5 truncate">
                            {senderName}
                          </p>
                        )}

                        {/* Message Content or "This message was deleted" placeholder */}
                        {msg.isDeletedForEveryone ? (
                          <div className="flex items-center space-x-1.5 py-0.5 select-none">
                            <Ban size={13} className={isOwn ? 'text-white/60' : 'text-[#526B70]/70'} />
                            <span className={`text-xs italic ${isOwn ? 'text-white/75' : 'text-[#526B70]/80'}`}>
                              This message was deleted
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {msg.text}
                          </p>
                        )}

                        {/* Footer info & Action Menu buttons */}
                        <div
                          className={`flex items-center justify-between space-x-2 mt-1 text-[10px] ${
                            isOwn ? 'text-white/75' : 'text-[#526B70]'
                          }`}
                        >
                          <div className="flex items-center space-x-1">
                            {/* Message 3-dot Action Menu Trigger */}
                            <button
                              type="button"
                              data-message-menu="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMessageMenuId(
                                  activeMessageMenuId === msg._id ? null : msg._id
                                );
                              }}
                              className={`p-1 rounded-md transition-all cursor-pointer ${
                                isOwn
                                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                                  : 'text-slate-400 hover:text-[#07566A] hover:bg-slate-100'
                              } opacity-75 sm:opacity-0 sm:group-hover:opacity-100`}
                              title="Message options"
                            >
                              <MoreVertical size={12} />
                            </button>

                            {/* Delete Button on hover / touch */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSingleDelete(msg);
                              }}
                              className={`p-1 rounded-md transition-all cursor-pointer ${
                                isOwn
                                  ? 'text-white/70 hover:text-red-200 hover:bg-white/10'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              } opacity-75 sm:opacity-0 sm:group-hover:opacity-100`}
                              title="Delete message"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="flex items-center space-x-1.5 ml-auto flex-shrink-0">
                            <span className="whitespace-nowrap">{formatMessageTime(msg.createdAt)}</span>

                            {isOwn && !msg.isDeletedForEveryone && (
                              <span title={`Status: ${msg.status}`} className="flex-shrink-0">
                                {msg.status === 'read' ? (
                                  <CheckCheck size={14} className="text-[#00D98B]" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck size={14} className="text-white/70" />
                                ) : (
                                  <Check size={14} className="text-white/70" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Message Action Menu Popover */}
                        {activeMessageMenuId === msg._id && (
                          <div
                            data-message-menu="true"
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute ${
                              isOwn ? 'right-0' : 'left-0'
                            } bottom-full mb-1 w-44 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-xl border border-[#D8E9E2] py-1 z-40 animate-fadeIn text-[#07566A]`}
                          >
                            {/* Delete for Me (always available) */}
                            <button
                              type="button"
                              onClick={() => handleTriggerDeleteForMe(msg)}
                              className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-[#F4FBF8] flex items-center space-x-2 text-[#07566A] hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} className="text-[#526B70]" />
                              <span>Delete for Me</span>
                            </button>

                            {/* Delete for Everyone: ONLY for messages sent by current user and not already deleted for everyone */}
                            {isOwn && !msg.isDeletedForEveryone && (
                              <button
                                type="button"
                                onClick={() => handleTriggerDeleteForEveryone(msg)}
                                className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-red-50 flex items-center space-x-2 text-red-600 transition-colors cursor-pointer border-t border-[#D8E9E2]/50"
                              >
                                <Users size={13} className="text-red-500" />
                                <span>Delete for Everyone</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selection checkbox for own message */}
                      {isOwn && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectMessage(msg._id)}
                          className={`w-4 h-4 rounded text-[#00B96B] focus:ring-0 focus:outline-none cursor-pointer accent-[#00B96B] transition-opacity flex-shrink-0 ${
                            selectedMessageIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Select message"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-[#526B70] px-2 py-1 bg-white/70 backdrop-blur-xs rounded-xl w-fit border border-[#D8E9E2]">
              <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00B96B] animate-bounce" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#00B96B] animate-bounce"
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#00B96B] animate-bounce"
                  style={{ animationDelay: '0.3s' }}
                />
              </span>
              <span>
                {Object.values(typingUsers).join(', ')}{' '}
                {Object.keys(typingUsers).length > 1 ? 'are typing...' : 'is typing...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {failedMessage && (
              <button
                onClick={handleRetryFailedMessage}
                className="flex items-center space-x-1 text-red-800 font-bold hover:underline"
              >
                <RotateCw size={12} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* CLEAR DISPLAY OF RECIPIENTS BEFORE SENDING (Requirement 4)               */}
        {/* ----------------------------------------------------------------------- */}
        {selectedRecipients.length > 0 && (
          <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-[#F4FBF8] border-t border-[#D8E9E2] flex items-center space-x-2 overflow-x-auto min-w-0">
            <span className="text-[10px] font-extrabold text-[#526B70] uppercase tracking-wider flex-shrink-0">
              Sending to:
            </span>
            <div className="flex items-center space-x-1.5 min-w-0 flex-nowrap">
              {selectedRecipients.map((rec) => {
                const displayName = rec.employeeName || rec.name;
                const recId = rec._id || rec.employeeId;
                return (
                  <span
                    key={recId}
                    className="inline-flex items-center px-2 sm:px-2.5 py-0.5 bg-white border border-[#00B96B]/40 rounded-full text-[10px] font-bold text-[#07566A] shadow-2xs whitespace-nowrap"
                  >
                    <span>{displayName}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* MESSAGE INPUT SECTION                                                   */}
        {/* ----------------------------------------------------------------------- */}
        <div className="p-2.5 sm:p-3.5 bg-white border-t border-[#D8E9E2]">
          <form onSubmit={handleSendMessage} className="flex items-end space-x-2 min-w-0">
            <div className="flex-1 bg-[#F4FBF8] border border-[#D8E9E2] focus-within:border-[#00B96B] focus-within:bg-white rounded-2xl transition-all shadow-2xs px-3 sm:px-3.5 py-1.5 sm:py-2 min-w-0">
              <textarea
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedRecipients.length === 0
                    ? 'Select recipient(s) above first...'
                    : selectedRecipients.length === 1
                    ? `Message ${selectedRecipients[0].employeeName || selectedRecipients[0].name}... (Enter to send)`
                    : `Message ${selectedRecipients.length} employees... (Enter to send)`
                }
                className="w-full bg-transparent text-xs text-[#07566A] placeholder-[#526B70]/70 resize-none focus:outline-none max-h-28 sm:max-h-32 leading-relaxed"
                style={{ minHeight: '22px' }}
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || sendingMessage || selectedRecipients.length === 0}
              className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-center transition-all shadow-xs flex-shrink-0 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] ${
                inputText.trim() && !sendingMessage && selectedRecipients.length > 0
                  ? 'bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] hover:shadow-[0_4px_12px_rgba(0,217,139,0.35)] active:scale-95 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* NEW CHAT MODAL - EMPLOYEES DATABASE TABLE RECIPIENT SOURCE (Req 1, 2, 3, 4) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        title="New Chat — Select Employees"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#526B70] -mt-1 leading-relaxed">
            Select one employee for a private one-to-one conversation, or multiple employees to create a group chat. Displaying registered employees directly from the database table.
          </p>

          {/* Search Input for Employees */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#526B70]"
            />
            <input
              type="text"
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              placeholder="Search by employee name, code, email, or domain..."
              className="w-full pl-9 pr-8 py-2 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl text-xs text-[#07566A] placeholder-[#526B70]/70 focus:outline-none focus:border-[#00B96B] focus:bg-white transition-colors"
              autoFocus
            />
            {modalSearchQuery && (
              <button
                type="button"
                onClick={() => setModalSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#526B70] hover:text-[#07566A]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Selected Employees Chips Section */}
          <div className="p-2.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl min-h-[46px] flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto">
            <span className="text-[10px] font-extrabold text-[#526B70] uppercase tracking-wider mr-1 flex-shrink-0">
              TO ({modalSelectedEmployees.length}):
            </span>
            {modalSelectedEmployees.length === 0 ? (
              <span className="text-xs text-[#526B70]/60 italic">
                No employees selected yet. Click any employee below to select.
              </span>
            ) : (
              modalSelectedEmployees.map((emp) => {
                const displayName = emp.employeeName || emp.name;
                const empId = emp._id || emp.employeeId;
                return (
                  <span
                    key={empId}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-[#D5F5E7] text-[#07566A] border border-[#00B96B]/40 rounded-full text-xs font-bold shadow-2xs animate-fadeIn"
                  >
                    <span>{displayName}</span>
                    {emp.employeeCode && (
                      <span className="text-[10px] text-[#526B70] font-normal">
                        ({emp.employeeCode})
                      </span>
                    )}
                  </span>
                );
              })
            )}
          </div>

          {/* Optional Group Name input if 2 or more employees are selected */}
          {modalSelectedEmployees.length > 1 && (
            <div className="pt-1 animate-fadeIn">
              <label className="block text-[11px] font-bold text-[#526B70] mb-1">
                Group Name (optional):
              </label>
              <input
                type="text"
                value={modalGroupName}
                onChange={(e) => setModalGroupName(e.target.value)}
                placeholder={`e.g. Group (${modalSelectedEmployees.map((e) => e.employeeName || e.name).join(', ')})`}
                className="w-full px-3 py-1.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl text-xs text-[#07566A] placeholder-[#526B70]/60 focus:outline-none focus:border-[#00B96B] focus:bg-white"
              />
            </div>
          )}

          {/* Scrollable Employees List */}
          <div className="border border-[#D8E9E2] rounded-xl overflow-hidden divide-y divide-[#D8E9E2]/50 max-h-64 overflow-y-auto">
            <div className="px-3.5 py-2.5 bg-[#F4FBF8] text-[10px] font-extrabold text-[#526B70] uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-[#D8E9E2]">
              <div className="flex items-center space-x-3">
                <span>EMPLOYEES ({filteredModalEmployees.length})</span>
                {filteredModalEmployees.length > 0 && (
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer text-[#07566A] font-bold text-xs select-none">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="w-3.5 h-3.5 rounded text-[#00B96B] focus:ring-[#00B96B]/30 border-[#D8E9E2] cursor-pointer accent-[#00B96B]"
                    />
                    <span className="text-[11px] font-bold text-[#07566A] capitalize">Select All</span>
                  </label>
                )}
              </div>
              {modalSearchQuery ? (
                <span className="text-[#00B96B] lowercase font-semibold">
                  matching "{modalSearchQuery}"
                </span>
              ) : (
                <span className="text-[#526B70]/70 lowercase font-medium">
                  all from database
                </span>
              )}
            </div>

            {loadingUsers ? (
              <div className="py-8 flex flex-col items-center justify-center text-[#526B70] space-y-2">
                <Spinner size="sm" />
                <span className="text-xs font-semibold">Loading employees from database...</span>
              </div>
            ) : filteredModalEmployees.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-[#526B70]">
                {allUsers.length === 0 ? (
                  <div className="space-y-2">
                    <p>No employee records found in database.</p>
                    <button
                      type="button"
                      onClick={fetchEligibleEmployees}
                      className="text-xs text-[#00B96B] font-bold hover:underline inline-flex items-center space-x-1"
                    >
                      <RotateCw size={12} />
                      <span>Reload Employees</span>
                    </button>
                  </div>
                ) : (
                  'No employees found'
                )}
              </div>
            ) : (
              filteredModalEmployees.map((emp) => {
                const empId = emp._id || emp.employeeId;
                const isSelected = modalSelectedEmployees.some(
                  (e) => (e._id || e.employeeId) === empId
                );
                const displayName = emp.employeeName || emp.name;
                const isOnline = isUserOnline(emp.accountId || emp._id);

                return (
                  <div
                    key={empId}
                    onClick={() => handleToggleModalEmployee(emp)}
                    className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#D5F5E7]/70 border-l-4 border-[#00B96B]'
                        : 'hover:bg-[#F4FBF8]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Checkbox indicator */}
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                          isSelected
                            ? 'bg-[#00B96B] border-[#00B96B] text-white'
                            : 'border-[#526B70]/40 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>

                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(
                            displayName
                          )} flex items-center justify-center text-white text-xs font-extrabold shadow-2xs`}
                        >
                          {displayName?.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                            isOnline ? 'bg-[#00B96B]' : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-[#07566A] truncate">
                            {displayName}
                          </h4>
                          {emp.employeeCode && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#D5F5E7] text-[#07566A] rounded-md">
                              {emp.employeeCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#526B70] truncate">
                          {emp.email}
                          {emp.domain ? ` • ${emp.domain}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-[#00B96B] text-white shadow-2xs'
                          : 'text-[#00B96B] hover:bg-[#D5F5E7]'
                      }`}
                    >
                      {isSelected ? 'Selected' : '+ Select'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-[#D8E9E2]">
            <span className="text-xs text-[#526B70] font-semibold truncate">
              {modalSelectedEmployees.length === 0
                ? 'Select employee(s) to continue'
                : modalSelectedEmployees.length === 1
                ? `1 employee selected (${modalSelectedEmployees[0].employeeName || modalSelectedEmployees[0].name})`
                : `${modalSelectedEmployees.length} employees selected (${modalSelectedEmployees
                    .map((e) => e.employeeName || e.name)
                    .slice(0, 3)
                    .join(', ')}${modalSelectedEmployees.length > 3 ? ` +${modalSelectedEmployees.length - 3} more` : ''})`}
            </span>

            <div className="flex items-center justify-end space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#526B70] hover:bg-[#F4FBF8] border border-[#D8E9E2] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartChat}
                disabled={modalSelectedEmployees.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${
                  modalSelectedEmployees.length > 0
                    ? 'bg-gradient-to-r from-[#00D98B] to-[#00B96B] text-[#07566A] hover:shadow-[0_4px_12px_rgba(0,217,139,0.35)] active:scale-95 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                <Plus size={14} />
                <span>
                  {modalSelectedEmployees.length <= 1
                    ? 'Start Private Chat'
                    : 'Start Group Chat'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ----------------------------------------------------------------------- */}
      {/* CONFIRMATION DIALOG MODAL (INDIVIDUAL & BULK MESSAGE DELETION)          */}
      {/* ----------------------------------------------------------------------- */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop blur with dark teal tint */}
          <div
            className="fixed inset-0 bg-[#043845]/50 backdrop-blur-xs transition-opacity"
            onClick={!isDeleting ? handleCancelDelete : undefined}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#D8E9E2] overflow-hidden p-4 sm:p-6 z-10 animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* ------------------------------------------------------------- */}
            {/* MODE 1: CHOOSE DELETION TYPE (WHATSAPP-STYLE ACTION DIALOG)    */}
            {/* ------------------------------------------------------------- */}
            {deleteConfirmModal.mode === 'choose' && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D5F5E7] border border-[#00B96B]/30 flex items-center justify-center text-[#07566A] flex-shrink-0">
                    <Trash2 size={20} className="text-[#00B96B]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#07566A]">
                      {deleteConfirmModal.type === 'bulk'
                        ? `Delete ${deleteConfirmModal.count} Messages?`
                        : 'Delete Message?'}
                    </h3>
                    <p className="text-xs text-[#526B70]">
                      Choose who you want to delete this message for
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 my-4">
                  {/* Option 1: Delete for Everyone (if permitted) */}
                  {deleteConfirmModal.canDeleteForEveryone && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmModal((prev) => ({
                          ...prev,
                          mode: 'confirm_everyone',
                        }))
                      }
                      className="w-full p-3.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 text-left transition-all cursor-pointer group flex items-start space-x-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600 group-hover:scale-105 transition-transform mt-0.5">
                        <Users size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-red-600 flex items-center justify-between">
                          <span>Delete for Everyone</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                            All participants
                          </span>
                        </div>
                        <p className="text-[11px] text-[#526B70] mt-1 leading-snug">
                          Permanently delete for all participants and replace with &ldquo;This message was deleted&rdquo;.
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Option 2: Delete for Me (always available) */}
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmModal((prev) => ({
                        ...prev,
                        mode: 'confirm_me',
                      }))
                    }
                    className="w-full p-3.5 rounded-xl border border-[#D8E9E2] bg-[#F4FBF8] hover:bg-[#E6F7F0] hover:border-[#00B96B]/50 text-left transition-all cursor-pointer group flex items-start space-x-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#D5F5E7] flex items-center justify-center flex-shrink-0 text-[#00B96B] group-hover:scale-105 transition-transform mt-0.5">
                      <Trash2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#07566A] flex items-center justify-between">
                        <span>Delete for Me</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D5F5E7] text-[#07566A] font-semibold">
                          Only you
                        </span>
                      </div>
                      <p className="text-[11px] text-[#526B70] mt-1 leading-snug">
                        Hide from your chat view. Other participants will still be able to see this message.
                      </p>
                    </div>
                  </button>

                  {!deleteConfirmModal.canDeleteForEveryone && (
                    <p className="text-[11px] text-[#526B70] px-1 italic">
                      Note: &ldquo;Delete for Everyone&rdquo; is only available for messages sent by you.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-[#D8E9E2]">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="px-4 py-2 border border-[#D8E9E2] hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODE 2: CONFIRM DELETE FOR EVERYONE                           */}
            {/* ------------------------------------------------------------- */}
            {deleteConfirmModal.mode === 'confirm_everyone' && (
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#07566A]">
                      {deleteConfirmModal.type === 'bulk'
                        ? `Delete ${deleteConfirmModal.count} Messages for Everyone?`
                        : 'Delete for Everyone?'}
                    </h3>
                    <p className="text-xs text-[#526B70]">
                      Permanent deletion for all participants
                    </p>
                  </div>
                </div>

                <div className="my-4 p-3.5 bg-red-50/70 border border-red-200 rounded-xl">
                  <p className="text-xs font-bold text-red-700">
                    {deleteConfirmModal.type === 'bulk'
                      ? `Are you sure you want to delete ${deleteConfirmModal.count} selected messages for everyone?`
                      : 'Are you sure you want to delete this message for everyone?'}
                  </p>
                  
                </div>

                <div className="flex items-center justify-between space-x-2 pt-3 border-t border-[#D8E9E2]">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() =>
                        setDeleteConfirmModal((prev) => ({
                          ...prev,
                          mode: 'choose',
                        }))
                      }
                      className="px-3.5 py-2 border border-[#D8E9E2] hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleCancelDelete}
                      className="px-3.5 py-2 hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleExecuteDeleteForEveryone()}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <Spinner size="xs" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Users size={14} />
                        <span>
                          {deleteConfirmModal.type === 'bulk'
                            ? `Delete ${deleteConfirmModal.count} for Everyone`
                            : 'Delete for Everyone'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODE 3: CONFIRM DELETE FOR ME                                 */}
            {/* ------------------------------------------------------------- */}
            {deleteConfirmModal.mode === 'confirm_me' && (
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D5F5E7] border border-[#00B96B]/30 flex items-center justify-center text-[#07566A] flex-shrink-0">
                    <Trash2 size={20} className="text-[#00B96B]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#07566A]">
                      {deleteConfirmModal.type === 'bulk'
                        ? `Delete ${deleteConfirmModal.count} Messages for Me?`
                        : 'Delete for Me?'}
                    </h3>
                    <p className="text-xs text-[#526B70]">
                      Remove only from your view
                    </p>
                  </div>
                </div>

                <div className="my-4 p-3.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl">
                  <p className="text-xs font-bold text-[#07566A]">
                    {deleteConfirmModal.type === 'bulk'
                      ? `Are you sure you want to delete ${deleteConfirmModal.count} selected messages for yourself?`
                      : 'Are you sure you want to delete this message for yourself?'}
                  </p>
                  <p className="text-[11px] text-[#526B70] mt-1.5 leading-relaxed">
                    This message will be hidden from your chat view. Other participants in the conversation will continue to see it. It will remain hidden when you reload or sign in again.
                  </p>
                </div>

                <div className="flex items-center justify-between space-x-2 pt-3 border-t border-[#D8E9E2]">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() =>
                        setDeleteConfirmModal((prev) => ({
                          ...prev,
                          mode: 'choose',
                        }))
                      }
                      className="px-3.5 py-2 border border-[#D8E9E2] hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleCancelDelete}
                      className="px-3.5 py-2 hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleExecuteDeleteForMe()}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:shadow-[0_4px_12px_rgba(0,217,139,0.35)] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <Spinner size="xs" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>
                          {deleteConfirmModal.type === 'bulk'
                            ? `Delete ${deleteConfirmModal.count} for Me`
                            : 'Delete for Me'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE SINGLE CONVERSATION (FROM HOVER ACTION)                     */}
      {/* ========================================================================= */}
      {isDeleteConvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#D8E9E2] p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#07566A]">Delete Conversation</h3>
                <p className="text-xs text-[#526B70]">Remove from your chat list</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl space-y-2">
              <p className="text-xs font-bold text-[#07566A]">
                Are you sure you want to delete the conversation with &ldquo;{convToDelete?.displayName || 'this contact'}&rdquo;?
              </p>
              <ul className="text-[11px] text-[#526B70] space-y-1.5 list-disc list-inside">
                <li>This conversation and all its messages will be removed from your chat list.</li>
                <li className="font-semibold text-[#07566A]">
                  Other participants will still keep all their messages and conversation history intact.
                </li>
                <li>If a participant sends a new message later, the conversation will reappear in your list.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingConv}
                onClick={() => {
                  setIsDeleteConvModalOpen(false);
                  setConvToDelete(null);
                }}
                className="px-4 py-2 hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingConv}
                onClick={handleConfirmDeleteConversation}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingConv ? (
                  <>
                    <Spinner size="xs" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Conversation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEAR SELECTED CONVERSATIONS CONFIRMATION                          */}
      {/* ========================================================================= */}
      {isClearSelectedConvsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#D8E9E2] p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#07566A]">Clear Selected Chats</h3>
                <p className="text-xs text-[#526B70]">
                  Clear {selectedConvIds.length} selected conversation{selectedConvIds.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl space-y-2">
              <p className="text-xs font-bold text-[#07566A]">
                Are you sure you want to clear the {selectedConvIds.length} selected conversation{selectedConvIds.length === 1 ? '' : 's'}?
              </p>
              <ul className="text-[11px] text-[#526B70] space-y-1.5 list-disc list-inside">
                <li>These conversations and their messages will be removed from your view.</li>
                <li>Your unread count and previews for these conversations will be reset.</li>
                <li className="font-semibold text-[#07566A]">
                  Other participants will still keep all their messages and conversation history intact.
                </li>
                <li>If a participant sends a new message later, the conversation will reappear in your list.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearingSelectedConvs}
                onClick={() => setIsClearSelectedConvsModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingSelectedConvs}
                onClick={handleClearSelectedConversations}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isClearingSelectedConvs ? (
                  <>
                    <Spinner size="xs" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Clear Chat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEAR ALL CHATS CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#D8E9E2] p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#07566A]">Clear All Chats</h3>
                <p className="text-xs text-[#526B70]">Reset your conversation history</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl space-y-2">
              <p className="text-xs font-bold text-[#07566A]">
                Are you sure you want to clear all your chat messages?
              </p>
              <ul className="text-[11px] text-[#526B70] space-y-1.5 list-disc list-inside">
                <li>Your chat history across individual & group conversations will be cleared.</li>
                <li>Your unread count and message previews will be reset to 0.</li>
                <li className="font-semibold text-[#07566A]">
                  Other participants will still keep all their messages and conversation history intact.
                </li>
                <li>Your account, profile, contacts, and group memberships will not be affected.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearingAll}
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={handleClearAllChats}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isClearingAll ? (
                  <>
                    <Spinner size="xs" />
                    <span>Clearing Chats...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Clear All Chats</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEAR SINGLE CONVERSATION CONFIRMATION                             */}
      {/* ========================================================================= */}
      {isClearConvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#D8E9E2] p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#D5F5E7] border border-[#00B96B]/30 flex items-center justify-center text-[#07566A] flex-shrink-0">
                <Trash2 size={22} className="text-[#00B96B]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#07566A]">Clear Chat History</h3>
                <p className="text-xs text-[#526B70]">Remove messages from your view only</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F4FBF8] border border-[#D8E9E2] rounded-xl space-y-2">
              <p className="text-xs font-bold text-[#07566A]">
                Clear messages in &ldquo;{selectedConversation?.displayName || 'this conversation'}&rdquo;?
              </p>
              <p className="text-[11px] text-[#526B70] leading-relaxed">
                All messages in this chat will be removed from your view. Other participants will continue to see their chat history. You can continue sending new messages at any time.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearingConv}
                onClick={() => setIsClearConvModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingConv}
                onClick={handleClearConversation}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:shadow-[0_4px_12px_rgba(0,217,139,0.35)] text-[#07566A] font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isClearingConv ? (
                  <>
                    <Spinner size="xs" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Clear Chat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONVERSATION FOR EVERYONE                                   */}
      {/* ========================================================================= */}
      {isDeleteConvEveryoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 flex-shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-600">Delete for Everyone</h3>
                <p className="text-xs text-[#526B70]">Permanent deletion for all participants</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-red-700">
                Are you sure you want to delete &ldquo;{selectedConversation?.displayName || 'this conversation'}&rdquo; for everyone?
              </p>
             
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingConvEveryone}
                onClick={() => setIsDeleteConvEveryoneModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 text-[#526B70] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingConvEveryone}
                onClick={handleDeleteConversationForEveryone}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingConvEveryone ? (
                  <>
                    <Spinner size="xs" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={14} />
                    <span>Delete for Everyone</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
