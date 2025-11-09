// pages/Login.js
import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';
import { loginUser, loadSavedCredentials } from '../login auth/authService';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { rememberMe: savedRemember, savedEmail } = await loadSavedCredentials();
        if (savedRemember && savedEmail) {
          setFormData(prev => ({ ...prev, email: savedEmail }));
          setRememberMe(true);
        }
      } catch (err) {
        // silent fail — optional logging: console.warn(err);
      }
    })();
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await loginUser(formData.email, formData.password, rememberMe);
      onLoginSuccess(result);
    } catch (error) {
      Alert.alert('Login Gagal', error?.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Octicons name="package" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName}>SepatuBySovan</Text>
          <Text style={styles.brandTagline}>Sistem Manajemen Toko Sepatu</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Selamat Datang</Text>
          <Text style={styles.subtitleText}>Silakan login untuk melanjutkan</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="mail" size={20} color="#585757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="contoh@email.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase().trim() })}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="lock" size={20} color="#585757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                editable={!isLoading}
              />
            </View>
          </View>

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
              onPress={() => Alert.alert('Info', 'Fitur lupa password belum tersedia.')}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Lupa Password?</Text>
            </TouchableOpacity>
          </View>

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

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => Alert.alert('Info', 'Hubungi admin untuk membuat akun baru')}>
              <Text style={styles.registerLink}>Hubungi Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>© 2025 SepatuBySovan. All rights reserved.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5ECE4' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FC6A0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandName: { fontSize: 32, fontWeight: 'bold', color: '#292929', marginBottom: 8 },
  brandTagline: { fontSize: 14, color: '#585757' },
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#292929', marginBottom: 8 },
  subtitleText: { fontSize: 14, color: '#585757', marginBottom: 24 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#292929', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5ECE4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#585757',
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, fontSize: 16, color: '#292929' },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  rememberMeContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#585757', marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#FC6A0A', borderColor: '#FC6A0A' },
  rememberMeText: { fontSize: 14, color: '#585757' },
  forgotPasswordText: { fontSize: 14, color: '#FC6A0A', fontWeight: '600' },
  loginButton: { backgroundColor: '#FC6A0A', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center' },
  loginButtonDisabled: { opacity: 0.6 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: '#585757' },
  registerLink: { fontSize: 14, color: '#FC6A0A', fontWeight: '600' },
  footerText: { textAlign: 'center', fontSize: 12, color: '#585757' },
});

export default Login;
