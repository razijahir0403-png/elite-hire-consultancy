const AUTH_MESSAGE_KEY = 'authMessage';
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

let isHandlingAuthFailure = false;

export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

export const getStoredUserInfo = () => {
  const stored = localStorage.getItem('userInfo');
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem('userInfo');
    return null;
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem('userInfo');
};

export const setAuthMessage = (message) => {
  sessionStorage.setItem(AUTH_MESSAGE_KEY, message);
};

export const consumeAuthMessage = () => {
  const message = sessionStorage.getItem(AUTH_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(AUTH_MESSAGE_KEY);
  }
  return message;
};

export const handleAuthFailure = (message = SESSION_EXPIRED_MESSAGE) => {
  if (isHandlingAuthFailure) return;
  if (!localStorage.getItem('userInfo')) return;

  isHandlingAuthFailure = true;
  clearAuthStorage();
  setAuthMessage(message);
  window.location.href = '/login';
};

export const isAuthRequest = (config) => {
  const url = config?.url || '';
  return url.includes('/auth/login') || url.includes('/auth/register');
};

export { SESSION_EXPIRED_MESSAGE };
