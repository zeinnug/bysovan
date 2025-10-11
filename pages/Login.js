import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    // Validasi input
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Format email tidak valid');
      return;
    }

    setIsLoading(true);

    try {
      // API Call untuk login
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email: formData.email,
        password: formData.password
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = response.data;
      
      // Simpan token dan user data ke AsyncStorage
      if (data.token || data.access_token) {
        const token = data.token || data.access_token;
        await AsyncStorage.setItem('userToken', token);
        
        // Simpan data user
        if (data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        }

        // Simpan remember me preference
        if (rememberMe) {
          await AsyncStorage.setItem('rememberMe', 'true');
          await AsyncStorage.setItem('savedEmail', formData.email);
        } else {
          await AsyncStorage.removeItem('rememberMe');
          await AsyncStorage.removeItem('savedEmail');
        }

        // Callback ke App.js untuk update state
        onLoginSuccess({
          token: token,
          user: data.user || { email: formData.email }
        });

      } else {
        Alert.alert('Error', 'Login gagal. Token tidak ditemukan.');
      }

    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          errorMessage = 'Email atau password salah';
        } else if (error.response.status === 422) {
          errorMessage = 'Data tidak valid. Periksa kembali input Anda';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      }

      Alert.alert('Login Gagal', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved email jika remember me aktif
  React.useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      
      if (savedRememberMe === 'true' && savedEmail) {
        setFormData(prev => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Octicons name="package" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName}>SepatuBySovan</Text>
          <Text style={styles.brandTagline}>Sistem Manajemen Toko Sepatu</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Selamat Datang</Text>
          <Text style={styles.subtitleText}>Silakan login untuk melanjutkan</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="mail" size={20} color="#585757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="contoh@email.com"
                placeholderTextColor="#999"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase().trim() })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="lock" size={20} color="#585757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Octicons name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.rememberMeText}>Ingat Saya</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => Alert.alert('Info', 'Fitur Lupa Password belum tersedia. Silakan hubungi admin.')}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Lupa Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingText}>Memproses...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          {/* Contact Admin */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Belum punya akun? </Text>
            <TouchableOpacity 
              onPress={() => Alert.alert('Info', 'Silakan hubungi admin untuk membuat akun baru')}
              disabled={isLoading}
            >
              <Text style={styles.registerLink}>Hubungi Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>© 2025 SepatuBySovan. All rights reserved.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5ECE4',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FC6A0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FC6A0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#292929',
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 14,
    color: '#585757',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#292929',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#585757',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292929',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5ECE4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#585757',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#292929',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#585757',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FC6A0A',
    borderColor: '#FC6A0A',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#585757',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#FC6A0A',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#FC6A0A',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FC6A0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#585757',
  },
  registerLink: {
    fontSize: 14,
    color: '#FC6A0A',
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#585757',
  },
});

export default Login;