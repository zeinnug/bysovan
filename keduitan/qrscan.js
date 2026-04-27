// File: keduitan/qrscan.js

import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert, // ← TAMBAHKAN IMPORT ALERT
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { translateErrorMessage } from './sold';

// Color Palette (sesuai dengan app)
const COLORS = {
  jet: '#292929',
  davysGray: '#585757',
  linen: '#F5ECE4',
  pumpkin: '#FC6A0A',
  goldenGate: '#E74504',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

/**
 * QR Code Scanner Component
 * Digunakan untuk scan QR code produk dan otomatis menambahkan ke keranjang
 * 
 * @param {boolean} visible - Show/hide modal
 * @param {Array} availableProducts - List produk yang tersedia
 * @param {Function} onClose - Callback ketika modal ditutup
 * @param {Function} onScanSuccess - Callback ketika scan berhasil
 * @param {Function} onScanError - Callback ketika scan gagal
 * @param {Function} onRequestRefresh - Callback untuk refresh data produk
 */
const QRCodeScanner = ({
  visible,
  availableProducts = [],
  onClose,
  onScanSuccess,
  onScanError,
  onRequestRefresh,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state ketika modal dibuka/ditutup
  useEffect(() => {
    if (visible) {
      console.log('=== QR Scanner Opened ===');
      
      // ✅ VALIDASI: Cek apakah availableProducts adalah array
      if (!Array.isArray(availableProducts)) {
        console.error('⚠️ availableProducts is not an array:', typeof availableProducts);
        Alert.alert(
          'Data Produk Tidak Valid',
          'Daftar produk tidak tersedia. Silakan refresh data produk terlebih dahulu.',
          [
            {
              text: 'Refresh Data',
              onPress: () => {
                if (onRequestRefresh) {
                  onRequestRefresh();
                }
                onClose();
              },
            },
            { text: 'Tutup', onPress: onClose },
          ]
        );
        return;
      }
      
      console.log('Available Products:', availableProducts.length);
      
      // ✅ VALIDASI: Cek apakah products kosong
      if (availableProducts.length === 0) {
        console.warn('⚠️ availableProducts is empty');
        Alert.alert(
          'Tidak Ada Produk',
          'Belum ada produk yang tersedia. Silakan muat data produk terlebih dahulu.',
          [
            {
              text: 'Muat Data',
              onPress: () => {
                if (onRequestRefresh) {
                  onRequestRefresh();
                }
                onClose();
              },
            },
            { text: 'Tutup', onPress: onClose },
          ]
        );
        return;
      }
      
      setHasScanned(false);
      setIsProcessing(false);
    }
  }, [visible, availableProducts, onRequestRefresh, onClose]);

  /**
   * Extract unit code dari QR data
   * ✅ IMPROVED: Support lebih banyak format QR code
   */
  const extractUnitCode = useCallback((scannedData) => {
    const data = scannedData.trim();
    
    console.log('→ Extracting unit code from:', data);
    
    // Pattern 1: URL dengan /unit/
    const urlPattern = /\/unit\/([A-Z0-9\-_]+)/i;
    const urlMatch = data.match(urlPattern);
    
    if (urlMatch && urlMatch[1]) {
      console.log('✓ Unit code extracted from URL:', urlMatch[1]);
      return urlMatch[1];
    }
    
    // Pattern 2: URL dengan /inventory/{id}
    const inventoryPattern = /\/inventory\/(\d+)/i;
    const inventoryMatch = data.match(inventoryPattern);
    
    if (inventoryMatch && inventoryMatch[1]) {
      console.log('✓ Product ID extracted from URL:', inventoryMatch[1]);
      return inventoryMatch[1];
    }
    
    // Pattern 3: Direct code (alphanumeric, dash, underscore)
    if (/^[A-Z0-9\-_]+$/i.test(data)) {
      console.log('✓ Direct unit code:', data);
      return data;
    }
    
    // Pattern 4: Numeric only (product ID)
    if (/^\d+$/.test(data)) {
      console.log('✓ Numeric ID:', data);
      return data;
    }
    
    console.log('✗ Could not extract unit code');
    return null;
  }, []);

  /**
   * Find product by unit code atau ID
   * ✅ IMPROVED: Better matching logic dengan detailed logging
   */
  const findProductByUnitCode = useCallback((unitCode) => {
    // ✅ VALIDASI: Pastikan availableProducts adalah array
    if (!Array.isArray(availableProducts) || availableProducts.length === 0) {
      console.error('⚠️ availableProducts is not valid:', availableProducts);
      return null;
    }

    console.log('→ Searching for unit code:', unitCode);
    console.log('→ Available products count:', availableProducts.length);
    
    // ✅ LOG: Sample product untuk debugging
    if (availableProducts.length > 0) {
      console.log('→ Sample product structure:', {
        id: availableProducts[0].id,
        code: availableProducts[0].code,
        name: availableProducts[0].name,
        barcode: availableProducts[0].barcode,
        production_code: availableProducts[0].production_code,
      });
    }

    const upperUnitCode = unitCode.toUpperCase();

    // Cari berdasarkan berbagai kemungkinan field
    const product = availableProducts.find(p => {
      if (!p) return false;
      
      // Match by ID (numeric)
      if (p.id && p.id.toString() === unitCode) {
        console.log('✓ Match by ID:', p.id);
        return true;
      }
      
      // Match by code
      if (p.code && p.code.toUpperCase() === upperUnitCode) {
        console.log('✓ Match by code:', p.code);
        return true;
      }
      
      // Match by production_code
      if (p.production_code && p.production_code.toUpperCase() === upperUnitCode) {
        console.log('✓ Match by production_code:', p.production_code);
        return true;
      }
      
      // Match by barcode
      if (p.barcode && p.barcode.toUpperCase() === upperUnitCode) {
        console.log('✓ Match by barcode:', p.barcode);
        return true;
      }
      
      // Match by unit_code
      if (p.unit_code && p.unit_code.toUpperCase() === upperUnitCode) {
        console.log('✓ Match by unit_code:', p.unit_code);
        return true;
      }
      
      // Match by qr_code
      if (p.qr_code && p.qr_code.toUpperCase() === upperUnitCode) {
        console.log('✓ Match by qr_code:', p.qr_code);
        return true;
      }
      
      // ✅ Match by units array (untuk produk dengan struktur units)
      if (p.units && Array.isArray(p.units)) {
        const unitMatch = p.units.find(unit => {
          if (!unit) return false;
          return (
            (unit.unitCode && unit.unitCode.toUpperCase() === upperUnitCode) ||
            (unit.unit_code && unit.unit_code.toUpperCase() === upperUnitCode) ||
            (unit.code && unit.code.toUpperCase() === upperUnitCode) ||
            (unit.barcode && unit.barcode.toUpperCase() === upperUnitCode)
          );
        });
        
        if (unitMatch) {
          console.log('✓ Match by units array:', unitMatch.unitCode || unitMatch.unit_code || unitMatch.code);
          return true;
        }
      }
      
      return false;
    });

    if (product) {
      console.log('✓ Product found:', {
        id: product.id,
        name: product.name,
        code: product.code,
      });
    } else {
      console.log('✗ Product not found for unit code:', unitCode);
    }

    return product;
  }, [availableProducts]);

  /**
   * Handler untuk barcode scanned
   */
  const handleBarcodeScanned = useCallback(
    async ({ type, data }) => {
      if (hasScanned || isProcessing) {
        console.log('→ Scan ignored (already processing)');
        return;
      }
      
      setHasScanned(true);
      setIsProcessing(true);

      console.log('=== QR SCAN STARTED ===');
      console.log('Barcode Type:', type);
      console.log('Scanned Data:', data);

      try {
        // ✅ VALIDASI: Cek data yang di-scan
        if (!data || data.trim() === '') {
          throw new Error('QR Code kosong atau tidak valid');
        }

        // 1. Ekstrak unit code dari QR data
        const unitCode = extractUnitCode(data);

        if (!unitCode) {
          throw new Error('Format QR Code tidak valid. Tidak dapat menemukan kode produk.');
        }

        console.log('→ Unit Code:', unitCode);

        // 2. Cari produk dari availableProducts (local)
        const product = findProductByUnitCode(unitCode);

        if (!product) {
          throw new Error(
            `Produk dengan kode "${unitCode}" tidak ditemukan.\n\n` +
            `Pastikan:\n` +
            `• Produk sudah terdaftar di sistem\n` +
            `• QR Code sesuai dengan produk yang ada\n` +
            `• Data produk sudah dimuat (coba Refresh Data)`
          );
        }

        console.log('✓ Product found:', product.name);

        // 3. Validasi produk
        if (!product.id) {
          throw new Error('Data produk tidak valid (ID tidak ditemukan).');
        }

        // ✅ VALIDASI: Cek harga produk
        const productPrice = parseFloat(
          product.price || 
          product.selling_price || 
          product.harga || 
          0
        );

        if (productPrice <= 0) {
          console.warn('⚠️ Product price is 0 or invalid:', productPrice);
        }

        // 4. Format product untuk cart
        const cartProduct = {
          id: product.id,
          product_id: product.id,
          name: product.name || product.nama || 'Produk',
          code: product.code || unitCode,
          price: productPrice,
          quantity: 1,
          discount_price: product.discount_price || product.discountPrice || null,
          // ✅ OPTIONAL: Tambahkan info tambahan jika ada
          color: product.color || product.warna || null,
          size: product.size || product.ukuran || null,
          barcode: product.barcode || null,
        };

        console.log('✓ SUCCESS: Product ready to add');
        console.log('  Cart Item:', cartProduct);
        
        // 5. Callback success
        onScanSuccess(cartProduct);
        
      } catch (error) {
        console.error('✗ ERROR during scan:', error);
        
        // Format error message
        let errorTitle = 'Gagal Memindai QR Code';
        let errorMessage = translateErrorMessage(error.message || 'Terjadi kesalahan saat memindai QR Code');

        // Specific error handling
        if (error.message?.includes('tidak ditemukan')) {
          errorTitle = 'Produk Tidak Ditemukan';
        } else if (error.message?.includes('Format QR Code')) {
          errorTitle = 'Format QR Code Salah';
        } else if (error.message?.includes('tidak valid')) {
          errorTitle = 'Data Tidak Valid';
        }

        onScanError(errorTitle, errorMessage);
      } finally {
        console.log('=== QR SCAN ENDED ===');
        handleClose();
      }
    },
    [
      hasScanned, 
      isProcessing, 
      extractUnitCode, 
      findProductByUnitCode, 
      onScanSuccess, 
      onScanError
    ]
  );

  /**
   * Close scanner
   */
  const handleClose = useCallback(() => {
    console.log('→ Closing QR Scanner');
    setHasScanned(false);
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  /**
   * Refresh products data
   */
  const handleRefresh = useCallback(async () => {
    console.log('→ Refreshing products data');
    if (onRequestRefresh) {
      await onRequestRefresh();
    }
  }, [onRequestRefresh]);

  const { width, height } = Dimensions.get('window');
  const scanWindowSize = Math.min(width, height) * 0.6;

  // ==================== LOADING STATE ====================
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

  // ==================== PERMISSION REQUEST ====================
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
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ==================== CAMERA VIEW ====================
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
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
          }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
        >
          {/* Overlay dengan scan window */}
          <View style={styles.cameraOverlay}>
            <View style={styles.topOverlay} />
            <View style={styles.middleOverlay}>
              <View style={styles.leftOverlay} />
              <View style={[styles.scanWindow, { width: scanWindowSize, height: scanWindowSize }]}>
                {/* Corner indicators */}
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <View style={styles.rightOverlay} />
            </View>
            <View style={styles.bottomOverlay} />

            {/* Instruksi scan */}
            <View style={styles.instructionContainer}>
              <Ionicons name="scan" size={32} color={COLORS.white} />
              <Text style={styles.instructionText}>
                Arahkan kamera ke QR Code produk
              </Text>
              <Text style={styles.instructionSubtext}>
                QR Code akan dipindai secara otomatis
              </Text>
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.processingText}>Memproses scan...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Tombol-tombol */}
          <View style={styles.buttonContainer}>
            {/* Tombol Refresh Products */}
            {onRequestRefresh && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-circle" size={24} color={COLORS.white} />
                <Text style={styles.refreshButtonText}>Refresh Data</Text>
              </TouchableOpacity>
            )}

            {/* Tombol Tutup */}
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

// ==================== STYLES ====================
const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.overlay,
    padding: 20,
  },
  permissionCard: {
    backgroundColor: COLORS.linen,
    borderRadius: 16,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.davysGray,
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
    backgroundColor: COLORS.davysGray,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.white,
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
    backgroundColor: COLORS.overlay,
    width: '100%',
  },
  middleOverlay: {
    flexDirection: 'row',
    width: '100%',
  },
  leftOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
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
    backgroundColor: COLORS.overlay,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
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
  instructionSubtext: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.8,
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
    gap: 15,
  },
  refreshButton: {
    backgroundColor: COLORS.pumpkin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: COLORS.jet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButtonCamera: {
    backgroundColor: COLORS.goldenGate,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: COLORS.jet,
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