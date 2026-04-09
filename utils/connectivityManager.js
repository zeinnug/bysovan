// utils/connectivityManager.js
// ==================== CONNECTIVITY & INTERNET STATUS CHECK ====================

import axios from 'axios';

/**
 * Check apakah device memiliki koneksi internet yang aktif
 * Menggunakan multiple strategies untuk akurasi maksimal
 */
export const checkInternetConnectivity = async () => {
  try {
    // Strategy 1: Ping ke Google DNS (simple & reliable)
    const response = await axios.get('https://8.8.8.8', {
      timeout: 3000,
    });
    return true;
  } catch (error1) {
    try {
      // Strategy 2: Try ke Google public API
      const response = await axios.get('https://www.google.com', {
        timeout: 3000,
      });
      return true;
    } catch (error2) {
      try {
        // Strategy 3: Try ke Cloudflare DNS
        const response = await axios.get('https://1.1.1.1', {
          timeout: 3000,
        });
        return true;
      } catch (error3) {
        // Semua strategy gagal = tidak ada internet
        console.log('[Connectivity] No internet connection detected');
        return false;
      }
    }
  }
};

/**
 * Check status error apakah karena konektivitas atau server error
 * @param {Error} error - Error object dari axios
 * @returns {string} - 'NETWORK' | 'SERVER' | 'UNKNOWN'
 */
export const getErrorType = (error) => {
  // Network errors (no internet, timeout, DNS failure)
  if (error.code === 'ECONNABORTED' || error.message === 'timeout of 3000ms exceeded') {
    return 'NETWORK';
  }
  if (error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
    return 'NETWORK';
  }
  if (!error.response) {
    // Error terjadi sebelum response (network issue)
    return 'NETWORK';
  }

  // Server errors (4xx, 5xx)
  if (error.response && error.response.status) {
    if (error.response.status >= 500) {
      return 'SERVER';
    }
    if (error.response.status >= 400) {
      return 'SERVER';
    }
  }

  return 'UNKNOWN';
};

/**
 * Wrapper untuk API calls dengan automatic internet check
 * @param {Function} apiCallback - Function yang melakukan API call
 * @returns {Promise} - Result dari apiCallback atau error
 */
export const withConnectivityCheck = async (apiCallback) => {
  try {
    return await apiCallback();
  } catch (error) {
    const errorType = getErrorType(error);
    
    if (errorType === 'NETWORK') {
      const hasInternet = await checkInternetConnectivity();
      if (!hasInternet) {
        throw {
          type: 'NO_INTERNET',
          message: 'Tidak ada koneksi internet',
          originalError: error,
        };
      }
    }
    
    throw error;
  }
};

export default {
  checkInternetConnectivity,
  getErrorType,
  withConnectivityCheck,
};
