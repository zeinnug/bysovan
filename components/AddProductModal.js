// BYSOVAN/components/AddProductModal.js
import React, { useState, useEffect } from 'react';
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
  onSubmit, 
  isSubmitting,
  onProductCreated, // Callback untuk show QR setelah sukses
}) => {
  // Form State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [description, setDescription] = useState('');
  
  // Dynamic Sizes State
  const [sizes, setSizes] = useState([
    { id: Date.now(), size: '', stock: '' }
  ]);

  // Reset form ketika modal dibuka
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setBrand('');
    setModel('');
    setColor('');
    setSellingPrice('');
    setDiscountPrice('');
    setDescription('');
    setSizes([{ id: Date.now(), size: '', stock: '' }]);
  };

  // Handle tambah ukuran baru
  const handleAddSize = () => {
    setSizes([...sizes, { id: Date.now(), size: '', stock: '' }]);
  };

  // Handle hapus ukuran
  const handleRemoveSize = (id) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter(s => s.id !== id));
    } else {
      Alert.alert('Info', 'Minimal harus ada 1 ukuran dan stok');
    }
  };

  // Handle update size field
  const handleUpdateSize = (id, field, value) => {
    setSizes(sizes.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  // Validasi dan Submit
  const handleSubmitProduct = async () => {
    // Validasi required fields
    if (!brand.trim()) {
      Alert.alert('Validasi', 'Brand wajib diisi');
      return;
    }
    if (!model.trim()) {
      Alert.alert('Validasi', 'Model wajib diisi');
      return;
    }
    if (!sellingPrice.trim()) {
      Alert.alert('Validasi', 'Harga Jual wajib diisi');
      return;
    }

    // Validasi ukuran dan stok
    const validSizes = sizes.filter(s => s.size.trim() && s.stock.trim());
    if (validSizes.length === 0) {
      Alert.alert('Validasi', 'Minimal harus ada 1 ukuran dan stok yang terisi');
      return;
    }

    // Format sizes untuk API
    const formattedSizes = validSizes.map(s => ({
      size: s.size.trim(),
      stock: parseInt(s.stock) || 0
    }));

    // Prepare product data
    const productData = {
      brand: brand.trim(),
      model: model.trim(),
      color: color.trim() || '',
      sizes: formattedSizes,
      sellingPrice: parseFloat(sellingPrice) || 0,
      discountPrice: discountPrice.trim() ? parseFloat(discountPrice) : null,
      description: description.trim() || '',
    };

    console.log('📤 Submitting product:', productData);

    // Call parent submit handler
    try {
      const result = await onSubmit(productData);
      
      if (result && result.success) {
        // Callback untuk show QR modal dengan product baru
        if (onProductCreated && result.data) {
          onProductCreated(result.data);
        }
        
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
    }
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
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>TAMBAH PRODUK</Text>
            <TouchableOpacity onPress={onClose}>
              <Octicons name="x" size={24} color="#F5ECE4" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView 
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Informasi Produk */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Octicons name="package" size={20} color="#FC6A0A" />
                <Text style={styles.formSectionTitle}>Informasi Produk</Text>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Brand <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Contoh: Adidas Originals"
                    placeholderTextColor="#999"
                    value={brand}
                    onChangeText={setBrand}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Model <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Contoh: Superstar"
                    placeholderTextColor="#999"
                    value={model}
                    onChangeText={setModel}
                  />
                </View>
              </View>

              <View style={styles.formGroupFull}>
                <Text style={styles.formLabel}>Warna</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: Putih"
                  placeholderTextColor="#999"
                  value={color}
                  onChangeText={setColor}
                />
              </View>
            </View>

            {/* Harga */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Octicons name="tag" size={20} color="#FC6A0A" />
                <Text style={styles.formSectionTitle}>Harga</Text>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Harga Jual <Text style={styles.required}>*</Text></Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.pricePrefix}>Rp</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="1.234.567"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={sellingPrice}
                      onChangeText={setSellingPrice}
                    />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Harga Diskon (Opsional)</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.pricePrefix}>Rp</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="1.234.567"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={discountPrice}
                      onChangeText={setDiscountPrice}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.helperText}>
                Harga diskon harus lebih kecil atau sama dengan harga jual.
              </Text>
            </View>

            {/* Ukuran dan Stok - DYNAMIC */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Octicons name="inbox" size={20} color="#FC6A0A" />
                <Text style={styles.formSectionTitle}>Ukuran dan Stok</Text>
              </View>

              {sizes.map((sizeItem, index) => (
                <View key={sizeItem.id} style={styles.sizeRow}>
                  <View style={styles.sizeInputGroup}>
                    <Text style={styles.formLabel}>
                      Ukuran (contoh: 41) {index === 0 && <Text style={styles.required}>*</Text>}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ukuran (contoh: 41)"
                      placeholderTextColor="#999"
                      value={sizeItem.size}
                      onChangeText={(text) => handleUpdateSize(sizeItem.id, 'size', text)}
                    />
                  </View>

                  <View style={styles.sizeInputGroup}>
                    <Text style={styles.formLabel}>
                      Jumlah Unit {index === 0 && <Text style={styles.required}>*</Text>}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Jumlah Unit"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={sizeItem.stock}
                      onChangeText={(text) => handleUpdateSize(sizeItem.id, 'stock', text)}
                    />
                  </View>

                  {sizes.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => handleRemoveSize(sizeItem.id)}
                    >
                      <Text style={styles.removeButtonText}>Hapus</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity 
                style={styles.addSizeButton}
                onPress={handleAddSize}
              >
                <Octicons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addSizeButtonText}>Tambah Ukuran</Text>
              </TouchableOpacity>
            </View>

            {/* Deskripsi Produk */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Octicons name="note" size={20} color="#FC6A0A" />
                <Text style={styles.formSectionTitle}>Deskripsi Produk</Text>
              </View>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Masukkan deskripsi produk (opsional)..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Kembali</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitProduct}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Octicons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Simpan</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: '#F5ECE4',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#292929',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5ECE4',
  },
  modalScroll: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
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
    color: '#FC6A0A',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formGroup: {
    flex: 1,
  },
  formGroupFull: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5ECE4',
    marginBottom: 8,
  },
  required: {
    color: '#FC6A0A',
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
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5ECE4',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#585757',
    paddingLeft: 12,
  },
  pricePrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#585757',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: '#292929',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Dynamic Size Rows
  sizeRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#585757',
  },
  sizeInputGroup: {
    marginBottom: 8,
  },
  removeButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#E74504',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addSizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  addSizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  addSizeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalFooter: {
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
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddProductModal;