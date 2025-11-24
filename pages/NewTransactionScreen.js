import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTransaction } from '../keduitan/transactions';
import QRCodeScanner from '../keduitan/qrscan'; // <-- added QR scanner component

const BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

// Color Palette
const COLORS = {
  jet: '#292929',
  davysGray: '#585757',
  linen: '#F5ECE4',
  pumpkin: '#FC6A0A',
  goldenGate: '#E74504',
  white: '#FFFFFF',
  success: '#32CD32',
};

export default function NewTransactionScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProductsLoaded, setIsProductsLoaded] = useState(false); // ← ADD THIS
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const itemsPerPage = 5; // 5 cards per page

  // Customer Data
  const [customerData, setCustomerData] = useState({
    customer_name: '',
    phone_number: '',
    payment_method: 'cash',
    notes: '',
  });

  // Payment Summary
  const [discount, setDiscount] = useState(0);
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products when search query or products change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter((product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const getAxiosConfig = async () => {
    const token = await getAuthToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const loadProducts = async () => {
    setLoading(true);
    setIsProductsLoaded(false);
    try {
      const config = await getAxiosConfig();
      const response = await axios.get(`${BASE_URL}/products`, config);
      
      // ✅ FIX: Pastikan productData adalah array
      let productData = [];
      
      if (response.data.products && Array.isArray(response.data.products)) {
        productData = response.data.products;
      } else if (response.data.data && Array.isArray(response.data.data.products)) {
        productData = response.data.data.products;
      } else if (Array.isArray(response.data)) {
        productData = response.data;
      } else {
        console.warn('Unexpected response format:', response.data);
        productData = [];
      }
      
      // ✅ DETAILED DEBUG LOGGING
      console.log('=== PRODUCTS DEBUG ===');
      console.log('Type:', typeof productData);
      console.log('Is Array:', Array.isArray(productData));
      console.log('Length:', productData.length);
      if (productData.length > 0) {
        console.log('Sample product:', productData[0]);
        console.log('Sample product keys:', Object.keys(productData[0]));
        console.log('Sample product.price:', productData[0].price);
        console.log('Sample product.code:', productData[0].code);
        console.log('Sample product.id:', productData[0].id);
      }
      console.log('=== END DEBUG ===');
      
      console.log('✓ Products loaded:', productData.length);
      
      setProducts(productData);
      setFilteredProducts(productData);
      setIsProductsLoaded(true);
    } catch (error) {
      console.error('Error loading products:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', 'Gagal memuat data produk');
      setProducts([]); // ← SET EMPTY ARRAY ON ERROR
      setFilteredProducts([]);
      setIsProductsLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter((product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  // Reset to page 1 when filtered products change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          product_id: product.id,
          name: product.name,
          code: product.code,
          price: parseFloat(product.price || 0),
          quantity: 1,
        },
      ]);
    }

    Alert.alert('Berhasil', `${product.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * discount) / 100;
    const afterDiscount = subtotal - discountAmount;
    return newPrice ? parseFloat(newPrice) : afterDiscount;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong');
      return;
    }

    if (!customerData.customer_name.trim()) {
      Alert.alert('Error', 'Mohon isi nama pelanggan');
      return;
    }

    setLoading(true);

    try {
      // Gunakan fungsi dari transactions.js untuk konsistensi
      const result = await createTransaction({
        customer_name: customerData.customer_name,
        phone_number: customerData.phone_number,
        payment_method: customerData.payment_method,
        notes: customerData.notes,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: calculateSubtotal(),
        discount: discount,
        total: calculateTotal(),
      });

      if (result.success) {
        Alert.alert('Sukses', 'Transaksi berhasil dibuat', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
        
        // Reset form
        setCart([]);
        setCustomerData({
          customer_name: '',
          phone_number: '',
          payment_method: 'cash',
          notes: '',
        });
        setDiscount(0);
        setNewPrice('');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Gagal membuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  const openScanner = () => {
    // Check if products already loaded
    if (!isProductsLoaded) {
      Alert.alert(
        'Tunggu',
        'Data produk sedang dimuat. Silakan coba lagi dalam beberapa detik.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if products list is empty
    if (products.length === 0) {
      Alert.alert(
        'Tidak Ada Data',
        'Tidak ada produk yang tersedia untuk di-scan. Tambahkan produk terlebih dahulu.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowScanner(true);
  };

  const handleScanSuccess = (cartItem) => {
    // Scanner akan menutup otomatis setelah scan (dipanggil di qrscan.js)
    // Tidak perlu setShowScanner(false) di sini
    
    if (cartItem && cartItem.id) {
      // Data dari scanner sudah dalam format cart item
      // Cek apakah item sudah ada di cart
      const existingItem = cart.find((item) => item.id === cartItem.id);

      if (existingItem) {
        // Jika sudah ada, tambahkan quantity
        setCart(
          cart.map((item) =>
            item.id === cartItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        // Jika belum ada, tambahkan item baru
        setCart([...cart, cartItem]);
      }

      // Alert akan muncul setelah scanner menutup
      setTimeout(() => {
        Alert.alert('Berhasil', `${cartItem.name} ditambahkan ke keranjang dari hasil scan`);
      }, 300);
    } else {
      Alert.alert('Info', 'Hasil scan tidak cocok dengan produk yang tersedia');
    }
  };

  const handleScanError = (title = 'Error', message = 'Gagal melakukan scan') => {
    setShowScanner(false);
    Alert.alert(title, message);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>
          {item.name} ({item.code})
        </Text>
        <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
        <Text style={styles.productDetails}>
          {item.color && `${item.color}, `}
          {item.size && `Ukuran ${item.size}, `}
          {item.production_code || ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCart(item)}
      >
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.addButtonText}>Tambah</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>{formatCurrency(item.price)}</Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={16} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Ionicons name="trash" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.linen} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buat Transaksi Baru</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Scanner Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scan Produk</Text>
          </View>
          <View style={styles.scannerCard}>
            <Ionicons name="camera" size={64} color={COLORS.pumpkin} />
            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={openScanner}
              disabled={loading || !isProductsLoaded} // ← ADD DISABLED STATE
            >
              <Text style={styles.scanButtonText}>
                {loading || !isProductsLoaded ? 'Memuat Produk...' : 'Buka Scanner'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Product List Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pilih</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={COLORS.davysGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.pumpkin} />
          ) : (
            <>
              <FlatList
                data={currentProducts}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id?.toString()}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
                }
              />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationControls}>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled
                      ]}
                      onPress={handlePrevious}
                      disabled={currentPage === 1}
                    >
                      <Ionicons 
                        name="chevron-back" 
                        size={20} 
                        color={currentPage === 1 ? COLORS.davysGray : COLORS.white} 
                      />
                      <Text 
                        style={[
                          styles.paginationButtonText,
                          currentPage === 1 && styles.paginationButtonTextDisabled
                        ]}
                      >
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.pageNumberContainer}>
                      <Text style={styles.pageNumber}>{currentPage}</Text>
                      <Text style={styles.pageNumberSeparator}>/</Text>
                      <Text style={styles.pageNumberTotal}>{totalPages}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === totalPages && styles.paginationButtonDisabled
                      ]}
                      onPress={handleNext}
                      disabled={currentPage === totalPages}
                    >
                      <Text 
                        style={[
                          styles.paginationButtonText,
                          currentPage === totalPages && styles.paginationButtonTextDisabled
                        ]}
                      >
                        Next
                      </Text>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={currentPage === totalPages ? COLORS.davysGray : COLORS.white} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Customer Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>
          </View>
          <View style={styles.customerCard}>
            <Text style={styles.label}>Nama Pelanggan *</Text>
            <TextInput
              style={styles.input}
              value={customerData.customer_name}
              onChangeText={(text) =>
                setCustomerData({ ...customerData, customer_name: text })
              }
              placeholder="Masukkan nama pelanggan"
              placeholderTextColor={COLORS.davysGray}
            />

            <Text style={styles.label}>No. Pelanggan</Text>
            <TextInput
              style={styles.input}
              value={customerData.phone_number}
              onChangeText={(text) =>
                setCustomerData({ ...customerData, phone_number: text })
              }
              placeholder="Masukkan nomor telepon"
              placeholderTextColor={COLORS.davysGray}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Metode Pembayaran</Text>
            <View style={styles.paymentMethodContainer}>
              {['cash', 'transfer', 'card'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    customerData.payment_method === method &&
                      styles.paymentMethodActive,
                  ]}
                  onPress={() =>
                    setCustomerData({ ...customerData, payment_method: method })
                  }
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      customerData.payment_method === method &&
                        styles.paymentMethodTextActive,
                    ]}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Catatan</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customerData.notes}
              onChangeText={(text) =>
                setCustomerData({ ...customerData, notes: text })
              }
              placeholder="Catatan tambahan (opsional)"
              placeholderTextColor={COLORS.davysGray}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Shopping Cart Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Keranjang Belanja</Text>
          </View>
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color={COLORS.davysGray} />
              <Text style={styles.emptyText}>Keranjang masih kosong</Text>
            </View>
          ) : (
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id?.toString()}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Payment Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateSubtotal())}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Diskon (%)</Text>
              <TextInput
                style={styles.discountInput}
                value={discount.toString()}
                onChangeText={(text) => setDiscount(parseFloat(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Harga Baru</Text>
              <TextInput
                style={styles.discountInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder="Rp"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Bayar</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Scanner modal/component */}
      <QRCodeScanner
        visible={showScanner}
        availableProducts={products}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onRequestRefresh={loadProducts}
      />

      <View style={{ height: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.linen,
  },
  header: {
    backgroundColor: COLORS.jet,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.pumpkin,
  },
  scannerCard: {
    backgroundColor: COLORS.jet,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButton: {
    backgroundColor: COLORS.pumpkin,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.jet,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.davysGray,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.jet,
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.pumpkin,
    fontWeight: '600',
    marginBottom: 5,
  },
  productDetails: {
    fontSize: 12,
    color: COLORS.davysGray,
  },
  addButton: {
    backgroundColor: COLORS.pumpkin,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  customerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.jet,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.linen,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.jet,
    borderWidth: 1,
    borderColor: COLORS.linen,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.linen,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.linen,
  },
  paymentMethodActive: {
    backgroundColor: COLORS.pumpkin,
    borderColor: COLORS.pumpkin,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.davysGray,
  },
  paymentMethodTextActive: {
    color: COLORS.white,
  },
  emptyCart: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.davysGray,
    marginTop: 10,
    textAlign: 'center',
  },
  cartItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartItemInfo: {
    marginBottom: 10,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.jet,
    marginBottom: 5,
  },
  cartItemPrice: {
    fontSize: 14,
    color: COLORS.pumpkin,
    fontWeight: '600',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    backgroundColor: COLORS.pumpkin,
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.jet,
    minWidth: 30,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.goldenGate,
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.davysGray,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.jet,
  },
  discountInput: {
    backgroundColor: COLORS.linen,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: COLORS.jet,
    width: 120,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.linen,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.jet,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.pumpkin,
  },
  checkoutButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Pagination Styles
  paginationContainer: {
    backgroundColor: COLORS.jet,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pumpkin,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: COLORS.davysGray,
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  paginationButtonTextDisabled: {
    color: COLORS.davysGray,
  },
  pageNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.linen,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
    gap: 4,
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.jet,
  },
  pageNumberSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.davysGray,
  },
  pageNumberTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.davysGray,
  },
});