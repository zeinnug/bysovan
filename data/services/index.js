// data/services/index.js
// ==================== CENTRALIZED SERVICES EXPORT ====================

// Export semua services dalam satu file
// Sehingga bisa import dengan: import { authService, dashboardService } from '@/data/services';

export { default as authService } from './authService';
export { default as dashboardService } from './dashboardService';
export { default as inventoryService } from './inventoryService';
export { default as transactionService } from './transactionService';

// Export individual functions (optional - untuk flexibility)
export * from './authService';
export * from './dashboardService';
export * from './inventoryService';
export * from './transactionService';