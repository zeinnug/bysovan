// data/services/dashboardService.js
// ==================== DASHBOARD SERVICE ====================

import apiClient, { formatError, formatResponse } from '../api';
import { API_ENDPOINTS } from '../constants';

/**
 * Get dashboard data
 * @returns {Promise<Object>} Dashboard data
 */
export const getDashboardData = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.DASHBOARD);
    
    const data = response.data;
    
    if (!data.success) {
      throw new Error(data.message || 'Gagal mengambil data dashboard');
    }

    // Format data untuk UI
    return {
      success: true,
      data: {
        // Statistik Utama
        totalTransactions: data.data.total_transactions || 0,
        totalSales: data.data.total_sales || 0,
        totalProducts: data.data.total_products || 0,
        
        // Top Products (5 produk terlaris)
        topProducts: (data.data.top_products || []).map(product => ({
          name: product.name,
          quantity: product.quantity,
        })),
        
        // Chart Data (Transaksi per jam)
        chartData: {
          labels: data.data.labels || [],
          values: data.data.hourly_data || [],
        },
        
        // Recent Transactions (Transaksi terbaru hari ini)
        recentTransactions: (data.data.recent_transactions || []).map(transaction => ({
          id: transaction.id,
          createdAt: transaction.created_at,
          userName: transaction.user?.name || 'Unknown',
          items: transaction.items.map(item => ({
            productName: item.product?.name || 'Produk Tidak Dikenal',
          })),
          finalAmount: parseFloat(transaction.final_amount || 0),
          status: transaction.status || 'Selesai',
        })),
      },
    };
  } catch (error) {
    console.error('[DashboardService] Get dashboard error:', error);
    throw formatError(error);
  }
};

/**
 * Format currency untuk display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number untuk display
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (number) => {
  return new Intl.NumberFormat('id-ID').format(number);
};

/**
 * Get greeting based on time
 * @returns {string} Greeting message
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Selamat Pagi';
  } else if (hour >= 12 && hour < 15) {
    return 'Selamat Siang';
  } else if (hour >= 15 && hour < 18) {
    return 'Selamat Sore';
  } else {
    return 'Selamat Malam';
  }
};

export default {
  getDashboardData,
  formatCurrency,
  formatNumber,
  getGreeting,
};