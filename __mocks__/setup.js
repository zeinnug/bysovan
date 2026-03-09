// __mocks__/setup.js
// Setup global mocks sebelum test berjalan

global.__reanimatedWorkletInit = jest.fn();

// Suppress console.error untuk output yang lebih bersih
// Hapus baris ini jika ingin melihat semua error log
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  // Filter out noise dari testing
  if (
    message.includes('API Error') ||
    message.includes('Error getting token') ||
    message.includes('Error loading saved') ||
    message.includes('Error clearing auth') ||
    message.includes('Logout API error') ||
    message.includes('Error getting local user')
  ) {
    return; // suppress log ini saat testing
  }
  originalConsoleError(...args);
};