import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);
const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || API;

const parseError = (error) => {
  if (error.response) {
    return error.response.data.detail || error.response.data.message || 'An unexpected error occurred.';
  } else if (error.request) {
    return 'No response from server. Please check your network connection.';
  } else {
    return error.message || 'An unexpected error occurred.';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('grove_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/api/auth/me`);
      const userData = response.data;
      // Construct the full URL for the profile picture if it exists
      if (userData.profile_picture) {
        userData.avatar_url = `${BASE_URL}/uploads/profiles/${userData.profile_picture}`;
      } else {
        userData.avatar_url = null; // Ensure it's null if no picture
      }
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post(`${API}/api/auth/login`, credentials);
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      localStorage.setItem('grove_token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      // Construct the full URL for the profile picture if it exists during login
      if (userData.profile_picture) {
        userData.avatar_url = `${BASE_URL}/uploads/profiles/${userData.profile_picture}`;
      } else {
        userData.avatar_url = null;
      }
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = parseError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/api/auth/register`, userData);
      const { access_token, user: newUserData } = response.data;
      setToken(access_token);
      localStorage.setItem('grove_token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      // Construct the full URL for the profile picture if it exists during registration
      if (newUserData.profile_picture) {
        newUserData.avatar_url = `${BASE_URL}/uploads/profiles/${newUserData.profile_picture}`;
      } else {
        newUserData.avatar_url = null;
      }
      setUser(newUserData);
      return { success: true, user: newUserData };
    } catch (error) {
      const errorMessage = parseError(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('grove_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 