import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { useAuth } from '../hooks/useAuth';

const ChatContext = createContext();

// Get Socket Server Base URL (strip trailing /api)
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

// Reusable AudioContext singleton to prevent browser audio context exhaustion
let sharedAudioCtx = null;
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();

    osc.type = 'sine';
    // Gentle two-tone chime
    const now = sharedAudioCtx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const activeConvRef = useRef(activeConversationId);
  activeConvRef.current = activeConversationId;

  // Request desktop notification permission when user opts in
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        return perm === 'granted';
      } catch (err) {
        console.error('Notification permission error:', err);
        return false;
      }
    }
    return false;
  }, []);

  // Fetch initial total unread count from API
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.token) return;
    try {
      const { data } = await api.get('/chat/unread-count');
      if (typeof data?.totalUnread === 'number') {
        setTotalUnread(data.totalUnread);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [isAuthenticated, user?.token]);

  // Connect / disconnect Socket.IO client based on authentication
  useEffect(() => {
    if (!isAuthenticated || !user?.token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTotalUnread(0);
        setOnlineUserIds(new Set());
      }
      return;
    }

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      refreshUnreadCount();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Unread count update event from server
    newSocket.on('unread_count_updated', ({ totalUnread: count }) => {
      if (typeof count === 'number') {
        setTotalUnread(count);
      }
    });

    newSocket.on('chats_cleared', () => {
      setTotalUnread(0);
    });

    // Initial online users list
    newSocket.on('online_users_list', (ids) => {
      if (Array.isArray(ids)) {
        setOnlineUserIds(new Set(ids));
      }
    });

    // User online/offline status broadcast
    newSocket.on('user_status', ({ userId, isOnline }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // Incoming new message sound & notification when not actively viewing
    newSocket.on('new_message', ({ message, conversationId }) => {
      const isCurrentActive = activeConvRef.current === conversationId;
      const isFromSelf = message.sender?._id === user._id || message.sender === user._id;

      if (!isCurrentActive && !isFromSelf) {
        playNotificationSound();

        // Browser notification if permitted and document hidden or different conversation
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted' &&
          (document.hidden || !isCurrentActive)
        ) {
          try {
            const senderName = message.sender?.name || 'New message';
            const notification = new Notification(`Chat from ${senderName}`, {
              body: message.text?.slice(0, 80) || 'You received a new message',
              icon: '/favicon.ico',
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (e) {
            // Notification error
          }
        }
      }
    });

    setSocket(newSocket);
    refreshUnreadCount();

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.token, user?._id, refreshUnreadCount]);

  const isUserOnline = useCallback(
    (userId) => (userId ? onlineUserIds.has(userId.toString()) : false),
    [onlineUserIds]
  );

  const contextValue = useMemo(
    () => ({
      socket,
      isConnected,
      totalUnread,
      setTotalUnread,
      refreshUnreadCount,
      activeConversationId,
      setActiveConversationId,
      onlineUserIds,
      isUserOnline,
      notificationPermission,
      requestNotificationPermission,
    }),
    [
      socket,
      isConnected,
      totalUnread,
      refreshUnreadCount,
      activeConversationId,
      onlineUserIds,
      isUserOnline,
      notificationPermission,
      requestNotificationPermission,
    ]
  );

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
