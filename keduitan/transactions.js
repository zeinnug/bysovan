import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { SafeAreaView, TouchableOpacity, Text } from 'react-native';
import QRScan from './qrscan';

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
 * Filter transactions by date, payment method, and status
 * Compatible with TransactionScreen.js usage
 * @param {Object} params - Filter parameters
 * @param {string} params.date - Date (YYYY-MM-DD)
 * @param {string} params.payment_method - Payment method (cash, qris, transfer, debit)
 * @param {string} params.status - Transaction status (paid, unpaid)
 * @param {string} params.startDate - Start date (YYYY-MM-DD) - alternative
 * @param {string} params.endDate - End date (YYYY-MM-DD) - alternative
 * @param {string} params.keyword - Search keyword
 * @returns {Promise} Filtered transactions
 */
export const filterTransactions = async (params) => {
  try {
    const config = await getAxiosConfig();
    const queryParams = new URLSearchParams();
    
    // Support both 'date' and 'startDate/endDate' formats
    if (params.date) {
      queryParams.append('date', params.date);
    }
    if (params.startDate) {
      queryParams.append('start_date', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('end_date', params.endDate);
    }
    if (params.payment_method) {
      queryParams.append('payment_method', params.payment_method);
    }
    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.keyword) {
      queryParams.append('keyword', params.keyword);
    }
    
    const url = `${BASE_URL}/transactions?${queryParams.toString()}`;
    console.log('Filter URL:', url);
    
    const response = await axios.get(url, config);
    
    console.log('Filter response:', response.data);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error filtering transactions:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to filter transactions',
      data: [],
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

/**
 * Add product by scanning QR code
 * @param {string} unitCode - Unit code from QR
 * @returns {Promise<Object>} Product data
 */
export const addProductByQR = async (unitCode) => {
  try {
    const config = await getAxiosConfig();
    const response = await axios.get(`${BASE_URL}/products/qr/${unitCode}`, config);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error scanning QR:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Product not found',
    };
  }
};

// ===================================================================
// QR Scanner UI wrapper component
// - safe to import and use inside screens that need QR scanning UI
// - keeps transactions API helpers separate from UI logic
// ===================================================================
export const QRScannerWrapper = ({
  availableUnits = [],
  cart = [],
  darkMode = false,
  onAddToCart = () => {},
  fetchUnits = async () => {},
  showButton = true,
  buttonStyle,
  buttonTextStyle,
}) => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  return (
    <SafeAreaView>
      {showButton && (
        <TouchableOpacity
          style={buttonStyle}
          onPress={() => {
            setShowQRScanner(true);
            setHasScanned(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={buttonTextStyle}>📷 Scan QR Code</Text>
        </TouchableOpacity>
      )}

      <QRScan
        visible={showQRScanner}
        availableUnits={availableUnits}
        cart={cart}
        darkMode={darkMode}
        onClose={() => {
          setShowQRScanner(false);
          setHasScanned(false);
        }}
        onScanSuccess={(newCartItem, unit) => {
          // bubble up to parent screen
          onAddToCart(newCartItem, unit);
          setShowQRScanner(false);
          setHasScanned(false);
        }}
        onScanError={(title, message) => {
          // parent screen may choose to show a popup
          console.warn('QRScan error:', title, message);
          setShowQRScanner(false);
          setHasScanned(false);
        }}
        onRequestRefresh={fetchUnits}
      />
    </SafeAreaView>
  );
};