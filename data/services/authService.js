// data/services/authService.js
// ==================== AUTHENTICATION SERVICE ====================

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { formatError, formatResponse } from '../api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} rememberMe - Remember user
 * @returns {Promise<Object>} Response dengan user data & token
 */
export const loginUser = async (email, password, rememberMe = false) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
      email,
      password,
    });

    const data = response.data;
    
    // Simpan token
    if (data.token) {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    }

    // Simpan user data
    if (data.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
      
      // Simpan role
      if (data.user.role) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, data.user.role);
      }
    }

    // Handle Remember Me
    if (rememberMe) {
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, email);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
    }

    return {
      success: true,
      message: data.pesan || 'Login berhasil',
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    console.error('[AuthService] Login error:', error);
    throw formatError(error);
  }
};

/**
 * Logout user
 * @returns {Promise<Object>} Response
 */
export const logoutUser = async () => {
  try {
    // Call logout API
    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
    } catch (apiError) {
      // Ignore 405 Method Not Allowed - just logout locally
      if (apiError.response?.status !== 405) {
        console.warn('[AuthService] Logout API error:', apiError);
      }
    }

    // Clear local storage
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);

    return {
      success: true,
      message: 'Logout berhasil',
    };
  } catch (error) {
    console.error('[AuthService] Logout error:', error);
    // Still clear local data even on error
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    
    return {
      success: true,
      message: 'Logout berhasil',
    };
  }
};

/**
 * Get user profile
 * @returns {Promise<Object>} User profile data
 */
export const getUserProfile = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PROFILE);
    return formatResponse(response);
  } catch (error) {
    console.error('[AuthService] Get profile error:', error);
    throw formatError(error);
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
export const isAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    return !!token;
  } catch (error) {
    console.error('[AuthService] Check auth error:', error);
    return false;
  }
};

/**
 * Get local user data from storage
 * @returns {Promise<Object|null>} User data or null
 */
export const getLocalUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('[AuthService] Get user data error:', error);
    return null;
  }
};

/**
 * Get user role from storage
 * @returns {Promise<string|null>} User role or null
 */
export const getUserRole = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
  } catch (error) {
    console.error('[AuthService] Get user role error:', error);
    return null;
  }
};

/**
 * Load saved credentials (Remember Me)
 * @returns {Promise<Object>} Saved credentials
 */
export const loadSavedCredentials = async () => {
  try {
    const rememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);

    return {
      rememberMe: rememberMe === 'true',
      savedEmail: savedEmail || '',
    };
  } catch (error) {
    console.error('[AuthService] Load credentials error:', error);
    return {
      rememberMe: false,
      savedEmail: '',
    };
  }
};

/**
 * Get auth token from storage
 * @returns {Promise<string|null>} Token or null
 */
export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('[AuthService] Get token error:', error);
    return null;
  }
};

export default {
  loginUser,
  logoutUser,
  getUserProfile,
  isAuthenticated,
  getLocalUserData,
  getUserRole,
  loadSavedCredentials,
  getAuthToken,
};