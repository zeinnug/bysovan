// login auth/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

// ==================== HELPER FUNCTIONS ====================

/**
 * Get stored token from AsyncStorage
 */
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem('userToken');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Clear all auth data from storage
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(['userToken', 'userData', 'rememberMe', 'savedEmail']);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// ==================== 1. LOGIN (AuthenticatedSessionController) ====================

/**
 * Login user with email and password
 * Endpoint: POST /api/login
 * Laravel Controller: AuthenticatedSessionController@store
 */
export const loginUser = async (email, password, rememberMe = false) => {
  if (!email || !password) {
    throw new Error('Email dan password harus diisi');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Format email tidak valid');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      email: email.toLowerCase().trim(),
      password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;
    const token = data.token || data.access_token;

    if (!token) {
      throw new Error('Token tidak ditemukan');
    }

    // Simpan token & user data
    await AsyncStorage.setItem('userToken', token);
    if (data.user) {
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
    }

    // Handle "Remember Me"
    if (rememberMe) {
      await AsyncStorage.setItem('rememberMe', 'true');
      await AsyncStorage.setItem('savedEmail', email);
    } else {
      await AsyncStorage.removeItem('rememberMe');
      await AsyncStorage.removeItem('savedEmail');
    }

    return { token, user: data.user || { email } };

  } catch (error) {
    throw handleApiError(error, 'Login gagal');
  }
};

/**
 * Load saved credentials from storage
 */
export const loadSavedCredentials = async () => {
  try {
    const savedRememberMe = await AsyncStorage.getItem('rememberMe');
    const savedEmail = await AsyncStorage.getItem('savedEmail');
    return { 
      rememberMe: savedRememberMe === 'true', 
      savedEmail: savedEmail || '' 
    };
  } catch (error) {
    console.error('Error loading saved credentials:', error);
    return { rememberMe: false, savedEmail: '' };
  }
};

// ==================== 2. LOGOUT (AuthenticatedSessionController) ====================

/**
 * Logout current user
 * Endpoint: POST /api/logout
 * Laravel Controller: AuthenticatedSessionController@destroy
 */
export const logoutUser = async () => {
  try {
    const token = await getToken();
    
    if (token) {
      await axios.post(`${API_BASE_URL}/logout`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    // Clear local data regardless of API response
    await clearAuthData();
  }
};

// ==================== 3. REGISTER (RegisteredUserController) ====================

/**
 * Register new user
 * Endpoint: POST /api/register
 * Laravel Controller: RegisteredUserController@store
 */
export const registerUser = async (name, email, password, passwordConfirmation) => {
  if (!name || !email || !password || !passwordConfirmation) {
    throw new Error('Semua field harus diisi');
  }

  if (password !== passwordConfirmation) {
    throw new Error('Password dan konfirmasi password tidak cocok');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Format email tidak valid');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/register`, {
      name,
      email: email.toLowerCase().trim(),
      password,
      password_confirmation: passwordConfirmation
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;
    const token = data.token || data.access_token;

    if (token) {
      await AsyncStorage.setItem('userToken', token);
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }
    }

    return { token, user: data.user };

  } catch (error) {
    throw handleApiError(error, 'Registrasi gagal');
  }
};

// ==================== 4. EMAIL VERIFICATION ====================

/**
 * Send email verification notification
 * Endpoint: POST /api/email/verification-notification
 * Laravel Controller: EmailVerificationNotificationController@store
 */
export const sendEmailVerification = async () => {
  try {
    const token = await getToken();
    
    const response = await axios.post(
      `${API_BASE_URL}/email/verification-notification`, 
      {},
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;

  } catch (error) {
    throw handleApiError(error, 'Gagal mengirim email verifikasi');
  }
};

/**
 * Verify email with token
 * Endpoint: GET /api/email/verify/{id}/{hash}
 * Laravel Controller: VerifyEmailController@__invoke
 * Note: This is typically handled via email link, not direct API call
 */
export const verifyEmail = async (id, hash) => {
  try {
    const token = await getToken();
    
    const response = await axios.get(
      `${API_BASE_URL}/email/verify/${id}/${hash}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
        }
      }
    );

    // Update local user data if verification successful
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      user.email_verified_at = new Date().toISOString();
      await AsyncStorage.setItem('userData', JSON.stringify(user));
    }

    return response.data;

  } catch (error) {
    throw handleApiError(error, 'Verifikasi email gagal');
  }
};

/**
 * Check if email is verified
 */
export const checkEmailVerified = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      return !!user.email_verified_at;
    }
    return false;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
};

// ==================== 5. PASSWORD RESET ====================

/**
 * Send password reset link
 * Endpoint: POST /api/forgot-password
 * Laravel Controller: PasswordResetLinkController@store
 */
export const sendPasswordResetLink = async (email) => {
  if (!email) {
    throw new Error('Email harus diisi');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Format email tidak valid');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/forgot-password`, {
      email: email.toLowerCase().trim()
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;

  } catch (error) {
    throw handleApiError(error, 'Gagal mengirim link reset password');
  }
};

/**
 * Reset password with token
 * Endpoint: POST /api/reset-password
 * Laravel Controller: NewPasswordController@store
 */
export const resetPassword = async (email, password, passwordConfirmation, token) => {
  if (!email || !password || !passwordConfirmation || !token) {
    throw new Error('Semua field harus diisi');
  }

  if (password !== passwordConfirmation) {
    throw new Error('Password dan konfirmasi password tidak cocok');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/reset-password`, {
      email: email.toLowerCase().trim(),
      password,
      password_confirmation: passwordConfirmation,
      token
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;

  } catch (error) {
    throw handleApiError(error, 'Reset password gagal');
  }
};

// ==================== 6. UPDATE PASSWORD (Authenticated User) ====================

/**
 * Update current user's password
 * Endpoint: PUT /api/password
 * Laravel Controller: PasswordController@update
 */
export const updatePassword = async (currentPassword, newPassword, passwordConfirmation) => {
  if (!currentPassword || !newPassword || !passwordConfirmation) {
    throw new Error('Semua field harus diisi');
  }

  if (newPassword !== passwordConfirmation) {
    throw new Error('Password baru dan konfirmasi tidak cocok');
  }

  try {
    const token = await getToken();
    
    const response = await axios.put(`${API_BASE_URL}/password`, {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: passwordConfirmation
    }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;

  } catch (error) {
    throw handleApiError(error, 'Update password gagal');
  }
};

// ==================== 7. CONFIRM PASSWORD ====================

/**
 * Confirm user's password for sensitive operations
 * Endpoint: POST /api/confirm-password
 * Laravel Controller: ConfirmablePasswordController@store
 */
export const confirmPassword = async (password) => {
  if (!password) {
    throw new Error('Password harus diisi');
  }

  try {
    const token = await getToken();
    
    const response = await axios.post(`${API_BASE_URL}/confirm-password`, {
      password
    }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;

  } catch (error) {
    throw handleApiError(error, 'Konfirmasi password gagal');
  }
};

// ==================== 8. GET USER DATA ====================

/**
 * Get current authenticated user data
 * Endpoint: GET /api/user
 */
export const getCurrentUser = async () => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Token tidak ditemukan');
    }

    const response = await axios.get(`${API_BASE_URL}/user`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      }
    });

    // Update local storage
    await AsyncStorage.setItem('userData', JSON.stringify(response.data));

    return response.data;

  } catch (error) {
    throw handleApiError(error, 'Gagal mengambil data user');
  }
};

/**
 * Get user data from local storage
 */
export const getLocalUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting local user data:', error);
    return null;
  }
};

// ==================== ERROR HANDLER ====================

/**
 * Centralized error handler for API calls
 */
const handleApiError = (error, defaultMessage) => {
  console.error('API Error:', error);
  
  let errorMessage = defaultMessage || 'Terjadi kesalahan';

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) {
      errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
      clearAuthData(); // Auto logout on 401
    } else if (status === 422) {
      // Validation error
      if (data.errors) {
        const firstError = Object.values(data.errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (data.message) {
        errorMessage = data.message;
      } else {
        errorMessage = 'Data tidak valid';
      }
    } else if (status === 429) {
      errorMessage = 'Terlalu banyak percobaan. Silakan coba lagi nanti.';
    } else if (data?.message) {
      errorMessage = data.message;
    }
  } else if (error.request) {
    // Request made but no response
    errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  } else if (error.message) {
    // Other errors
    errorMessage = error.message;
  }

  return new Error(errorMessage);
};

// ==================== AUTH STATE CHECK ====================

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const token = await getToken();
    return !!token;
  } catch (error) {
    return false;
  }
};

/**
 * Get user role from local storage
 */
export const getUserRole = async () => {
  try {
    const userData = await getLocalUserData();
    return userData?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// ==================== EXPORTS ====================

export default {
  // Login & Logout
  loginUser,
  logoutUser,
  loadSavedCredentials,
  
  // Register
  registerUser,
  
  // Email Verification
  sendEmailVerification,
  verifyEmail,
  checkEmailVerified,
  
  // Password Reset
  sendPasswordResetLink,
  resetPassword,
  
  // Password Update & Confirm
  updatePassword,
  confirmPassword,
  
  // User Data
  getCurrentUser,
  getLocalUserData,
  getUserRole,
  
  // Auth State
  isAuthenticated,
  getToken,
  clearAuthData,
};