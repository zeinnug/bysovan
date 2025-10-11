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

            {/* Barcode Card */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Text style={styles.formSectionTitle}>Barcode</Text>
              </View>
              <TextInput
                style={styles.formInput}
                placeholder="Masukkan barcode atau generate otomatis"
                placeholderTextColor="#585757"
                value={formData.barcode}
                onChangeText={(text) => onFormChange('barcode', text)}
              />
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
    backgroundColor: '#F5ECE4', // Linen
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Header
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#292929', // Jet
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5ECE4', // Linen
  },

  // Scrollable Form Area
  addModalScroll: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },

  // Form Section Cards
  formSection: {
    backgroundColor: '#292929', // Jet
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#585757', // Davy's Gray
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
    color: '#F5ECE4', // Linen
  },
  orangeText: {
    color: '#FC6A0A', // Pumpkin
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
    // No extra styles needed, just for structure
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5ECE4', // Linen
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F5ECE4', // Linen
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#292929', // Jet
    borderWidth: 2,
    borderColor: '#585757', // Davy's Gray
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Footer & Buttons
  addModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#292929', // Jet
    borderTopWidth: 1,
    borderTopColor: '#585757', // Davy's Gray
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#585757', // Davy's Gray
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flex: 1.5, // Make it slightly wider
    backgroundColor: '#FC6A0A', // Pumpkin
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#E74504', // Golden Gate Bridge for disabled/submitting state
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddProductModal;