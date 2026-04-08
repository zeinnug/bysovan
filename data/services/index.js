// data/services/index.js
// ==================== SERVICES EXPORTS ====================

export { default as authService } from './authService';
export { default as dashboardService } from './dashboardService';
export { default as inventoryService } from './inventoryService';
export { default as transactionService } from './transactionService';
export { default as stockOpnameService } from './opname/stockOpnameService'; // ✅ NEW

// Export individual functions
export * from './authService';
export * from './dashboardService';
export * from './inventoryService';
export * from './transactionService';
export * from './opname';  