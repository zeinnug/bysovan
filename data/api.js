// BYSOVAN/data/api.js
// API Service Helper untuk semua API calls

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

// Create axios instance dengan config default
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menambahkan token ke setiap request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired atau tidak valid
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      // Redirect ke login akan ditangani di App.js
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

export const authAPI = {
  // Login
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/login', {
        email,
        password,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login gagal',
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      await apiClient.post('/logout');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Logout gagal',
      };
    }
  },

  // Get User Profile
  getProfile: async () => {
    try {
      const response = await apiClient.get('/profile');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengambil data profile',
      };
    }
  },
};

// ==================== DASHBOARD API ====================

export const dashboardAPI = {
  // Get Dashboard Data
  getDashboard: async () => {
    try {
      const response = await apiClient.get('/dashboard');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengambil data dashboard',
      };
    }
  },
};

// ==================== INVENTORY API ====================

export const inventoryAPI = {
  // Get All Products dengan pagination
  getProducts: async (page = 1, perPage = 100) => {
    try {
      const response = await apiClient.get(`/products?page=${page}&per_page=${perPage}`);
      
      const data = response.data;
      const productData = data.data?.products || [];
      
      if (!Array.isArray(productData)) {
        throw new Error('Data produk dari API tidak valid');
      }

      // Map ke format yang dibutuhkan
      const products = productData.map(product => ({
        id: product.id,
        barcode: product.units && product.units.length > 0 ? product.units[0].unit_code : '-',
        nama: `${product.brand || ''} ${product.model || ''}`.trim() || '-',
        kategori: product.brand || '-',
        ukuran: product.size || '-',
        warna: product.color || '-',
        stok: parseInt(product.stock || 0),
        hargaBeli: 0, // Tidak ada di API
        hargaJual: parseFloat(product.selling_price || 0),
        hargaDiskon: product.discount_price ? parseFloat(product.discount_price) : null,
        units: product.units || [],
      }));

      return {
        success: true,
        data: {
          totalProduk: products.length,
          stokMenipis: products.filter(p => p.stok < 5).length,
          totalStok: products.reduce((sum, p) => sum + p.stok, 0),
          products: products
        }
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return {
        success: false,
        error: error.message || 'Gagal mengambil data produk',
      };
    }
  },

  // Get Inventory History
  getHistory: async () => {
    try {
      const response = await apiClient.get('/inventory/history');
      return { success: true, data: response.data };
    } catch (error) {
      // Fallback jika 404
      if (error.response && error.response.status === 404) {
        return { success: false, error: 'Not Found', fallback: true };
      }
      return { success: false, error };
    }
  },

  // Add Product
  addProduct: async (formData) => {
    try {
      // Parse nama produk menjadi brand dan model
      const namaParts = formData.namaProduk.trim().split(' ');
      const brand = namaParts[0] || 'Unknown';
      const model = namaParts.slice(1).join(' ') || '';

      // Format data sesuai API
      const productData = {
        brand: brand,
        model: model,
        sizes: [
          {
            size: formData.ukuran || 'N/A',
            stock: parseInt(formData.stokAwal) || 0
          }
        ],
        color: formData.warna || null,
        selling_price: parseFloat(formData.hargaJual) || 0,
        discount_price: formData.hargaJual ? parseFloat(formData.hargaJual) * 0.9 : null,
      };

      const response = await apiClient.post('/products', productData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error adding product:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal menambahkan produk',
      };
    }
  },

  // Delete Product
  deleteProduct: async (productId) => {
    try {
      const response = await apiClient.delete(`/products/${productId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal menghapus produk',
      };
    }
  },
};

// ==================== PRODUCTS API ====================

export const productsAPI = {
  // Get All Products
  getProducts: async (params = {}) => {
    try {
      const response = await apiClient.get('/products', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengambil data produk',
      };
    }
  },

  // Get Product by ID
  getProductById: async (id) => {
    try {
      const response = await apiClient.get(`/products/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengambil detail produk',
      };
    }
  },

  // Create Product
  createProduct: async (productData) => {
    try {
      const response = await apiClient.post('/products', productData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal menambah produk',
      };
    }
  },

  // Update Product
  updateProduct: async (id, productData) => {
    try {
      const response = await apiClient.put(`/products/${id}`, productData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengupdate produk',
      };
    }
  },

  // Delete Product
  deleteProduct: async (id) => {
    try {
      const response = await apiClient.delete(`/products/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal menghapus produk',
      };
    }
  },
};

// ==================== TRANSACTIONS API ====================

export const transactionsAPI = {
  // Get All Transactions
  getTransactions: async (params = {}) => {
    try {
      const response = await apiClient.get('/transactions', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengambil data transaksi',
      };
    }
  },

  // Get Transaction by ID
  getTransactionById: async (id) => {
    try {
      const response = await apiClient.get(`/transactions/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengambil detail transaksi',
      };
    }
  },

  // Create Transaction (Checkout)
  createTransaction: async (transactionData) => {
    try {
      const response = await apiClient.post('/transactions', transactionData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal membuat transaksi',
      };
    }
  },

  // Update Transaction
  updateTransaction: async (id, transactionData) => {
    try {
      const response = await apiClient.put(`/transactions/${id}`, transactionData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal mengupdate transaksi',
      };
    }
  },

  // Delete Transaction
  deleteTransaction: async (id) => {
    try {
      const response = await apiClient.delete(`/transactions/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Gagal menghapus transaksi',
      };
    }
  },
};

// ==================== DUMMY DATA (FALLBACK) ====================

export const dummyData = {
  // Get Dummy Products
  getDummyProducts: () => {
    const products = [
      {
        id: 1,
        barcode: 'BRG001',
        nama: 'Nike Air Jordan 1',
        kategori: 'Sneakers',
        ukuran: '42',
        warna: 'Black/Red',
        stok: 15,
        hargaBeli: 1500000,
        hargaJual: 2500000,
      },
      {
        id: 2,
        barcode: 'BRG002',
        nama: 'Adidas Ultraboost',
        kategori: 'Running',
        ukuran: '43',
        warna: 'White',
        stok: 3,
        hargaBeli: 1200000,
        hargaJual: 2000000,
      },
      {
        id: 3,
        barcode: 'BRG003',
        nama: 'Converse Chuck 70',
        kategori: 'Casual',
        ukuran: '41',
        warna: 'Black',
        stok: 20,
        hargaBeli: 800000,
        hargaJual: 1200000,
      },
    ];

    return {
      totalProduk: products.length,
      stokMenipis: products.filter(p => p.stok < 5).length,
      totalStok: products.reduce((sum, p) => sum + p.stok, 0),
      products: products
    };
  },

  // Get Dummy History
  getDummyHistory: () => {
    return [
      { id: 1, produk: 'Nike Air Jordan 1', aksi: 'Tambah', jumlah: 10, tanggal: '2025-01-15 10:30', user: 'Admin' },
      { id: 2, produk: 'Adidas Ultraboost', aksi: 'Kurang', jumlah: 2, tanggal: '2025-01-15 11:15', user: 'Kasir' },
      { id: 3, produk: 'Converse Chuck 70', aksi: 'Tambah', jumlah: 5, tanggal: '2025-01-15 14:20', user: 'Admin' },
    ];
  },
};

// ==================== QR CODE GENERATOR ====================

export const qrCodeAPI = {
  // Generate QR Code URL
  generateQRCode: (data, size = 200) => {
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
  },
};

// Export default apiClient jika perlu custom request
export default apiClient;