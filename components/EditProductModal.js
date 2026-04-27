// BYSOVAN/components/EditProductModal.js
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
  Alert,
  Dimensions,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';
import { updateProduct } from '../data/services/inventoryService';
import { translateErrorMessage } from '../keduitan/sold';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const EditProductModal = ({ visible, onClose, onSuccess, product }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [sizes, setSizes] = useState([{ id: 1, size: '', stock: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && product) {
      setBrand(product.merek || '');
      setModel(product.model || '');
      setColor(product.warna || '');
      setSellingPrice(product.hargaJual ? String(product.hargaJual) : '');
      setDiscountPrice(
        product.hargaDiskon && product.hargaDiskon > 0
          ? String(product.hargaDiskon)
          : ''
      );
      setSizes([
        {
          id: Date.now(),
          size: product.ukuran && product.ukuran !== '-' ? String(product.ukuran) : '',
          stock: product.stok !== undefined ? String(product.stok) : '',
        },
      ]);
    }
  }, [visible, product]);

  const handleAddSize = () => {
    setSizes([...sizes, { id: Date.now(), size: '', stock: '' }]);
  };

  const handleRemoveSize = (id) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter((s) => s.id !== id));
    } else {
      Alert.alert('Info', 'Minimal harus ada 1 ukuran dan stok');
    }
  };

  const handleUpdateSize = (id, field, value) => {
    setSizes(sizes.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = async () => {
    if (!brand.trim()) return Alert.alert('Validasi', 'Brand wajib diisi');
    if (!model.trim()) return Alert.alert('Validasi', 'Model wajib diisi');
    if (!sellingPrice.trim()) return Alert.alert('Validasi', 'Harga Jual wajib diisi');

    const validSizes = sizes.filter((s) => s.size.trim() && s.stock.trim());
    if (validSizes.length === 0) {
      return Alert.alert('Validasi', 'Minimal harus ada 1 ukuran dan stok yang terisi');
    }

    const selling = parseFloat(sellingPrice);
    const discount = discountPrice.trim() ? parseFloat(discountPrice) : null;
    if (discount !== null && discount > selling) {
      return Alert.alert('Validasi', 'Harga diskon harus lebih kecil atau sama dengan harga jual.');
    }

    const payload = {
      brand: brand.trim(),
      model: model.trim(),
      color: color.trim(),
      sizes: validSizes.map((s) => ({
        size: s.size.trim(),
        stock: parseInt(s.stock) || 0,
      })),
      sellingPrice: selling,
      discountPrice: discount,
    };

    setIsSubmitting(true);
    try {
      const result = await updateProduct(product.id, payload);
      if (result.success) {
        Alert.alert('Berhasil', 'Produk berhasil diperbarui!');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Error', result.message || 'Gagal memperbarui produk');
      }
    } catch (error) {
      Alert.alert('Error', translateErrorMessage(error.message || 'Gagal memperbarui produk'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tinggi form area = layar - header(~68px) - footer(~70px) - margin atas bawah(~80px)
  const scrollHeight = SCREEN_HEIGHT * 0.88 - 68 - 70 - 40;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { maxHeight: SCREEN_HEIGHT * 0.88 }]}>

          {/* ===== HEADER ===== */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Octicons name="pencil" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>EDIT PRODUK</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Octicons name="x" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* ===== SCROLLABLE FORM ===== */}
          {/* Gunakan height eksplisit agar ScrollView tidak collapse di Android */}
          <ScrollView
            style={{ height: scrollHeight }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            {/* Brand & Model */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Brand</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Adidas"
                  placeholderTextColor="#475569"
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Superstar"
                  placeholderTextColor="#475569"
                  value={model}
                  onChangeText={setModel}
                />
              </View>
            </View>

            {/* Warna & Harga Jual */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Warna</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Putih"
                  placeholderTextColor="#475569"
                  value={color}
                  onChangeText={setColor}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Harga Jual</Text>
                <View style={styles.priceWrap}>
                  <View style={styles.rpBox}>
                    <Text style={styles.rpText}>Rp</Text>
                  </View>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="300.000"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                  />
                </View>
              </View>
            </View>

            {/* Harga Diskon */}
            <View style={styles.fullRow}>
              <Text style={styles.label}>Harga Diskon (Opsional)</Text>
              <View style={styles.priceWrap}>
                <View style={styles.rpBox}>
                  <Text style={styles.rpText}>Rp</Text>
                </View>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  value={discountPrice}
                  onChangeText={setDiscountPrice}
                />
              </View>
              <Text style={styles.hint}>
                Harga diskon harus lebih kecil atau sama dengan harga jual.
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Ukuran & Stok */}
            <Text style={styles.sectionTitle}>Ukuran dan Stok</Text>

            {sizes.map((item) => (
              <View key={item.id} style={styles.sizeBlock}>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ukuran (contoh: 42)"
                      placeholderTextColor="#475569"
                      value={item.size}
                      onChangeText={(v) => handleUpdateSize(item.id, 'size', v)}
                    />
                  </View>
                  <View style={styles.col}>
                    <TextInput
                      style={styles.input}
                      placeholder="Jumlah stok"
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                      value={item.stock}
                      onChangeText={(v) => handleUpdateSize(item.id, 'stock', v)}
                    />
                  </View>
                </View>
                {sizes.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveSize(item.id)}
                  >
                    <Octicons name="trash" size={13} color="#FFF" />
                    <Text style={styles.removeBtnText}>Hapus</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addSizeBtn} onPress={handleAddSize}>
              <Octicons name="plus" size={16} color="#FFF" />
              <Text style={styles.addSizeBtnText}>Tambah Ukuran</Text>
            </TouchableOpacity>

            <View style={{ height: 12 }} />
          </ScrollView>

          {/* ===== FOOTER ===== */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Kembali</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Octicons name="check" size={18} color="#FFF" />
                  <Text style={styles.saveBtnText}>Simpan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    backgroundColor: '#FC6A0A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F1F5F9',
    letterSpacing: 1,
  },

  // FORM
  formContent: {
    padding: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  col: {
    flex: 1,
  },
  fullRow: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  rpBox: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  rpText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F1F5F9',
  },
  hint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
    fontStyle: 'italic',
  },

  // DIVIDER
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FC6A0A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // SIZE BLOCK
  sizeBlock: {
    marginBottom: 4,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
    marginBottom: 8,
    marginTop: 2,
  },
  removeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addSizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  addSizeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // FOOTER
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: '#FC6A0A',
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default EditProductModal;