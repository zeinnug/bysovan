import React, { useState, useEffect, useReducer } from 'react';
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
import { createTransaction } from '../keduitan/transactions';
import QRCodeScanner from '../keduitan/qrscan';
import { COLORS, cardShadow, formatCurrency } from '../utils/styleHelpers';
import { getProducts, updateProduct } from '../data/services/inventoryService';

const customerReducer = (state, action) => {
  if (action.type === 'UPDATE_FIELD') {
    return { ...state, [action.field]: action.value };
  }
  if (action.type === 'RESET') {
    return { customer_name: '', phone_number: '', payment_method: 'cash', notes: '' };
  }
  return state;
};

export default function NewTransactionScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProductsLoaded, setIsProductsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [newPrice, setNewPrice] = useState('');
  const [customerData, dispatchCustomer] = useReducer(customerReducer, {
    customer_name: '',
    phone_number: '',
    payment_method: 'cash',
    notes: '',
  });
  
  const itemsPerPage = 5;

  useEffect(() => {
    const filtered = !searchQuery.trim() ? products : products.filter((p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setIsProductsLoaded(false);
      
      // Gunakan getProducts dari service (sama seperti InventoryScreen)
      const result = await getProducts({ perPage: 1000 });
      
      if (result.success && result.data?.products) {
        // Map produk dengan field harga yang sesuai dan generate kode jika kosong
        const mappedProducts = result.data.products.map((p) => {
          // Generate unit code sesuai dengan logika InventoryScreen
          let unitCode = '';
          if (p.units && p.units.length > 0 && p.units[0].unitCode) {
            unitCode = p.units[0].unitCode;
          } else if (p.barcode) {
            unitCode = p.barcode;
          } else if (p.code) {
            unitCode = p.code;
          } else {
            // Fallback: generate dari ID
            unitCode = `BYS${p.id}${Date.now().toString().slice(-6)}`;
          }

          return {
            id: p.id,
            product_id: p.id,
            name: p.name || p.model || '',
            code: unitCode, // Gunakan generated unit code
            // Gunakan selling_price atau sellingPrice (sesuai dengan API)
            price: parseFloat(p.selling_price || p.sellingPrice || p.price || 0),
            color: p.color || '',
            size: p.size || '',
            production_code: p.production_code || p.code || '',
            stock: parseInt(p.stock) || 0,
          };
        });
        
        console.log('✓ Products loaded:', mappedProducts.length);
        console.log('Sample product:', mappedProducts[0]);
        
        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts);
      } else {
        console.warn('No products found or invalid response format');
        Alert.alert('Warning', 'Tidak ada data produk yang tersedia');
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Gagal memuat data produk. Periksa koneksi internet.');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
      setIsProductsLoaded(true);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const addToCart = (product) => {
    if (!product) {
      Alert.alert('Error', 'Produk tidak valid');
      return;
    }

    const price = parseFloat(product.price) || 0;
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
          price: price,
          quantity: 1,
        },
      ]);
    }

    console.log('Added to cart:', { id: product.id, name: product.name, price: price });
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
    return cart.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    if (newPrice && parseFloat(newPrice) > 0) {
      return parseFloat(newPrice);
    }
    const discountAmount = (subtotal * (parseFloat(discount) || 0)) / 100;
    return Math.max(0, subtotal - discountAmount);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong');
      return;
    }

    if (!customerData.customer_name || !customerData.customer_name.trim()) {
      Alert.alert('Error', 'Nama pelanggan harus diisi');
      return;
    }

    // Validasi payment method
    if (!customerData.payment_method) {
      Alert.alert('Error', 'Pilih metode pembayaran');
      return;
    }

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const discountPercentage = parseFloat(discount) || 0;
      const discountAmountValue = (subtotal * discountPercentage) / 100;
      const finalTotal = newPrice ? parseFloat(newPrice) : Math.max(0, subtotal - discountAmountValue);

      // Validasi unit code - harus ada kode produk yang valid
      const invalidProducts = cart.filter(item => !item.code || item.code.trim() === '');
      if (invalidProducts.length > 0) {
        Alert.alert('Error', 'Beberapa produk tidak memiliki kode. Silakan refresh data produk.');
        setLoading(false);
        return;
      }

      // Format data sesuai dengan API requirement di transactionService
      const transactionData = {
        customerName: customerData.customer_name.trim(),
        customerPhone: customerData.phone_number?.trim() || null,
        customerEmail: null,
        paymentMethod: customerData.payment_method.trim(),
        cardType: null,
        discountAmount: Math.max(0, discountAmountValue), // Ensure >= 0
        products: cart.map((item) => ({
          unitCode: item.code.trim(),
          quantity: parseInt(item.quantity) || 1,
          discountPrice: null,
        })),
        notes: customerData.notes?.trim() || null,
      };

      console.log('Transaction data:', JSON.stringify(transactionData, null, 2));

      const result = await createTransaction(transactionData);

      if (result.success) {
        // Update stok di inventory untuk setiap produk
        try {
          for (const item of cart) {
            const product = products.find(p => p.id === item.product_id || p.id === item.id);
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - (parseInt(item.quantity) || 1));
              console.log(`Updating product ${product.id} stock from ${product.stock} to ${newStock}`);
              
              // Update stock di inventory
              await updateProduct(product.id, {
                ...product,
                stock: newStock,
              });
            }
          }
        } catch (stockError) {
          console.error('Warning: Failed to update inventory stock:', stockError);
          // Jangan gagal transaksi karena error update stok
        }

        Alert.alert('Sukses', 'Transaksi berhasil dibuat', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        setCart([]);
        dispatchCustomer({ type: 'RESET' });
        setDiscount(0);
        setNewPrice('');
      } else {
        Alert.alert('Error', result.error || 'Gagal membuat transaksi');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', error.message || 'Gagal membuat transaksi');
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

  const renderProductItem = ({ item }) => {
    const price = parseFloat(item.price) || 0;
    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>
            {item.name} ({item.code})
          </Text>
          <Text style={styles.productPrice}>{price > 0 ? formatCurrency(price) : 'Rp 0'}</Text>
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
  };

  const renderCartItem = ({ item }) => {
    const price = parseFloat(item.price) || 0;
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>{price > 0 ? formatCurrency(price) : 'Rp 0'}</Text>
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
  };

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
              onChangeText={(text) => dispatchCustomer({ type: 'UPDATE_FIELD', field: 'customer_name', value: text })}
              placeholder="Masukkan nama pelanggan"
              placeholderTextColor={COLORS.davysGray}
            />

            <Text style={styles.label}>No. Pelanggan</Text>
            <TextInput
              style={styles.input}
              value={customerData.phone_number}
              onChangeText={(text) => dispatchCustomer({ type: 'UPDATE_FIELD', field: 'phone_number', value: text })}
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
                    customerData.payment_method === method && styles.paymentMethodActive,
                  ]}
                  onPress={() => dispatchCustomer({ type: 'UPDATE_FIELD', field: 'payment_method', value: method })}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      customerData.payment_method === method && styles.paymentMethodTextActive,
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
              onChangeText={(text) => dispatchCustomer({ type: 'UPDATE_FIELD', field: 'notes', value: text })}
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
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Harga Baru (opsional)</Text>
              <TextInput
                style={styles.discountInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="decimal-pad"
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
    ...cardShadow,
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
    ...cardShadow,
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
    ...cardShadow,
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
    ...cardShadow,
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
    ...cardShadow,
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
    ...cardShadow,
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