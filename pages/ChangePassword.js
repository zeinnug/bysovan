// pages/ChangePassword.js
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
  Alert,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';
import { updatePassword } from '../login auth/authService';

const ChangePassword = ({ navigation }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChangePassword = async () => {
    // Validasi
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Error', 'Password baru dan konfirmasi tidak cocok');
      return;
    }

    if (formData.newPassword.length < 8) {
      Alert.alert('Error', 'Password baru minimal 8 karakter');
      return;
    }

    try {
      setIsLoading(true);
      await updatePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      );

      Alert.alert(
        'Berhasil!',
        'Password Anda telah berhasil diubah',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Gagal', error?.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Octicons name="arrow-left" size={24} color="#292929" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Octicons name="lock" size={48} color="#FC6A0A" />
          </View>
          <Text style={styles.title}>Ubah Password</Text>
          <Text style={styles.subtitle}>
            Pastikan password baru Anda kuat dan mudah diingat
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password Saat Ini</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="lock" size={20} color="#585757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={formData.currentPassword}
                onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                secureTextEntry={!showPasswords.current}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => toggleShowPassword('current')}
                style={styles.eyeIcon}
              >
                <Octicons 
                  name={showPasswords.current ? "eye-closed" : "eye"} 
                  size={20} 
                  color="#585757" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password Baru</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="lock" size={20} color="#585757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={formData.newPassword}
                onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                secureTextEntry={!showPasswords.new}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => toggleShowPassword('new')}
                style={styles.eyeIcon}
              >
                <Octicons 
                  name={showPasswords.new ? "eye-closed" : "eye"} 
                  size={20} 
                  color="#585757" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Konfirmasi Password Baru</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="lock" size={20} color="#585757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry={!showPasswords.confirm}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => toggleShowPassword('confirm')}
                style={styles.eyeIcon}
              >
                <Octicons 
                  name={showPasswords.confirm ? "eye-closed" : "eye"} 
                  size={20} 
                  color="#585757" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingText}>Memproses...</Text>
              </View>
            ) : (
              <>
                <Octicons name="check" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Ubah Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password harus:</Text>
          <View style={styles.requirementItem}>
            <Octicons 
              name={formData.newPassword.length >= 8 ? "check-circle-fill" : "circle"} 
              size={16} 
              color={formData.newPassword.length >= 8 ? "#10B981" : "#9CA3AF"} 
            />
            <Text style={styles.requirementText}>Minimal 8 karakter</Text>
          </View>
          <View style={styles.requirementItem}>
            <Octicons 
              name={formData.newPassword === formData.confirmPassword && formData.confirmPassword ? "check-circle-fill" : "circle"} 
              size={16} 
              color={formData.newPassword === formData.confirmPassword && formData.confirmPassword ? "#10B981" : "#9CA3AF"} 
            />
            <Text style={styles.requirementText}>Password dan konfirmasi cocok</Text>
          </View>
        </View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#292929',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#585757',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
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
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#FC6A0A',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  requirementsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#292929',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#585757',
    marginLeft: 8,
  },
});

export default ChangePassword;