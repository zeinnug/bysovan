// BYSOVAN/utils/historyManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = '@inventory_history';
const MAX_HISTORY_ITEMS = 100; // Maksimal 100 riwayat

/**
 * Format timestamp ke format Indonesia
 * @param {Date} date 
 * @returns {string}
 */
const formatTimestamp = (date) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

/**
 * Add new history entry
 * @param {string} action - 'create', 'update', 'delete'
 * @param {object} productData - Product data
 * @param {string} user - Username (optional)
 * @returns {Promise<boolean>}
 */
export const addHistory = async (action, productData, user = 'System') => {
  try {
    // Get existing history
    const existingHistory = await getHistory();
    
    // Create new history entry
    const newHistoryItem = {
      id: Date.now(), // Unique ID
      timestamp: formatTimestamp(new Date()),
      action: action, // 'create', 'update', 'delete'
      productData: {
        brand: productData.brand || '',
        model: productData.model || '',
        color: productData.color || '',
        sizes: productData.sizes || [],
        sellingPrice: productData.sellingPrice || 0,
        discountPrice: productData.discountPrice || null,
        barcode: productData.barcode || '',
        description: productData.description || '',
      },
      user: user,
    };
    
    // Add to beginning of array (newest first)
    const updatedHistory = [newHistoryItem, ...existingHistory];
    
    // Limit to MAX_HISTORY_ITEMS
    const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(
      HISTORY_STORAGE_KEY, 
      JSON.stringify(trimmedHistory)
    );
    
    console.log('✅ History added:', newHistoryItem);
    return true;
  } catch (error) {
    console.error('❌ Error adding history:', error);
    return false;
  }
};

/**
 * Get all history
 * @returns {Promise<Array>}
 */
export const getHistory = async () => {
  try {
    const historyJSON = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    
    if (historyJSON === null) {
      return [];
    }
    
    const history = JSON.parse(historyJSON);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('❌ Error getting history:', error);
    return [];
  }
};

/**
 * Clear all history
 * @returns {Promise<boolean>}
 */
export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
    console.log('✅ History cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing history:', error);
    return false;
  }
};

/**
 * Delete specific history item
 * @param {number} historyId 
 * @returns {Promise<boolean>}
 */
export const deleteHistoryItem = async (historyId) => {
  try {
    const existingHistory = await getHistory();
    const updatedHistory = existingHistory.filter(item => item.id !== historyId);
    
    await AsyncStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(updatedHistory)
    );
    
    console.log('✅ History item deleted:', historyId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting history item:', error);
    return false;
  }
};

/**
 * Get history statistics
 * @returns {Promise<object>}
 */
export const getHistoryStats = async () => {
  try {
    const history = await getHistory();
    
    const stats = {
      total: history.length,
      created: history.filter(h => h.action === 'create').length,
      updated: history.filter(h => h.action === 'update').length,
      deleted: history.filter(h => h.action === 'delete').length,
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting history stats:', error);
    return { total: 0, created: 0, updated: 0, deleted: 0 };
  }
};

export default {
  addHistory,
  getHistory,
  clearHistory,
  deleteHistoryItem,
  getHistoryStats,
};