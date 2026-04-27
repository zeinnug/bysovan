// data/services/userService.js
// Service untuk mengambil daftar user/kasir (digunakan di filter Laporan Transaksi)

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants';

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('userToken');
  } catch {
    return null;
  }
};

/**
 * Ambil daftar semua user/kasir dari API.
 * Jika endpoint tidak tersedia (404), return { success: false } — caller akan fallback ke data transaksi.
 */
export const getUsers = async () => {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, data: [] };

    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: { per_page: 9999 },
      timeout: 10000,
    });

    const raw = response.data;
    const list =
      raw?.data ||
      raw?.users ||
      (Array.isArray(raw) ? raw : []);

    if (!Array.isArray(list)) return { success: false, data: [] };

    // Kembalikan objek { id, name } supaya bisa meniru filter user_id di website
    const users = list
      .map((u) => {
        const id =
          u?.id ??
          u?.user_id ??
          u?.uid ??
          null;
        const name =
          u?.name ||
          u?.username ||
          (typeof u?.email === 'string' ? u.email.split('@')[0] : null);

        if (!id || !name) return null;
        return { id, name };
      })
      .filter(Boolean);

    // Deduplicate berdasarkan id
    const dedup = [];
    const seen = new Set();
    users.forEach((u) => {
      const key = String(u.id);
      if (!seen.has(key)) {
        seen.add(key);
        dedup.push(u);
      }
    });

    return { success: true, data: dedup };
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 403) {
      return { success: false, data: [] };
    }
    console.warn('[userService] getUsers failed:', err.message);
    return { success: false, data: [] };
  }
};
