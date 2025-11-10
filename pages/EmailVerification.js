// pages/EmailVerification.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';
import { sendEmailVerification, checkEmailVerified, getLocalUserData } from '../login auth/authService';

const EmailVerification = ({ navigation, onVerificationSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadUserEmail();
    checkVerificationStatus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const loadUserEmail = async () => {
    const userData = await getLocalUserData();
    if (userData?.email) {
      setUserEmail(userData.email);
    }
  };

  const checkVerificationStatus = async () => {
    const isVerified = await checkEmailVerified();
    if (isVerified && onVerificationSuccess) {
      onVerificationSuccess();
    }
  };

  const handleSendVerification = async () => {
    try {
      setIsLoading(true);
      await sendEmailVerification();
      setIsSent(true);
      setCountdown(60); // 60 seconds cooldown
      Alert.alert(
        'Email Terkirim!',
        'Link verifikasi telah dikirim ke email Anda. Silakan cek inbox atau folder spam.'
      );
    } catch (error) {
      Alert.alert('Gagal', error?.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Lewati Verifikasi?',
      'Anda dapat melakukan verifikasi email nanti di pengaturan akun.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Lewati',
          onPress: () => {
            if (onVerificationSuccess) {
              onVerificationSuccess();
            } else {
              navigation.replace('Dashboard');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Octicons name="mail" size={60} color="#FC6A0A" />
          </View>
          {isSent && (
            <View style={styles.checkBadge}>
              <Octicons name="check" size={20} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Header */}
        <Text style={styles.title}>Verifikasi Email Anda</Text>
        <Text style={styles.subtitle}>
          Kami telah mengirim link verifikasi ke
        </Text>
        <Text style={styles.email}>{userEmail}</Text>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>Buka email Anda</Text>
          </View>
          
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>Klik link verifikasi</Text>
          </View>
          
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>Kembali ke aplikasi</Text>
          </View>
        </View>

        {/* Resend Button */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            (isLoading || countdown > 0) && styles.resendButtonDisabled
          ]}
          onPress={handleSendVerification}
          disabled={isLoading || countdown > 0}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FC6A0A" />
              <Text style={styles.resendButtonText}>Mengirim...</Text>
            </View>
          ) : countdown > 0 ? (
            <Text style={styles.countdownText}>
              Kirim ulang dalam {countdown}s
            </Text>
          ) : (
            <>
              <Octicons name="sync" size={20} color="#FC6A0A" style={styles.buttonIcon} />
              <Text style={styles.resendButtonText}>
                {isSent ? 'Kirim Ulang Email' : 'Kirim Email Verifikasi'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Check Status Button */}
        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkVerificationStatus}
        >
          <Octicons name="check-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.checkButtonText}>Saya Sudah Verifikasi</Text>
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Lewati untuk Sekarang</Text>
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Octicons name="info" size={16} color="#585757" />
          <Text style={styles.helpText}>
            Tidak menerima email? Periksa folder spam atau pastikan email Anda benar
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5ECE4',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F5ECE4',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#292929',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#585757',
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FC6A0A',
    marginBottom: 32,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FC6A0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#292929',
  },
  resendButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FC6A0A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#FC6A0A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  countdownText: {
    color: '#585757',
    fontSize: 16,
    fontWeight: '600',
  },
  checkButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FC6A0A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  skipButton: {
    padding: 12,
    marginBottom: 20,
  },
  skipButtonText: {
    color: '#585757',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  buttonIcon: {
    marginRight: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#585757',
    marginLeft: 8,
    lineHeight: 18,
  },
});

export default EmailVerification;