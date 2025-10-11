// BYSOVAN/components/QRCodeModal.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const QRCodeModal = ({ visible, onClose, product }) => {
  // Validasi produk
  if (!product && visible) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR CODE</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Octicons name="x" size={24} color="#F5ECE4" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.errorText}>Produk tidak tersedia</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Generate QR Code URL
  const generateQRCodeURL = () => {
    if (!product) return null;

    // Gunakan barcode jika ada, atau fallback ke ID produk
    const qrData = product.barcode || `PRODUCT-${product.id}`;
    
    // Encode data untuk URL
    const encodedData = encodeURIComponent(qrData);
    
    // URL API QR Code dengan timestamp untuk mencegah caching
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedData}&t=${Date.now()}`;
  };

  const qrCodeUrl = generateQRCodeURL();
  const hasBarcode = product && product.barcode;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>QR CODE</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Octicons name="x" size={24} color="#F5ECE4" />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            {hasBarcode ? (
              <View style={styles.qrContainer}>
                {/* Product Info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.nama}</Text>
                  <Text style={styles.productDetail}>Kategori: {product.kategori}</Text>
                  <Text style={styles.productDetail}>Ukuran: {product.ukuran}</Text>
                  <Text style={styles.barcodeText}>Barcode: {product.barcode}</Text>
                </View>

                {/* QR Code Image */}
                <View style={styles.qrImageContainer}>
                  <Image
                    source={{ uri: qrCodeUrl }}
                    style={styles.qrImage}
                    onError={(error) => {
                      console.error('Gagal memuat QR Code:', error.nativeEvent.error);
                    }}
                    resizeMode="contain"
                  />
                </View>

                {/* Additional Info */}
                <View style={styles.infoBox}>
                  <Octicons name="info" size={16} color="#FC6A0A" />
                  <Text style={styles.infoText}>
                    Scan QR Code ini untuk melihat detail produk
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noQRContainer}>
                <Octicons name="alert" size={48} color="#E74504" />
                <Text style={styles.noQRText}>
                  QR Code tidak tersedia untuk produk ini
                </Text>
                <Text style={styles.noQRSubText}>
                  Produk belum memiliki barcode yang terdaftar
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#F5ECE4',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#585757',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#292929',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5ECE4',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 500,
    paddingVertical: 20,
  },
  qrContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  productInfo: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#585757',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#292929',
    marginBottom: 8,
    textAlign: 'center',
  },
  productDetail: {
    fontSize: 14,
    color: '#585757',
    marginBottom: 4,
  },
  barcodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FC6A0A',
    marginTop: 4,
  },
  qrImageContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#585757',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FC6A0A',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#585757',
  },
  noQRContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  noQRText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74504',
    marginTop: 16,
    textAlign: 'center',
  },
  noQRSubText: {
    fontSize: 14,
    color: '#585757',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#E74504',
    textAlign: 'center',
    padding: 20,
  },
  modalFooter: {
    backgroundColor: '#292929',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: '#585757',
  },
  closeFooterButton: {
    backgroundColor: '#FC6A0A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default QRCodeModal;