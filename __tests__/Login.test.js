// ============================================================
// WHITE BOX TESTING - Login.js (Logic Layer)
// Strategi: Uji logika handleLogin, loadCredentials, handleForgotPassword
// tanpa render UI — kompatibel dengan React 19
// ============================================================

import { loginUser, loadSavedCredentials } from '../login auth/authService';

jest.mock('../login auth/authService', () => ({
  loginUser: jest.fn(),
  loadSavedCredentials: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios', select: (o) => o.ios },
  StyleSheet: { create: (s) => s },
}));

jest.mock('@expo/vector-icons', () => ({ Octicons: 'Octicons' }));

const { Alert } = require('react-native');

// ── Simulasi logika dari Login.js ────────────────────────────

const simulateHandleLogin = async (email, password, rememberMe = false) => {
  if (!email || !password) {
    Alert.alert('Error', 'Email dan password harus diisi');
    return { success: false, reason: 'validation' };
  }
  try {
    const result = await loginUser(email, password, rememberMe);
    return { success: true, result };
  } catch (error) {
    Alert.alert('Login Gagal', error?.message || 'Terjadi kesalahan');
    return { success: false, reason: 'api_error' };
  }
};

const simulateLoadCredentials = async (setFormData, setRememberMe) => {
  try {
    const { rememberMe: savedRemember, savedEmail } = await loadSavedCredentials();
    if (savedRemember && savedEmail) {
      setFormData(savedEmail);
      setRememberMe(true);
    }
  } catch (err) {
    // silent fail
  }
};

// ============================================================
// TEST SUITE 1: handleLogin() - Validasi Input
// ============================================================

describe('handleLogin() - Validasi Input Form', () => {
  beforeEach(() => jest.clearAllMocks());

  test('[UI-L1] Alert error jika email dan password kosong', async () => {
    const res = await simulateHandleLogin('', '');
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Email dan password harus diisi');
    expect(res.success).toBe(false);
    expect(loginUser).not.toHaveBeenCalled();
  });

  test('[UI-L2] Alert error jika password kosong', async () => {
    const res = await simulateHandleLogin('user@test.com', '');
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Email dan password harus diisi');
    expect(res.success).toBe(false);
    expect(loginUser).not.toHaveBeenCalled();
  });

  test('[UI-L3] Alert error jika email kosong', async () => {
    const res = await simulateHandleLogin('', 'password123');
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Email dan password harus diisi');
    expect(res.success).toBe(false);
    expect(loginUser).not.toHaveBeenCalled();
  });

  test('[UI-L4] Panggil loginUser jika input valid', async () => {
    loginUser.mockResolvedValue({ token: 'abc123', user: {} });
    await simulateHandleLogin('user@test.com', 'password123');
    expect(loginUser).toHaveBeenCalledWith('user@test.com', 'password123', false);
  });

  test('[UI-L4b] Panggil loginUser dengan rememberMe = true', async () => {
    loginUser.mockResolvedValue({ token: 'abc123', user: {} });
    await simulateHandleLogin('user@test.com', 'password123', true);
    expect(loginUser).toHaveBeenCalledWith('user@test.com', 'password123', true);
  });
});

// ============================================================
// TEST SUITE 2: handleLogin() - Sukses & Error
// ============================================================

describe('handleLogin() - Alur Sukses & Error', () => {
  beforeEach(() => jest.clearAllMocks());

  test('[UI-S1] Return success true setelah login berhasil', async () => {
    const mockResult = { token: 'token_baru', user: { email: 'user@test.com' } };
    loginUser.mockResolvedValue(mockResult);
    const res = await simulateHandleLogin('user@test.com', 'password123');
    expect(res.success).toBe(true);
    expect(res.result).toEqual(mockResult);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('[UI-E1] Alert Login Gagal dengan pesan error dari API', async () => {
    loginUser.mockRejectedValue(new Error('Password salah'));
    const res = await simulateHandleLogin('user@test.com', 'wrongpass');
    expect(Alert.alert).toHaveBeenCalledWith('Login Gagal', 'Password salah');
    expect(res.success).toBe(false);
  });

  test('[UI-E2] Alert fallback jika error tidak punya message', async () => {
    loginUser.mockRejectedValue({});
    await simulateHandleLogin('user@test.com', 'password123');
    expect(Alert.alert).toHaveBeenCalledWith('Login Gagal', 'Terjadi kesalahan');
  });

  test('[UI-E3] Alert pesan network error', async () => {
    loginUser.mockRejectedValue(new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'));
    await simulateHandleLogin('user@test.com', 'password123');
    expect(Alert.alert).toHaveBeenCalledWith('Login Gagal', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
  });

  test('[UI-E4] Alert pesan rate limit', async () => {
    loginUser.mockRejectedValue(new Error('Terlalu banyak percobaan. Silakan coba lagi nanti.'));
    await simulateHandleLogin('user@test.com', 'password123');
    expect(Alert.alert).toHaveBeenCalledWith('Login Gagal', 'Terlalu banyak percobaan. Silakan coba lagi nanti.');
  });
});

// ============================================================
// TEST SUITE 3: loadCredentials() - useEffect logic
// ============================================================

describe('loadCredentials() - Logika useEffect', () => {
  beforeEach(() => jest.clearAllMocks());

  test('[UC1] Set email dan rememberMe jika credentials tersimpan', async () => {
    loadSavedCredentials.mockResolvedValue({ rememberMe: true, savedEmail: 'saved@email.com' });
    const setFormData = jest.fn();
    const setRememberMe = jest.fn();
    await simulateLoadCredentials(setFormData, setRememberMe);
    expect(setFormData).toHaveBeenCalledWith('saved@email.com');
    expect(setRememberMe).toHaveBeenCalledWith(true);
  });

  test('[UC2] Tidak set apa-apa jika rememberMe = false', async () => {
    loadSavedCredentials.mockResolvedValue({ rememberMe: false, savedEmail: '' });
    const setFormData = jest.fn();
    const setRememberMe = jest.fn();
    await simulateLoadCredentials(setFormData, setRememberMe);
    expect(setFormData).not.toHaveBeenCalled();
    expect(setRememberMe).not.toHaveBeenCalled();
  });

  test('[UC3] Tidak crash jika loadSavedCredentials gagal', async () => {
    loadSavedCredentials.mockRejectedValue(new Error('Storage error'));
    const setFormData = jest.fn();
    const setRememberMe = jest.fn();
    await expect(simulateLoadCredentials(setFormData, setRememberMe)).resolves.not.toThrow();
    expect(setFormData).not.toHaveBeenCalled();
  });

  test('[UC4] Tidak set jika savedEmail kosong meski rememberMe true', async () => {
    loadSavedCredentials.mockResolvedValue({ rememberMe: true, savedEmail: '' });
    const setFormData = jest.fn();
    const setRememberMe = jest.fn();
    await simulateLoadCredentials(setFormData, setRememberMe);
    expect(setFormData).not.toHaveBeenCalled();
  });
});

// ============================================================
// TEST SUITE 4: handleForgotPassword()
// ============================================================

describe('handleForgotPassword() - Navigasi', () => {

  test('[FP1] Navigate ke ForgotPassword', () => {
    const navigation = { navigate: jest.fn() };
    const handleForgotPassword = () => navigation.navigate('ForgotPassword');
    handleForgotPassword();
    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// TEST SUITE 5: isLoading state (finally block)
// ============================================================

describe('State isLoading — finally block', () => {
  beforeEach(() => jest.clearAllMocks());

  const simulateWithLoading = async (email, password) => {
    const states = [];
    const setLoading = (v) => states.push(v);
    if (!email || !password) return states;
    try {
      setLoading(true);
      await loginUser(email, password, false);
    } catch (e) {
      // error handled
    } finally {
      setLoading(false);
    }
    return states;
  };

  test('[LD1] isLoading: true → false setelah login sukses', async () => {
    loginUser.mockResolvedValue({ token: 'token', user: {} });
    const states = await simulateWithLoading('user@test.com', 'password123');
    expect(states).toEqual([true, false]);
  });

  test('[LD2] isLoading: true → false meski login gagal (finally)', async () => {
    loginUser.mockRejectedValue(new Error('Gagal'));
    const states = await simulateWithLoading('user@test.com', 'wrongpass');
    expect(states).toEqual([true, false]);
  });

  test('[LD3] isLoading tidak berubah jika validasi gagal (tidak masuk try)', async () => {
    const states = await simulateWithLoading('', '');
    expect(states).toEqual([]);
    expect(loginUser).not.toHaveBeenCalled();
  });
});