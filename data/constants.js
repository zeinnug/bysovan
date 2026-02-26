// data/constants.js
// ==================== CONSTANTS & CONFIGURATION ====================

// API Base URL
export const API_BASE_URL = "https://testingaplikasi.tokosepatusovan.com/api";

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: "userToken",
  USER_DATA: "userData",
  USER_ROLE: "userRole",
  REMEMBER_ME: "rememberMe",
  SAVED_EMAIL: "savedEmail",
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  PROFILE: "/auth/profile",

  // Dashboard
  DASHBOARD: "/dashboard",

  // Products/Inventory
  PRODUCTS: "/products",
  PRODUCT_BY_ID: (id) => `/products/${id}`,
  PRODUCT_UNIT: (productId, unitCode) =>
    `/products/${productId}/units/${unitCode}`,
  STOCK_OPNAME: "/stock-opname",
  UPDATE_PHYSICAL_STOCK: (id) => `/products/${id}/physical-stock`,
  SAVE_STOCK_REPORT: "/stock-opname/save",
  DELETE_STOCK_REPORT: (index) => `/stock-opname/${index}`,
  DELETE_ALL_REPORTS: "/stock-opname",

  // Transactions
  TRANSACTIONS: "/transactions",
  TRANSACTION_BY_ID: (id) => `/transactions/${id}`,
  ADD_PRODUCT_BY_QR: (unitCode) => `/transactions/add-product/${unitCode}`,

  // Users / Kasir (untuk filter laporan)
  USERS: "/users",
};

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: "cash",
  QRIS: "qris",
  DEBIT: "debit",
  TRANSFER: "transfer",
};

// Card Types
export const CARD_TYPES = {
  MANDIRI: "Mandiri",
  BRI: "BRI",
  BCA: "BCA",
};

// Payment Status
export const PAYMENT_STATUS = {
  PAID: "paid",
  PENDING: "pending",
  CANCELLED: "cancelled",
};

// Request Timeout
export const REQUEST_TIMEOUT = 10000; // 10 seconds

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 9999, // Fetch semua produk (set ke angka besar untuk unlimited)
};

// Date Format
export const DATE_FORMAT = {
  DISPLAY: "DD-MM-YYYY HH:mm",
  API: "YYYY-MM-DD",
  ISO: "YYYY-MM-DDTHH:mm:ss",
};

export default {
  API_BASE_URL,
  STORAGE_KEYS,
  API_ENDPOINTS,
  PAYMENT_METHODS,
  CARD_TYPES,
  PAYMENT_STATUS,
  REQUEST_TIMEOUT,
  PAGINATION,
  DATE_FORMAT,
};