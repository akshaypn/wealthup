import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // Start with null, will be set after validation
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:9001';

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Checking authentication...');
      
      // Get token from localStorage
      const storedToken = localStorage.getItem('token');
      console.log('Stored token present:', !!storedToken);
      
      if (storedToken) {
        // Set token and validate it
        setToken(storedToken);
        try {
          console.log('🔐 Validating token with backend...');
          const response = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          console.log('✅ Token valid, user:', response.data.user.name);
          setUser(response.data.user);
        } catch (error) {
          console.error('❌ Auth check failed:', error);
          console.log('🧹 Clearing invalid token...');
          // Clear authentication state directly
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      } else {
        console.log('🔓 No token found, user not authenticated');
        // Ensure both states are null when no token
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, [API_BASE_URL]); // Remove token dependency to avoid infinite loop

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email,
        password,
      });

      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
        email,
        password,
        name,
      });

      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const googleLogin = async (idToken) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/google`, {
        idToken,
      });

      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Google authentication failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (updates) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/v1/auth/profile`, updates);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Profile update failed' 
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    googleLogin,
    logout,
    updateProfile,
    isAuthenticated: !!(user && token), // Both user and token must be present
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 