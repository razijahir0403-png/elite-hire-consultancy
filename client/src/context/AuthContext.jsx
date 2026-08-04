import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import {
  clearAuthStorage,
  getStoredUserInfo,
  isTokenExpired,
  setAuthMessage,
  SESSION_EXPIRED_MESSAGE,
} from '../utils/authToken';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load user data on startup
  useEffect(() => {
    const checkUserLoggedIn = () => {
      const parsedUser = getStoredUserInfo();

      if (parsedUser) {
        if (isTokenExpired(parsedUser.token)) {
          clearAuthStorage();
          setAuthMessage(SESSION_EXPIRED_MESSAGE);
        } else {
          setUser(parsedUser);
        }
      }

      setLoading(false);
    };

    checkUserLoggedIn();
  }, []);

  // Login handler
  const login = async (email, password, workMode) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      // We set the token in axios immediately if possible, or wait until reload.
      // But we can just pass the auth header directly for this call:
      await api.post('/attendance/login', { workMode }, {
        headers: { Authorization: `Bearer ${data.token}` }
      });

      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success(`Welcome back, ${data.name}!`, {
        position: 'top-right',
        autoClose: 3000,
        theme: 'light'
      });
      navigate('/dashboard');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed. Please check credentials.';
      toast.error(errorMsg, {
        position: 'top-right',
        autoClose: 4000,
        theme: 'light'
      });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      
      toast.success(`Registration successful! Your account is pending administrator approval. Please login once approved.`, {
        position: 'top-right',
        autoClose: 6000,
        theme: 'light'
      });
      navigate('/login');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed. Try again.';
      toast.error(errorMsg, {
        position: 'top-right',
        autoClose: 4000,
        theme: 'light'
      });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // End Session handler
  const endSession = async (closeWindow = false) => {
    if (user && user.token) {
      try {
        await api.post('/attendance/end-session', {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        toast.info('Session ended successfully.', {
          position: 'top-right',
          autoClose: 2000,
          theme: 'light'
        });
        // We DO NOT clear Auth Storage here. They remain authenticated!
        if (closeWindow) {
          window.close();
        } else {
          // You might want to refresh the page or state here to reflect ended session
          window.location.reload(); 
        }
        return true;
      } catch (err) {
        console.error('Failed to end session history:', err);
        return false;
      }
    }
    return false;
  };

  // Complete Logout handler
  const logout = async (closeWindow = false) => {
    if (user && user.token) {
      try {
        await api.post('/attendance/logout', {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } catch (err) {
        console.error('Failed to log out history:', err);
      }
    }
    clearAuthStorage();
    setUser(null);
    toast.info('Logged out successfully.', {
      position: 'top-right',
      autoClose: 2000,
      theme: 'light'
    });
    
    if (closeWindow) {
      window.close();
    } else {
      navigate('/login');
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        endSession,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
