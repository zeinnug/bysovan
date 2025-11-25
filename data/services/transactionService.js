// data/services/transactionService.js
// ==================== TRANSACTION SERVICE ====================

import apiClient, { formatError, formatResponse } from '../api';
import { API_ENDPOINTS, PAGINATION, PAYMENT_METHODS } from '../constants';

// ==================== TRANSACTIONS ====================

/**
 * Get all transactions with filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Transactions data
 */
export const getTransactions = async (params = {}) => {
  try {
    const queryParams = {
      page: params.page || PAGINATION.DEFAULT_PAGE,
      per_page: params.perPage || PAGINATION.DEFAULT_PER_PAGE,
      date: params.date || '',
      payment_method: params.paymentMethod || '',
      status: params.status || '',
      no_cache: params.noCache || false,
    };

    const response = await apiClient.get(API_ENDPOINTS.TRANSACTIONS, {
      params: queryParams,
    });

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Gagal mengambil data transaksi');
    }

    // Format data untuk UI
    return {
      success: true,
      data: {
        transactions: (data.data.transactions || []).map(transaction => ({
          id: transaction.id,
          invoiceNumber: transaction.invoice_number,
          userId: transaction.user_id,
          userName: transaction.user_name || 'Unknown',
          totalAmount: parseFloat(transaction.total_amount || 0),
          taxAmount: parseFloat(transaction.tax_amount || 0),
          discountAmount: parseFloat(transaction.discount_amount || 0),
          finalAmount: parseFloat(transaction.final_amount || 0),
          paymentMethod: transaction.payment_method,
          cardType: transaction.card_type,
          paymentStatus: transaction.payment_status,
          customerName: transaction.customer_name,
          customerPhone: transaction.customer_phone,
          customerEmail: transaction.customer_email,
          notes: transaction.notes,
          createdAt: transaction.created_at,
          items: (transaction.items || []).map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name || 'Produk Tidak Dikenal',
            productUnitId: item.product_unit_id,
            unitCode: item.unit_code,
            color: item.color || '-',
            size: item.size || '-',
            quantity: item.quantity,
            price: parseFloat(item.price || 0),
            discount: parseFloat(item.discount || 0),
            subtotal: parseFloat(item.subtotal || 0),
          })),
        })),
        pagination: data.data.pagination || {},
        statistics: {
          totalTransactions: data.data.total_transactions || 0,
          totalAmount: parseFloat(data.data.total_amount || 0),
          pendingTransactions: data.data.pending_transactions || 0,
        },
      },
    };
  } catch (error) {
    console.error('[TransactionService] Get transactions error:', error);
    throw formatError(error);
  }
};

/**
 * Get transaction by ID
 * @param {number} id - Transaction ID
 * @returns {Promise<Object>} Transaction detail
 */
export const getTransactionById = async (id) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.TRANSACTION_BY_ID(id));
    
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Gagal mengambil detail transaksi');
    }

    const transaction = data.data;
    return {
      success: true,
      data: {
        id: transaction.id,
        invoiceNumber: transaction.invoice_number,
        userId: transaction.user_id,
        userName: transaction.user_name || 'Unknown',
        totalAmount: parseFloat(transaction.total_amount || 0),
        taxAmount: parseFloat(transaction.tax_amount || 0),
        discountAmount: parseFloat(transaction.discount_amount || 0),
        finalAmount: parseFloat(transaction.final_amount || 0),
        paymentMethod: transaction.payment_method,
        cardType: transaction.card_type,
        paymentStatus: transaction.payment_status,
        customerName: transaction.customer_name,
        customerPhone: transaction.customer_phone,
        customerEmail: transaction.customer_email,
        notes: transaction.notes,
        createdAt: transaction.created_at,
        items: (transaction.items || []).map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || 'Produk Tidak Dikenal',
          productUnitId: item.product_unit_id,
          unitCode: item.unit_code,
          color: item.color || '-',
          size: item.size || '-',
          quantity: item.quantity,
          price: parseFloat(item.price || 0),
          discount: parseFloat(item.discount || 0),
          subtotal: parseFloat(item.subtotal || 0),
        })),
      },
    };
  } catch (error) {
    console.error('[TransactionService] Get transaction by ID error:', error);
    throw formatError(error);
  }
};

/**
 * Create new transaction (Checkout)
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<Object>} Created transaction
 */
export const createTransaction = async (transactionData) => {
  try {
    const payload = {
      customer_name: transactionData.customerName || null,
      customer_phone: transactionData.customerPhone || null,
      customer_email: transactionData.customerEmail || null,
      payment_method: transactionData.paymentMethod, // cash, qris, debit, transfer
      card_type: transactionData.cardType || null, // Mandiri, BRI, BCA (if debit)
      discount_amount: parseFloat(transactionData.discountAmount || 0),
      products: (transactionData.products || []).map(product => ({
        unit_code: product.unitCode,
        quantity: product.quantity,
        discount_price: product.discountPrice ? parseFloat(product.discountPrice) : null,
      })),
      notes: transactionData.notes || null,
    };

    const response = await apiClient.post(API_ENDPOINTS.TRANSACTIONS, payload);
    
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Gagal membuat transaksi');
    }

    return {
      success: true,
      message: data.message || 'Transaksi berhasil dibuat',
      data: {
        transactionId: data.data.transaction_id,
        invoiceNumber: data.data.invoice_number,
      },
    };
  } catch (error) {
    console.error('[TransactionService] Create transaction error:', error);
    const formattedError = formatError(error);
    // Return error object instead of throwing, so caller can handle it
    return {
      success: false,
      error: formattedError.message || 'Gagal membuat transaksi',
      message: formattedError.message || 'Gagal membuat transaksi',
      statusCode: formattedError.statusCode,
    };
  }
};

// ==================== QR CODE SCANNING ====================

/**
 * Add product by scanning QR code
 * @param {string} unitCode - Unit code from QR
 * @returns {Promise<Object>} Product data
 */
export const addProductByQR = async (unitCode) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADD_PRODUCT_BY_QR(unitCode));
    
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Produk tidak ditemukan');
    }

    return {
      success: true,
      data: {
        productId: data.data.product_id,
        productName: data.data.product_name,
        color: data.data.color || '-',
        size: data.data.size || '-',
        sellingPrice: parseFloat(data.data.selling_price || 0),
        discountPrice: data.data.discount_price ? parseFloat(data.data.discount_price) : null,
        unitCode: data.data.unit_code,
      },
    };
  } catch (error) {
    console.error('[TransactionService] Add product by QR error:', error);
    throw formatError(error);
  }
};

// ==================== HELPERS ====================

/**
 * Validate payment method
 * @param {string} method - Payment method
 * @returns {boolean} Is valid
 */
export const isValidPaymentMethod = (method) => {
  return Object.values(PAYMENT_METHODS).includes(method);
};

/**
 * Format payment method for display
 * @param {string} method - Payment method
 * @param {string} cardType - Card type (if debit)
 * @returns {string} Formatted payment method
 */
export const formatPaymentMethod = (method, cardType = null) => {
  if (method === PAYMENT_METHODS.DEBIT && cardType) {
    return `Debit ${cardType}`;
  }
  
  const methodLabels = {
    [PAYMENT_METHODS.CASH]: 'Tunai',
    [PAYMENT_METHODS.QRIS]: 'QRIS',
    [PAYMENT_METHODS.DEBIT]: 'Debit',
    [PAYMENT_METHODS.TRANSFER]: 'Transfer',
  };

  return methodLabels[method] || method;
};

/**
 * Calculate transaction summary
 * @param {Array} items - Transaction items
 * @param {number} discountAmount - Total discount
 * @returns {Object} Summary
 */
export const calculateTransactionSummary = (items, discountAmount = 0) => {
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.price || item.sellingPrice || 0);
    const quantity = parseInt(item.quantity || 1);
    return sum + (price * quantity);
  }, 0);

  const totalDiscount = parseFloat(discountAmount || 0);
  const total = Math.max(0, subtotal - totalDiscount);

  return {
    subtotal,
    totalDiscount,
    total,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + parseInt(item.quantity || 1), 0),
  };
};

export default {
  getTransactions,
  getTransactionById,
  createTransaction,
  addProductByQR,
  isValidPaymentMethod,
  formatPaymentMethod,
  calculateTransactionSummary,
};