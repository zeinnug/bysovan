// ============================================================
// WHITE BOX TESTING - SISTEM LOGIN
// Aplikasi: Toko Sepatu By Sovan
// File yang diuji: login auth/authService.js, pages/Login.js, data/api.js
// Framework: Jest + React Native Testing Library
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Mock semua dependency eksternal
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('axios');

// Import fungsi yang diuji (sesuaikan path)
import {
  loginUser,
  logoutUser,
  registerUser,
  loadSavedCredentials,
  sendPasswordResetLink,
  resetPassword,
  updatePassword,
  confirmPassword,
  getCurrentUser,
  getLocalUserData,
  isAuthenticated,
  getUserRole,
  getToken,
  clearAuthData,
  checkEmailVerified,
  sendEmailVerification,
} from '../login auth/authService';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue(null);
  AsyncStorage.removeItem.mockResolvedValue(null);
  AsyncStorage.multiRemove.mockResolvedValue(null);
});

// ============================================================
// ============================================================
// TEST SUITE 1: loginUser()
// Jalur Logika:
//   [L1] email kosong → throw Error
//   [L2] password kosong → throw Error
//   [L3] email & password kosong → throw Error
//   [L4] format email tidak valid → throw Error
//   [L5] API sukses + ada token → simpan storage, return {token, user}
//   [L6] API sukses + TIDAK ada token → throw 'Token tidak ditemukan'
//   [L7] rememberMe = true → simpan rememberMe & savedEmail
//   [L8] rememberMe = false → hapus rememberMe & savedEmail
//   [L9] API error 401 → throw pesan sesi berakhir
//   [L10] API error 422 (ada errors object) → throw error pertama dari errors
//   [L11] API error 422 (ada message) → throw data.message
//   [L12] API error 429 → throw pesan terlalu banyak percobaan
//   [L13] API error lain (ada message) → throw data.message
//   [L14] No response (network error) → throw pesan koneksi
//   [L15] Error lain → throw error.message
// ============================================================

describe('loginUser()', () => {

  // ── [L1] Email kosong ──────────────────────────────────────
  describe('[L1] Email kosong', () => {
    test('harus throw error ketika email null', async () => {
      await expect(loginUser(null, 'password123')).rejects.toThrow('Email dan password harus diisi');
    });

    test('harus throw error ketika email string kosong', async () => {
      await expect(loginUser('', 'password123')).rejects.toThrow('Email dan password harus diisi');
    });

    test('harus throw error ketika email undefined', async () => {
      await expect(loginUser(undefined, 'password123')).rejects.toThrow('Email dan password harus diisi');
    });
  });

  // ── [L2] Password kosong ──────────────────────────────────
  describe('[L2] Password kosong', () => {
    test('harus throw error ketika password null', async () => {
      await expect(loginUser('user@test.com', null)).rejects.toThrow('Email dan password harus diisi');
    });

    test('harus throw error ketika password string kosong', async () => {
      await expect(loginUser('user@test.com', '')).rejects.toThrow('Email dan password harus diisi');
    });

    test('harus throw error ketika password undefined', async () => {
      await expect(loginUser('user@test.com', undefined)).rejects.toThrow('Email dan password harus diisi');
    });
  });

  // ── [L3] Email dan Password keduanya kosong ───────────────
  describe('[L3] Email dan Password keduanya kosong', () => {
    test('harus throw error ketika keduanya kosong', async () => {
      await expect(loginUser('', '')).rejects.toThrow('Email dan password harus diisi');
    });

    test('harus throw error ketika keduanya null', async () => {
      await expect(loginUser(null, null)).rejects.toThrow('Email dan password harus diisi');
    });
  });

  // ── [L4] Format email tidak valid ────────────────────────
  describe('[L4] Format email tidak valid', () => {
    const invalidEmails = [
      'tidakvalid',
      'tidakvalid@',
      '@domain.com',
      'user@',
      'user@domain',
      'user @domain.com',
      'user@@domain.com',
    ];

    invalidEmails.forEach((email) => {
      test(`harus throw error untuk email: "${email}"`, async () => {
        await expect(loginUser(email, 'password123')).rejects.toThrow('Format email tidak valid');
      });
    });

    test('harus TIDAK throw error untuk email valid', async () => {
      axios.post.mockResolvedValue({ data: { token: 'abc123', user: { email: 'user@test.com' } } });
      await expect(loginUser('user@test.com', 'password123')).resolves.toBeDefined();
    });
  });

  // ── [L5] API sukses + ada token ───────────────────────────
  describe('[L5] Login berhasil - ada token dari API', () => {
    test('harus mengembalikan token dan user', async () => {
      const mockUser = { id: 1, email: 'user@test.com', name: 'User Test' };
      const mockToken = 'token_sukses_123';

      axios.post.mockResolvedValue({ data: { token: mockToken, user: mockUser } });

      const result = await loginUser('user@test.com', 'password123');

      expect(result.token).toBe(mockToken);
      expect(result.user).toEqual(mockUser);
    });

    test('harus menyimpan token ke AsyncStorage', async () => {
      axios.post.mockResolvedValue({ data: { token: 'token_abc', user: { email: 'user@test.com' } } });

      await loginUser('user@test.com', 'password123');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userToken', 'token_abc');
    });

    test('harus menyimpan userData ke AsyncStorage ketika data.user ada', async () => {
      const mockUser = { id: 1, email: 'user@test.com' };
      axios.post.mockResolvedValue({ data: { token: 'token_abc', user: mockUser } });

      await loginUser('user@test.com', 'password123');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockUser));
    });

    test('harus menangani access_token jika token tidak ada', async () => {
      axios.post.mockResolvedValue({ data: { access_token: 'access_token_xyz', user: {} } });

      const result = await loginUser('user@test.com', 'password123');

      expect(result.token).toBe('access_token_xyz');
    });

    test('email harus di-lowercase sebelum dikirim ke API', async () => {
      axios.post.mockResolvedValue({ data: { token: 'token', user: {} } });

      // Catatan: email tidak boleh ada spasi karena regex validasi akan menolaknya
      // authService.js memang trim() tapi SETELAH regex — jadi kirim tanpa spasi
      await loginUser('USER@TEST.COM', 'password123');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ email: 'user@test.com' }),
        expect.any(Object)
      );
    });
  });

  // ── [L6] API sukses tapi TIDAK ada token ─────────────────
  describe('[L6] API sukses tapi tidak ada token', () => {
    test('harus throw "Token tidak ditemukan"', async () => {
      axios.post.mockResolvedValue({ data: { user: { email: 'user@test.com' } } });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow('Token tidak ditemukan');
    });

    test('harus throw ketika token null', async () => {
      axios.post.mockResolvedValue({ data: { token: null, user: {} } });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow('Token tidak ditemukan');
    });
  });

  // ── [L7] rememberMe = true ────────────────────────────────
  describe('[L7] RememberMe = true', () => {
    test('harus menyimpan rememberMe dan savedEmail', async () => {
      axios.post.mockResolvedValue({ data: { token: 'token', user: {} } });

      await loginUser('user@test.com', 'password123', true);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('rememberMe', 'true');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('savedEmail', 'user@test.com');
    });
  });

  // ── [L8] rememberMe = false ───────────────────────────────
  describe('[L8] RememberMe = false (default)', () => {
    test('harus menghapus rememberMe dan savedEmail dari storage', async () => {
      axios.post.mockResolvedValue({ data: { token: 'token', user: {} } });

      await loginUser('user@test.com', 'password123', false);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rememberMe');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('savedEmail');
    });

    test('rememberMe default false jika tidak diisi', async () => {
      axios.post.mockResolvedValue({ data: { token: 'token', user: {} } });

      await loginUser('user@test.com', 'password123');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rememberMe');
    });
  });

  // ── [L9] Error 401 ────────────────────────────────────────
  describe('[L9] API Error 401 - Unauthorized', () => {
    test('harus throw pesan sesi berakhir', async () => {
      axios.post.mockRejectedValue({
        response: { status: 401, data: {} },
      });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow(
        'Sesi Anda telah berakhir. Silakan login kembali.'
      );
    });
  });

  // ── [L10] Error 422 dengan errors object ──────────────────
  describe('[L10] API Error 422 - Validation (dengan errors object)', () => {
    test('harus throw pesan dari errors[0]', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 422,
          data: { errors: { email: ['Email sudah terdaftar'] } },
        },
      });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow('Email sudah terdaftar');
    });
  });

  // ── [L11] Error 422 dengan message ───────────────────────
  describe('[L11] API Error 422 - Validation (dengan message)', () => {
    test('harus throw data.message', async () => {
      axios.post.mockRejectedValue({
        response: { status: 422, data: { message: 'Kredensial tidak valid' } },
      });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow('Kredensial tidak valid');
    });
  });

  // ── [L12] Error 429 - Rate Limit ─────────────────────────
  describe('[L12] API Error 429 - Rate Limit', () => {
    test('harus throw pesan terlalu banyak percobaan', async () => {
      axios.post.mockRejectedValue({
        response: { status: 429, data: {} },
      });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow(
        'Terlalu banyak percobaan. Silakan coba lagi nanti.'
      );
    });
  });

  // ── [L13] Error lain dari server ─────────────────────────
  describe('[L13] API Error lain dari server (ada message)', () => {
    test('harus throw data.message dari server', async () => {
      axios.post.mockRejectedValue({
        response: { status: 500, data: { message: 'Internal Server Error' } },
      });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow('Internal Server Error');
    });
  });

  // ── [L14] Network error - tidak ada response ──────────────
  describe('[L14] Network Error - tidak ada response', () => {
    test('harus throw pesan koneksi internet', async () => {
      axios.post.mockRejectedValue({ request: {}, message: 'Network Error' });

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow(
        'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
      );
    });
  });

  // ── [L15] Error lainnya ───────────────────────────────────
  describe('[L15] Error lainnya (bukan API, bukan network)', () => {
    test('harus throw error.message asli', async () => {
      axios.post.mockRejectedValue(new Error('Terjadi kesalahan tak terduga'));

      await expect(loginUser('user@test.com', 'password123')).rejects.toThrow(
        'Terjadi kesalahan tak terduga'
      );
    });
  });
});


// ============================================================
// TEST SUITE 2: logoutUser()
// Jalur Logika:
//   [LO1] Ada token → panggil API logout, lalu clearAuthData
//   [LO2] Tidak ada token → skip API, langsung clearAuthData
//   [LO3] API logout gagal → tetap clearAuthData (finally block)
// ============================================================

describe('logoutUser()', () => {

  // ── [LO1] Ada token, API sukses ───────────────────────────
  describe('[LO1] Ada token - logout normal', () => {
    test('harus memanggil API logout dengan token Bearer', async () => {
      AsyncStorage.getItem.mockResolvedValue('token_aktif_123');
      axios.post.mockResolvedValue({ data: {} });

      await logoutUser();

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/logout'),
        {},
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token_aktif_123' }),
        })
      );
    });

    test('harus menghapus semua auth data dari storage setelah API sukses', async () => {
      AsyncStorage.getItem.mockResolvedValue('token_aktif_123');
      axios.post.mockResolvedValue({ data: {} });

      await logoutUser();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['userToken', 'userData', 'rememberMe', 'savedEmail'])
      );
    });
  });

  // ── [LO2] Tidak ada token ─────────────────────────────────
  describe('[LO2] Tidak ada token', () => {
    test('harus skip API call jika token null, tetap clear storage', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      await logoutUser();

      expect(axios.post).not.toHaveBeenCalled();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });

  // ── [LO3] API gagal, finally tetap jalan ─────────────────
  describe('[LO3] API logout gagal', () => {
    test('harus tetap clearAuthData meskipun API gagal (finally block)', async () => {
      AsyncStorage.getItem.mockResolvedValue('token_valid');
      axios.post.mockRejectedValue(new Error('Server Down'));

      await logoutUser(); // tidak boleh throw

      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });
});


// ============================================================
// TEST SUITE 3: loadSavedCredentials()
// Jalur Logika:
//   [SC1] rememberMe = 'true' & savedEmail ada → return {rememberMe: true, savedEmail: '...'}
//   [SC2] rememberMe = null → return {rememberMe: false, savedEmail: ''}
//   [SC3] AsyncStorage error → return default value
// ============================================================

describe('loadSavedCredentials()', () => {

  describe('[SC1] Remember Me aktif dan email tersimpan', () => {
    test('harus mengembalikan rememberMe = true dan email tersimpan', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce('saved@test.com');

      const result = await loadSavedCredentials();

      expect(result.rememberMe).toBe(true);
      expect(result.savedEmail).toBe('saved@test.com');
    });
  });

  describe('[SC2] Remember Me tidak aktif', () => {
    test('harus mengembalikan rememberMe = false dan savedEmail = ""', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await loadSavedCredentials();

      expect(result.rememberMe).toBe(false);
      expect(result.savedEmail).toBe('');
    });

    test('harus mengembalikan rememberMe = false jika nilai bukan "true"', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('false')
        .mockResolvedValueOnce(null);

      const result = await loadSavedCredentials();

      expect(result.rememberMe).toBe(false);
    });
  });

  describe('[SC3] AsyncStorage error', () => {
    test('harus mengembalikan default value saat error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await loadSavedCredentials();

      expect(result.rememberMe).toBe(false);
      expect(result.savedEmail).toBe('');
    });
  });
});


// ============================================================
// TEST SUITE 4: isAuthenticated()
// Jalur Logika:
//   [IA1] Token ada di storage → return true
//   [IA2] Token null → return false
//   [IA3] Error → return false
// ============================================================

describe('isAuthenticated()', () => {

  test('[IA1] Harus return true jika ada token', async () => {
    AsyncStorage.getItem.mockResolvedValue('valid_token_123');
    const result = await isAuthenticated();
    expect(result).toBe(true);
  });

  test('[IA2] Harus return false jika token null', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    const result = await isAuthenticated();
    expect(result).toBe(false);
  });

  test('[IA3] Harus return false jika storage error', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
    const result = await isAuthenticated();
    expect(result).toBe(false);
  });
});


// ============================================================
// TEST SUITE 5: getToken()
// Jalur Logika:
//   [GT1] Token ada → return token
//   [GT2] Token tidak ada → return null
//   [GT3] AsyncStorage error → return null
// ============================================================

describe('getToken()', () => {

  test('[GT1] Harus return token jika tersimpan', async () => {
    AsyncStorage.getItem.mockResolvedValue('myToken123');
    const token = await getToken();
    expect(token).toBe('myToken123');
  });

  test('[GT2] Harus return null jika tidak ada token', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    const token = await getToken();
    expect(token).toBeNull();
  });

  test('[GT3] Harus return null jika AsyncStorage error', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
    const token = await getToken();
    expect(token).toBeNull();
  });
});


// ============================================================
// TEST SUITE 6: clearAuthData()
// Jalur Logika:
//   [CA1] Berhasil → panggil multiRemove dengan keys yang benar
//   [CA2] Error → tidak throw (error ditangkap)
// ============================================================

describe('clearAuthData()', () => {

  test('[CA1] Harus menghapus semua kunci auth dari storage', async () => {
    await clearAuthData();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
      expect.arrayContaining(['userToken', 'userData', 'rememberMe', 'savedEmail'])
    );
  });

  test('[CA2] Harus tidak throw error meskipun multiRemove gagal', async () => {
    AsyncStorage.multiRemove.mockRejectedValue(new Error('Storage error'));
    await expect(clearAuthData()).resolves.not.toThrow();
  });
});


// ============================================================
// TEST SUITE 7: registerUser()
// Jalur Logika:
//   [R1] Field ada yang kosong → throw error
//   [R2] Password tidak cocok → throw error
//   [R3] Format email tidak valid → throw error
//   [R4] Registrasi sukses → simpan token & user
// ============================================================

describe('registerUser()', () => {

  test('[R1] Harus throw error jika ada field kosong', async () => {
    await expect(registerUser('', 'email@test.com', 'pass', 'pass')).rejects.toThrow('Semua field harus diisi');
    await expect(registerUser('Nama', '', 'pass', 'pass')).rejects.toThrow('Semua field harus diisi');
    await expect(registerUser('Nama', 'email@test.com', '', 'pass')).rejects.toThrow('Semua field harus diisi');
  });

  test('[R2] Harus throw error jika password tidak cocok', async () => {
    await expect(registerUser('Nama', 'email@test.com', 'pass1', 'pass2')).rejects.toThrow(
      'Password dan konfirmasi password tidak cocok'
    );
  });

  test('[R3] Harus throw error jika format email tidak valid', async () => {
    await expect(registerUser('Nama', 'emailtidakvalid', 'pass', 'pass')).rejects.toThrow(
      'Format email tidak valid'
    );
  });

  test('[R4] Harus berhasil dan simpan token + user data', async () => {
    const mockToken = 'new_user_token';
    const mockUser = { id: 2, name: 'Nama Baru', email: 'new@test.com' };
    axios.post.mockResolvedValue({ data: { token: mockToken, user: mockUser } });

    const result = await registerUser('Nama Baru', 'new@test.com', 'password', 'password');

    expect(result.token).toBe(mockToken);
    expect(result.user).toEqual(mockUser);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userToken', mockToken);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockUser));
  });
});


// ============================================================
// TEST SUITE 8: sendPasswordResetLink()
// Jalur Logika:
//   [PR1] Email kosong → throw error
//   [PR2] Format email tidak valid → throw error
//   [PR3] API sukses → return data
// ============================================================

describe('sendPasswordResetLink()', () => {

  test('[PR1] Harus throw error ketika email kosong', async () => {
    await expect(sendPasswordResetLink('')).rejects.toThrow('Email harus diisi');
    await expect(sendPasswordResetLink(null)).rejects.toThrow('Email harus diisi');
  });

  test('[PR2] Harus throw error jika format email tidak valid', async () => {
    await expect(sendPasswordResetLink('emailsalah')).rejects.toThrow('Format email tidak valid');
  });

  test('[PR3] Harus berhasil mengirim link reset', async () => {
    axios.post.mockResolvedValue({ data: { message: 'Email terkirim' } });

    const result = await sendPasswordResetLink('user@test.com');

    expect(result).toEqual({ message: 'Email terkirim' });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/forgot-password'),
      expect.objectContaining({ email: 'user@test.com' }),
      expect.any(Object)
    );
  });
});


// ============================================================
// TEST SUITE 9: resetPassword()
// Jalur Logika:
//   [RP1] Field kosong → throw error
//   [RP2] Password tidak cocok → throw error
//   [RP3] Sukses → return data
// ============================================================

describe('resetPassword()', () => {

  test('[RP1] Harus throw error jika ada field kosong', async () => {
    await expect(resetPassword('', 'pass', 'pass', 'token')).rejects.toThrow('Semua field harus diisi');
    await expect(resetPassword('user@test.com', '', 'pass', 'token')).rejects.toThrow('Semua field harus diisi');
    await expect(resetPassword('user@test.com', 'pass', 'pass', '')).rejects.toThrow('Semua field harus diisi');
  });

  test('[RP2] Harus throw error jika password tidak cocok', async () => {
    await expect(resetPassword('user@test.com', 'pass1', 'pass2', 'reset_token')).rejects.toThrow(
      'Password dan konfirmasi password tidak cocok'
    );
  });

  test('[RP3] Harus berhasil reset password', async () => {
    axios.post.mockResolvedValue({ data: { message: 'Password berhasil direset' } });

    const result = await resetPassword('user@test.com', 'newpass', 'newpass', 'valid_token');

    expect(result).toEqual({ message: 'Password berhasil direset' });
  });
});


// ============================================================
// TEST SUITE 10: updatePassword()
// Jalur Logika:
//   [UP1] Field kosong → throw error
//   [UP2] Password baru tidak cocok → throw error
//   [UP3] Sukses → panggil API PUT /password
// ============================================================

describe('updatePassword()', () => {

  test('[UP1] Harus throw error jika field kosong', async () => {
    await expect(updatePassword('', 'newpass', 'newpass')).rejects.toThrow('Semua field harus diisi');
    await expect(updatePassword('oldpass', '', 'newpass')).rejects.toThrow('Semua field harus diisi');
    await expect(updatePassword('oldpass', 'newpass', '')).rejects.toThrow('Semua field harus diisi');
  });

  test('[UP2] Harus throw error jika password baru tidak cocok', async () => {
    await expect(updatePassword('oldpass', 'newpass1', 'newpass2')).rejects.toThrow(
      'Password baru dan konfirmasi tidak cocok'
    );
  });

  test('[UP3] Harus berhasil update password dengan token Bearer', async () => {
    AsyncStorage.getItem.mockResolvedValue('valid_token');
    axios.put.mockResolvedValue({ data: { message: 'Password diperbarui' } });

    const result = await updatePassword('oldpass', 'newpass', 'newpass');

    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/password'),
      expect.objectContaining({
        current_password: 'oldpass',
        password: 'newpass',
        password_confirmation: 'newpass',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid_token' }),
      })
    );
  });
});


// ============================================================
// TEST SUITE 11: getCurrentUser()
// Jalur Logika:
//   [CU1] Tidak ada token → throw 'Token tidak ditemukan'
//   [CU2] Ada token, API sukses → simpan ke storage, return data
// ============================================================

describe('getCurrentUser()', () => {

  test('[CU1] Harus throw error jika tidak ada token', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    await expect(getCurrentUser()).rejects.toThrow('Token tidak ditemukan');
  });

  test('[CU2] Harus return user data dan simpan ke storage', async () => {
    const mockUser = { id: 1, email: 'user@test.com', name: 'User' };
    AsyncStorage.getItem.mockResolvedValue('valid_token');
    axios.get.mockResolvedValue({ data: mockUser });

    const result = await getCurrentUser();

    expect(result).toEqual(mockUser);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockUser));
  });
});


// ============================================================
// TEST SUITE 12: getLocalUserData()
// Jalur Logika:
//   [LU1] Data tersimpan → parse dan return
//   [LU2] Data null → return null
//   [LU3] Error → return null
// ============================================================

describe('getLocalUserData()', () => {

  test('[LU1] Harus return parsed user data dari storage', async () => {
    const mockUser = { id: 1, name: 'Test User' };
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockUser));

    const result = await getLocalUserData();

    expect(result).toEqual(mockUser);
  });

  test('[LU2] Harus return null jika data tidak ada', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const result = await getLocalUserData();

    expect(result).toBeNull();
  });

  test('[LU3] Harus return null jika terjadi error', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    const result = await getLocalUserData();

    expect(result).toBeNull();
  });
});


// ============================================================
// TEST SUITE 13: getUserRole()
// Jalur Logika:
//   [GR1] User punya role → return role
//   [GR2] User tidak ada → return null
// ============================================================

describe('getUserRole()', () => {

  test('[GR1] Harus return role jika user data ada', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ role: 'admin' }));

    const role = await getUserRole();

    expect(role).toBe('admin');
  });

  test('[GR2] Harus return null jika tidak ada user data', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const role = await getUserRole();

    expect(role).toBeNull();
  });
});


// ============================================================
// TEST SUITE 14: checkEmailVerified()
// Jalur Logika:
//   [EV1] email_verified_at ada dan tidak null → return true
//   [EV2] email_verified_at null/undefined → return false
//   [EV3] Tidak ada userData → return false
// ============================================================

describe('checkEmailVerified()', () => {

  test('[EV1] Harus return true jika email_verified_at ada', async () => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ email_verified_at: '2025-01-01T00:00:00Z' })
    );

    const result = await checkEmailVerified();

    expect(result).toBe(true);
  });

  test('[EV2] Harus return false jika email_verified_at null', async () => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ email_verified_at: null })
    );

    const result = await checkEmailVerified();

    expect(result).toBe(false);
  });

  test('[EV3] Harus return false jika tidak ada userData', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const result = await checkEmailVerified();

    expect(result).toBe(false);
  });
});


// ============================================================
// TEST SUITE 15: confirmPassword()
// Jalur Logika:
//   [CP1] Password kosong → throw error
//   [CP2] Sukses → panggil API dengan token
// ============================================================

describe('confirmPassword()', () => {

  test('[CP1] Harus throw error jika password kosong', async () => {
    await expect(confirmPassword('')).rejects.toThrow('Password harus diisi');
    await expect(confirmPassword(null)).rejects.toThrow('Password harus diisi');
  });

  test('[CP2] Harus berhasil konfirmasi password dengan token Bearer', async () => {
    AsyncStorage.getItem.mockResolvedValue('valid_token');
    axios.post.mockResolvedValue({ data: { message: 'Konfirmasi berhasil' } });

    const result = await confirmPassword('mypassword');

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/confirm-password'),
      expect.objectContaining({ password: 'mypassword' }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid_token' }),
      })
    );
  });
});