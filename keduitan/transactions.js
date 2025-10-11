import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to create axios config with auth
const getAxiosConfig = async () => {
  const token = await getAuthToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Get all transactions
 * @returns {Promise} Array of transactions
 */
export const getTransactions = async () => {
  try {
    const config = await getAxiosConfig();
    const response = await axios.get(`${BASE_URL}/transactions`, config);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch transactions',
    };
  }
};

/**
 * Create new transaction
 * @param {Object} data - Transaction data
 * @returns {Promise} Created transaction
 */
export const createTransaction = async (data) => {
  try {
    const config = await getAxiosConfig();
    const response = await axios.post(`${BASE_URL}/transactions`, data, config);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to create transaction',
    };
  }
};

/**
 * Get transaction by ID
 * @param {string|number} id - Transaction ID
 * @returns {Promise} Transaction details
 */
export const getTransactionById = async (id) => {
  try {
    const config = await getAxiosConfig();
    const response = await axios.get(`${BASE_URL}/transactions/${id}`, config);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch transaction',
    };
  }
};

/**
 * Filter transactions by date range and/or keyword
 * @param {Object} params - Filter parameters
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {string} params.keyword - Search keyword
 * @param {string} params.status - Transaction status
 * @returns {Promise} Filtered transactions
 */
export const filterTransactions = async (params) => {
  try {
    const config = await getAxiosConfig();
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.status) queryParams.append('status', params.status);
    
    const url = `${BASE_URL}/transactions?${queryParams.toString()}`;
    const response = await axios.get(url, config);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error filtering transactions:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to filter transactions',
    };
  }
};

/**
 * Update transaction
 * @param {string|number} id - Transaction ID
 * @param {Object} data - Updated transaction data
 * @returns {Promise} Updated transaction
 */
export const updateTransaction = async (id, data) => {
  try {
    const config = await getAxiosConfig();
    const response = await axios.put(`${BASE_URL}/transactions/${id}`, data, config);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to update transaction',
    };
  }
};

/**
 * Delete transaction
 * @param {string|number} id - Transaction ID
 * @returns {Promise} Deletion result
 */
export const deleteTransaction = async (id) => {
  try {
    const config = await getAxiosConfig();
    const response = await axios.delete(`${BASE_URL}/transactions/${id}`, config);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to delete transaction',
    };
  }
};

/**
 * Get transaction statistics
 * @param {Object} params - Filter parameters
 * @returns {Promise} Transaction statistics
 */
export const getTransactionStats = async (params = {}) => {
  try {
    const config = await getAxiosConfig();
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    
    const url = `${BASE_URL}/transactions/stats?${queryParams.toString()}`;
    const response = await axios.get(url, config);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch statistics',
    };
  }
};