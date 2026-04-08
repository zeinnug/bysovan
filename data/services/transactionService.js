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
 * Catatan: dipanggil tanpa parameter query khusus karena percobaan per_page besar
 * menimbulkan error 500 di backend. Pagination/penyaringan dilakukan di sisi backend.
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
 * ✅ IMPROVED: Better validation and payload formatting
 */
export const createTransaction = async (data) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [TransactionService] Creating transaction...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ VALIDASI: Basic validation
    if (!data || !data.products || data.products.length === 0) {
      console.error('❌ Validation failed: No products');
      return {
        success: false,
        error: 'Produk tidak boleh kosong',
      };
    }

    // ✅ VALIDASI: Payment method
    if (!data.paymentMethod && !data.payment_method) {
      console.error('❌ Validation failed: No payment method');
      return {
        success: false,
        error: 'Metode pembayaran harus dipilih',
      };
    }

    // ✅ VALIDASI: Card type jika payment method = debit
    const paymentMethod = data.paymentMethod || data.payment_method;
    if (paymentMethod === 'debit' && !data.cardType && !data.card_type) {
      console.error('❌ Validation failed: No card type for debit payment');
      return {
        success: false,
        error: 'Jenis kartu debit harus dipilih',
      };
    }

    // ✅ VALIDASI: Semua produk harus memiliki unit_code yang valid
    const invalidProducts = data.products.filter(p => {
      const unitCode = p.unit_code || p.unitCode;
      const productId = p.product_id || p.productId;
      return !unitCode || unitCode.trim() === '' || !productId;
    });

    if (invalidProducts.length > 0) {
      console.error('❌ Validation failed: Invalid products', invalidProducts);
      return {
        success: false,
        error: `${invalidProducts.length} produk tidak memiliki unit_code atau product_id yang valid`,
      };
    }

    // ✅ IMPROVED: Format payload sesuai dengan Laravel API requirement
    const payload = {
      customer_name: data.customerName || data.customer_name || null,
      customer_phone: data.customerPhone || data.customer_phone || null,
      customer_email: data.customerEmail || data.customer_email || null,
      payment_method: paymentMethod,
      card_type: (paymentMethod === 'debit') ? (data.cardType || data.card_type) : null,
      discount_amount: parseFloat(data.discountAmount || data.discount_amount || 0), // ✅ REQUIRED by API
      products: (data.products || []).map(product => {
        const unitCode = (product.unit_code || product.unitCode || '').trim().toUpperCase();
        const productId = product.product_id || product.productId;
        const quantity = parseInt(product.quantity) || 1;
        const newPrice = product.new_price || product.newPrice;

        // ✅ Log each product mapping
        console.log(`📦 Mapping product:`, {
          product_id: productId,
          unit_code: unitCode,
          quantity: quantity,
          new_price: newPrice || 'null',
        });

        return {
          product_id: productId, // ✅ Backend tidak pakai ini, tapi tetap kirim untuk reference
          unit_code: unitCode,   // ✅ CRITICAL: Backend pakai ini untuk cari produk di database
          quantity: quantity,
          new_price: newPrice ? parseFloat(newPrice) : null,
        };
      }),
      overall_new_price: data.overallNewPrice || data.overall_new_price 
        ? parseFloat(data.overallNewPrice || data.overall_new_price) 
        : null,
      notes: data.notes || null,
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 [API] Sending payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const config = await getAxiosConfig();
    const url = `${BASE_URL}/transactions`;
    
    console.log(`🌐 [API] POST to: ${url}`);
    
    const response = await axios.post(url, payload, config);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [API] Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [API] Error creating transaction:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ✅ IMPROVED: Better error message extraction
    let errorMessage = 'Gagal membuat transaksi';
    
    if (error.response?.data) {
      // Laravel API error format
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.data.errors) {
        // Validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get transaction by ID
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
 */
export const filterTransactions = async (params) => {
  try {
    const config = await getAxiosConfig();
    const queryParams = new URLSearchParams();
    
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
      data: [],
    };
  }
};

/**
 * Update transaction
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