// BYSOVAN/components/AddProductModal.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const AddProductModal = ({ 
  visible, 
  onClose, 
  formData, 
  onFormChange, 
  onSubmit, 
  isSubmitting 
}) => {
  
  // ✅ Fungsi Generate Barcode Otomatis
  const handleGenerateBarcode = () => {
    // Format: BYS + Timestamp + Random 4 digit
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
    const newBarcode = `BYS${timestamp}${random}`;
    
    onFormChange('barcode', newBarcode);
    
    Alert.alert(
      'Barcode Generated!',
      `Barcode berhasil dibuat: ${newBarcode}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.addModalContainer}>
          {/* Header */}
          <View style={styles.addModalHeader}>
            <Text style={styles.addModalTitle}>Tambah Produk Baru</Text>
            <TouchableOpacity onPress={onClose}>
              <Octicons name="x" size={24} color="#F5ECE4" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView 
            style={styles.addModalScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Informasi Produk Card */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Octicons name="package" size={20} color="#FC6A0A" />
                <Text style={[styles.formSectionTitle, styles.orangeText]}>Informasi Produk</Text>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>Nama Produk</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.namaProduk}
                    onChangeText={(text) => onFormChange('namaProduk', text)}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Harga Beli</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={formData.hargaBeli}
                    onChangeText={(text) => onFormChange('hargaBeli', text)}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Merek</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.merek}
                    onChangeText={(text) => onFormChange('merek', text)}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Harga Jual</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={formData.hargaJual}
                    onChangeText={(text) => onFormChange('hargaJual', text)}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Kategori</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.kategori}
                    onChangeText={(text) => onFormChange('kategori', text)}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Kode SKU</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.kodeSKU}
                    onChangeText={(text) => onFormChange('kodeSKU', text)}
                  />
                </View>
              </View>
            </View>

            {/* SIZE Card */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Octicons name="ruler" size={20} color="#FC6A0A" />
                <Text style={[styles.formSectionTitle, styles.orangeText]}>SIZE</Text>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ukuran</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.ukuran}
                    onChangeText={(text) => onFormChange('ukuran', text)}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Warna</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.warna}
                    onChangeText={(text) => onFormChange('warna', text)}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>Stok Awal</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={formData.stokAwal}
                    onChangeText={(text) => onFormChange('stokAwal', text)}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Minimum Stok</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={formData.minimumStok}
                    onChangeText={(text) => onFormChange('minimumStok', text)}
                  />
                </View>
              </View>

              <View style={styles.formGroupFull}>
                <Text style={styles.formLabel}>Supplier</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.supplier}
                  onChangeText={(text) => onFormChange('supplier', text)}
                />
              </View>
            </View>

            {/* Deskripsi Produk Card */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Text style={styles.formSectionTitle}>Deskripsi Produk</Text>
              </View>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Masukkan deskripsi produk..."
                placeholderTextColor="#585757"
                multiline
                numberOfLines={4}
                value={formData.deskripsi}
                onChangeText={(text) => onFormChange('deskripsi', text)}
              />
            </View>

            {/* ✅ Barcode Card - UPDATED dengan Tombol Generate */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Octicons name="code" size={20} color="#FC6A0A" />
                <Text style={[styles.formSectionTitle, styles.orangeText]}>Barcode</Text>
              </View>
              
              {/* Input Barcode */}
              <TextInput
                style={styles.formInput}
                placeholder="Masukkan barcode manual atau generate otomatis"
                placeholderTextColor="#999"
                value={formData.barcode}
                onChangeText={(text) => onFormChange('barcode', text)}
                editable={true}
              />

              {/* Tombol Generate Barcode */}
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={handleGenerateBarcode}
                activeOpacity={0.7}
              >
                <Octicons name="zap" size={18} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Generate Barcode Otomatis</Text>
              </TouchableOpacity>

              {/* Info Box */}
              {formData.barcode ? (
                <View style={styles.barcodeInfoBox}>
                  <Octicons name="check-circle" size={16} color="#28a745" />
                  <Text style={styles.barcodeInfoText}>
                    Barcode siap: {formData.barcode}
                  </Text>
                </View>
              ) : (
                <View style={styles.barcodeInfoBox}>
                  <Octicons name="info" size={16} color="#585757" />
                  <Text style={styles.barcodeInfoText}>
                    Klik tombol di atas untuk generate barcode otomatis
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.addModalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={onSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Octicons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Simpan Produk</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal container and overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalContainer: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: '#F5ECE4',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Header
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#292929',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5ECE4',
  },

  // Scrollable Form Area
  addModalScroll: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },

  // Form Section Cards
  formSection: {
    backgroundColor: '#292929',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#585757',
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5ECE4',
  },
  orangeText: {
    color: '#FC6A0A',
  },

  // Form Layout & Elements
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formGroup: {
    flex: 1,
  },
  formGroupFull: {
    // No extra styles needed
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5ECE4',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F5ECE4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#292929',
    borderWidth: 2,
    borderColor: '#585757',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // ✅ NEW: Generate Barcode Button Styles
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FC6A0A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E74504',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ✅ NEW: Barcode Info Box
  barcodeInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5ECE4',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#585757',
  },
  barcodeInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#585757',
    fontWeight: '500',
  },

  // Footer & Buttons
  addModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#292929',
    borderTopWidth: 1,
    borderTopColor: '#585757',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#585757',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flex: 1.5,
    backgroundColor: '#FC6A0A',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#E74504',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddProductModal;