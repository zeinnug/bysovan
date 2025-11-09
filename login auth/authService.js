// login auth/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

const API_BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

// Fungsi login (backend logic)
export const loginUser = async (email, password, rememberMe) => {
  if (!email || !password) {
    throw new Error('Email dan password harus diisi');
  }

  // Validasi format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Format email tidak valid');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      email,
      password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;
    if (!data.token && !data.access_token) {
      throw new Error('Token tidak ditemukan.');
    }

    const token = data.token || data.access_token;

    // Simpan token & data user
    await AsyncStorage.setItem('userToken', token);
    if (data.user) {
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
    }

    // Simpan preferensi "ingat saya"
    if (rememberMe) {
      await AsyncStorage.setItem('rememberMe', 'true');
      await AsyncStorage.setItem('savedEmail', email);
    } else {
      await AsyncStorage.removeItem('rememberMe');
      await AsyncStorage.removeItem('savedEmail');
    }

    return { token, user: data.user || { email } };

  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';

    if (error.response) {
      if (error.response.status === 401) errorMessage = 'Email atau password salah';
      else if (error.response.status === 422) errorMessage = 'Data tidak valid';
      else if (error.response.data?.message) errorMessage = error.response.data.message;
    } else if (error.request) {
      errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    }

    throw new Error(errorMessage);
  }
};

// Fungsi untuk memuat data rememberMe
export const loadSavedCredentials = async () => {
  try {
    const savedRememberMe = await AsyncStorage.getItem('rememberMe');
    const savedEmail = await AsyncStorage.getItem('savedEmail');
    return { rememberMe: savedRememberMe === 'true', savedEmail };
  } catch (error) {
    console.error('Error loading saved credentials:', error);
    return { rememberMe: false, savedEmail: '' };
  }
};
