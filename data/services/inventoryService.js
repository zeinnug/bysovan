// data/services/inventoryService.js
// ==================== INVENTORY/PRODUCTS SERVICE ====================

import apiClient, { formatError, formatResponse } from '../api';
import { API_ENDPOINTS, PAGINATION } from '../constants';

// ==================== PRODUCTS CRUD ====================

/**
 * Get all products with pagination and filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Products data
 */
export const getProducts = async (params = {}) => {
  try {
    const queryParams = {
      page: params.page || PAGINATION.DEFAULT_PAGE,
      per_page: params.perPage || PAGINATION.DEFAULT_PER_PAGE,
      search: params.search || '',
      size: params.size || '',
      order_by: params.orderBy || 'created_at',
      sort: params.sort || 'desc',
      no_cache: params.noCache || false,
    };

    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS, {
      params: queryParams,
    });
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Get products error:', error);
    throw formatError(error);
  }
};

/**
 * Get inventory statistics
 * @returns {Promise<Object>} Inventory statistics
 */
export const getInventoryStatistics = async () => {
  try {
    // Jika API memiliki endpoint khusus untuk statistics
    // Uncomment baris ini dan sesuaikan endpoint-nya
    // const response = await apiClient.get(API_ENDPOINTS.INVENTORY_STATISTICS);
    // return formatResponse(response);

    // FALLBACK: Hitung dari data products
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS, {
      params: {
        page: 1,
        per_page: 9999, // Get all products untuk kalkulasi
        no_cache: true,
      },
    });

    const result = formatResponse(response);
    
    if (result.success && result.data.products) {
      const products = result.data.products;
      const LOW_STOCK_THRESHOLD = 5;

      // Hitung statistics
      const totalProducts = products.length;
      
      // Total stock dari semua units
      const totalStock = products.reduce((sum, product) => {
        if (product.units && Array.isArray(product.units)) {
          return sum + product.units.reduce((unitSum, unit) => {
            return unitSum + (parseInt(unit.stock) || 0);
          }, 0);
        }
        return sum + (parseInt(product.stock) || 0);
      }, 0);

      // Low stock products
      const lowStockProducts = products.filter(product => {
        if (product.units && Array.isArray(product.units)) {
          // Cek apakah ada unit yang low stock
          return product.units.some(unit => (parseInt(unit.stock) || 0) <= LOW_STOCK_THRESHOLD);
        }
        return (parseInt(product.stock) || 0) <= LOW_STOCK_THRESHOLD;
      }).length;

      return {
        success: true,
        data: {
          totalProducts,
          totalStock,
          lowStockProducts,
          lowStockThreshold: LOW_STOCK_THRESHOLD,
        },
      };
    }

    throw new Error('Failed to calculate statistics');
  } catch (error) {
    console.error('[InventoryService] Get inventory statistics error:', error);
    throw formatError(error);
  }
};

/**
 * Get product by ID
 * @param {number} id - Product ID
 * @returns {Promise<Object>} Product detail
 */
export const getProductById = async (id) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCT_BY_ID(id));
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Get product by ID error:', error);
    throw formatError(error);
  }
};

/**
 * Create new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    const payload = {
      brand: productData.brand,
      model: productData.model,
      color: productData.color,
      sizes: productData.sizes, // Array of { size, stock }
      selling_price: parseFloat(productData.sellingPrice),
      discount_price: productData.discountPrice ? parseFloat(productData.discountPrice) : null,
    };

    const response = await apiClient.post(API_ENDPOINTS.PRODUCTS, payload);
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Create product error:', error);
    throw formatError(error);
  }
};

/**
 * Update product
 * @param {number} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, productData) => {
  try {
    const payload = {
      brand: productData.brand,
      model: productData.model,
      color: productData.color,
      sizes: productData.sizes, // Array of { size, stock }
      selling_price: parseFloat(productData.sellingPrice),
      discount_price: productData.discountPrice ? parseFloat(productData.discountPrice) : null,
    };

    const response = await apiClient.put(API_ENDPOINTS.PRODUCT_BY_ID(id), payload);
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Update product error:', error);
    throw formatError(error);
  }
};

/**
 * Delete product
 * @param {number} id - Product ID
 * @returns {Promise<Object>} Response
 */
export const deleteProduct = async (id) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.PRODUCT_BY_ID(id));
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Delete product error:', error);
    throw formatError(error);
  }
};

// ==================== PRODUCT UNIT ====================

/**
 * Get product unit detail (untuk QR scan)
 * @param {number} productId - Product ID
 * @param {string} unitCode - Unit code
 * @returns {Promise<Object>} Unit detail
 */
export const getProductUnit = async (productId, unitCode) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCT_UNIT(productId, unitCode));
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Get product unit error:', error);
    throw formatError(error);
  }
};

// ==================== STOCK OPNAME ====================

/**
 * Get stock opname data
 * @returns {Promise<Object>} Stock opname data
 */
export const getStockOpname = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.STOCK_OPNAME);
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Get stock opname error:', error);
    throw formatError(error);
  }
};

/**
 * Update physical stock
 * @param {number} id - Product ID
 * @param {number} physicalStock - Physical stock count
 * @returns {Promise<Object>} Response
 */
export const updatePhysicalStock = async (id, physicalStock) => {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.UPDATE_PHYSICAL_STOCK(id),
      { physical_stock: physicalStock }
    );
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Update physical stock error:', error);
    throw formatError(error);
  }
};

/**
 * Save stock opname report
 * @param {Array} reports - Array of stock reports
 * @returns {Promise<Object>} Response
 */
export const saveStockOpnameReport = async (reports) => {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.SAVE_STOCK_REPORT,
      { reports }
    );
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Save stock report error:', error);
    throw formatError(error);
  }
};

/**
 * Delete specific stock opname report
 * @param {number} index - Report index
 * @returns {Promise<Object>} Response
 */
export const deleteStockOpnameReport = async (index) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.DELETE_STOCK_REPORT(index));
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Delete stock report error:', error);
    throw formatError(error);
  }
};

/**
 * Delete all stock opname reports
 * @returns {Promise<Object>} Response
 */
export const deleteAllStockOpnameReports = async () => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.DELETE_ALL_REPORTS);
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Delete all reports error:', error);
    throw formatError(error);
  }
};

/**
 * Add product by QR code scan (untuk transaction)
 * @param {string} unitCode - Unit code dari QR scan
 * @returns {Promise<Object>} Product detail untuk cart
 */
export const addProductByQR = async (unitCode) => {
  try {
    if (!unitCode || unitCode.trim() === '') {
      throw new Error('Unit code tidak boleh kosong');
    }

    const response = await apiClient.get(API_ENDPOINTS.ADD_PRODUCT_BY_QR(unitCode));
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Add product by QR error:', error);
    throw formatError(error);
  }
};

/**
 * Search product by code (fallback untuk QR scan)
 * @param {string} code - Product code / unit code
 * @returns {Promise<Object>} Product data
 */
export const searchProductByCode = async (code) => {
  try {
    if (!code || code.trim() === '') {
      throw new Error('Kode produk tidak boleh kosong');
    }

    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS, {
      params: {
        search: code,
        per_page: 100,
      },
    });
    return formatResponse(response);
  } catch (error) {
    console.error('[InventoryService] Search product by code error:', error);
    throw formatError(error);
  }
};

export default {
  getProducts,
  getInventoryStatistics,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductUnit,
  getStockOpname,
  updatePhysicalStock,
  saveStockOpnameReport,
  deleteStockOpnameReport,
  deleteAllStockOpnameReports,
  addProductByQR,
  searchProductByCode,
};