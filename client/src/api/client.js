import axios from 'axios';
import { handleAuthFailure, isAuthRequest } from '../utils/authToken';

// Get backend API URL from environment, fallback to relative path in production, and localhost in dev
const API_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add the JWT token to requests
api.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const { token } = JSON.parse(userInfo);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Error parsing user credentials from localStorage:', err);
      }
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration or unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestConfig = error.config;

    if (status === 401 && requestConfig && !isAuthRequest(requestConfig)) {
      const message =
        error.response?.data?.message || 'Your session has expired. Please sign in again.';
      handleAuthFailure(message);
    }

    return Promise.reject(error);
  }
);

export default api;
