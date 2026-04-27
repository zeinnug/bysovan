// data/api.js
// ==================== API CLIENT CONFIGURATION ====================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS, REQUEST_TIMEOUT } from './constants';

// Create axios instance dengan config default
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ==================== REQUEST INTERCEPTOR ====================
// Tambahkan token ke setiap request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log request untuk debugging (hapus di production)
      console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
      
    } catch (error) {
      console.error('[API] Error getting token:', error);
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ==================== RESPONSE INTERCEPTOR ====================
// Handle response & errors
apiClient.interceptors.response.use(
  (response) => {
    // Log response untuk debugging (hapus di production)
    console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data,
    });
    
    return response;
  },
  async (error) => {
    console.error('[API] Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    // Handle 401 Unauthorized (Token expired/invalid)
    if (error.response && error.response.status === 401) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
        console.log('[API] Token cleared due to 401');
        // App.js akan detect dan redirect ke Login
      } catch (clearError) {
        console.error('[API] Error clearing auth data:', clearError);
      }
    }

    return Promise.reject(error);
  }
);

// ==================== HELPER FUNCTIONS ====================

/**
 * Format error response
 * @param {Error} error - Axios error object
 * @returns {Object} Formatted error
 */
export const formatError = (error) => {
  if (error.response) {
    // Server responded with error
    return {
      success: false,
      message: error.response.data?.message || 'Terjadi kesalahan pada server',
      statusCode: error.response.status,
      errors: error.response.data?.errors || null,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      success: false,
      message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      statusCode: null,
    };
  } else {
    // Something else happened
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan yang tidak diketahui',
      statusCode: null,
    };
  }
};

/**
 * Format success response
 * @param {Object} response - Axios response object
 * @returns {Object} Formatted response
 */
export const formatResponse = (response) => {
  return {
    success: true,
    data: response.data?.data || response.data,
    message: response.data?.message || 'Berhasil',
    statusCode: response.status,
  };
};

// ==================== EXPORT ====================
export default apiClient;