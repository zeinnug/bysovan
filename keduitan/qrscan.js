import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  jet: '#292929',
  davysGray: '#585757',
  linen: '#F5ECE4',
  pumpkin: '#FC6A0A',
  goldenGate: '#E74504',
  white: '#FFFFFF',
  success: '#32CD32',
};

const QRCodeScanner = ({
  visible,
  availableProducts,
  onClose,
  onScanSuccess,
  onScanError,
  onRequestRefresh,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBarcodeScanned = useCallback(
    async ({ type, data }) => {
      if (hasScanned || isProcessing) return;
      
      setHasScanned(true);
      setIsProcessing(true);

      console.log('Barcode scanned:', { type, data });

      const scannedCode = data.trim();
      let productCode = null;

      if (scannedCode.startsWith('https://testingaplikasi.tokosepatusovan.com/inventory/')) {
        const match = scannedCode.match(/\/unit\/([^/]+)$/);
        if (match && match[1]) {
          productCode = match[1];
        }
      } else {
        productCode = scannedCode;
      }

      if (!availableProducts || availableProducts.length === 0) {
        onScanError(
          'Data Produk Belum Dimuat',
          'Daftar produk belum dimuat. Coba muat ulang data.'
        );
        if (onRequestRefresh) {
          onRequestRefresh();
        }
        handleClose();
        return;
      }

      const product = availableProducts.find(
        (p) =>
          (productCode && p.code?.toLowerCase() === productCode.toLowerCase()) ||
          (p.production_code?.toLowerCase() === productCode.toLowerCase()) ||
          (p.qr_code?.toLowerCase() === scannedCode.toLowerCase()) ||
          (p.unit_code?.toLowerCase() === productCode.toLowerCase())
      );

      if (product) {
        if (product.stock !== undefined && product.stock <= 0) {
          onScanError(
            'Stok Habis',
            `Produk "${product.name || productCode}" tidak memiliki stok.`
          );
        } else if (product.is_active !== undefined && product.is_active !== 1) {
          onScanError(
            'Produk Tidak Aktif',
            `Produk "${product.name || productCode}" sudah tidak aktif.`
          );
        } else {
          onScanSuccess(product);
        }
      } else {
        onScanError(
          'Produk Tidak Ditemukan',
          `Kode produk "${productCode || scannedCode}" tidak ditemukan.`
        );
      }

      handleClose();
    },
    [hasScanned, isProcessing, availableProducts, onScanSuccess, onScanError, onRequestRefresh]
  );

  const handleClose = useCallback(() => {
    setHasScanned(false);
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  const { width, height } = Dimensions.get('window');
  const scanWindowSize = Math.min(width, height) * 0.6;

  if (!permission) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <ActivityIndicator size="large" color={COLORS.pumpkin} />
            <Text style={styles.permissionText}>Memuat izin kamera...</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <Ionicons name="camera-outline" size={64} color={COLORS.pumpkin} />
            <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
            <Text style={styles.permissionText}>
              Kami membutuhkan izin untuk mengakses kamera agar dapat memindai QR code produk
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.permissionButtonText}>Izinkan Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
          }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.topOverlay} />
            <View style={styles.middleOverlay}>
              <View style={styles.leftOverlay} />
              <View style={[styles.scanWindow, { width: scanWindowSize, height: scanWindowSize }]}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <View style={styles.rightOverlay} />
            </View>
            <View style={styles.bottomOverlay} />

            <View style={styles.instructionContainer}>
              <Ionicons name="scan" size={32} color={COLORS.white} />
              <Text style={styles.instructionText}>
                Arahkan kamera ke QR Code produk
              </Text>
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.processingText}>Memproses...</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.closeButtonCamera}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={24} color={COLORS.white} />
              <Text style={styles.closeButtonCameraText}>Tutup Kamera</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.jet,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.davysGray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: COLORS.pumpkin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: COLORS.linen,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.jet,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: COLORS.goldenGate,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.jet,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: '100%',
  },
  middleOverlay: {
    flexDirection: 'row',
    width: '100%',
  },
  leftOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanWindow: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.pumpkin,
    borderRadius: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.white,
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  rightOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: '100%',
  },
  instructionContainer: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
    backgroundColor: 'rgba(252, 106, 10, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  processingText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButtonCamera: {
    backgroundColor: COLORS.goldenGate,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  closeButtonCameraText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRCodeScanner;