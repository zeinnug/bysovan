// pages/NewTransactionScreen.js - Main Screen dengan UI Components (UPDATED - No Discount %)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeScanner from '../keduitan/qrscan';
import { COLORS, cardShadow, formatCurrency } from '../utils/styleHelpers';
import { useTransactionLogic } from '../keduitan/sold';

export default function NewTransactionScreen({ navigation }) {
  const {
    // State
    products,
    currentProducts,
    searchQuery,
    setSearchQuery,
    cart,
    loading,
    showScanner,
    setShowScanner,
    isProductsLoaded,
    currentPage,
    totalPages,
    newPrice,
    setNewPrice,
    customerData,
    dispatchCustomer,
    
    // Functions
    loadProducts,
    handlePrevious,
    handleNext,
    addToCart,
    removeFromCart,
    updateQuantity,
    calculateSubtotal,
    calculateDiscountAmount,
    calculateTotal,
    handleCheckout,
    openScanner,
    handleScanSuccess,
    handleScanError,
  } = useTransactionLogic(navigation);

  const handleUpdateCustomerField = (field, value) => {
    dispatchCustomer({ type: 'UPDATE_FIELD', field, value });
  };

  // ========== UI COMPONENTS ==========

  const renderProductItem = ({ item }) => {
    const price = parseFloat(item.price) || 0;
    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>
            {item.name} ({item.code})
          </Text>
          <Text style={styles.productPrice}>
            {price > 0 ? formatCurrency(price) : 'Rp 0'}
          </Text>
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
          <Text style={styles.cartItemPrice}>
            {price > 0 ? formatCurrency(price) : 'Rp 0'}
          </Text>
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
              disabled={loading || !isProductsLoaded}
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
            <Text style={styles.sectionTitle}>Pilih Produk</Text>
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
            <Text style={styles.label}>Nama Pelanggan</Text>
            <TextInput
              style={styles.input}
              value={customerData.customer_name}
              onChangeText={(text) => handleUpdateCustomerField('customer_name', text)}
              placeholder="Masukkan nama pelanggan (opsional)"
              placeholderTextColor={COLORS.davysGray}
            />

            <Text style={styles.label}>No. Pelanggan</Text>
            <TextInput
              style={styles.input}
              value={customerData.customer_phone}
              onChangeText={(text) => handleUpdateCustomerField('customer_phone', text)}
              placeholder="Masukkan nomor telepon (opsional)"
              placeholderTextColor={COLORS.davysGray}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Metode Pembayaran *</Text>
            <View style={styles.paymentMethodContainer}>
              {[
                { value: 'cash', label: 'Tunai' },
                { value: 'qris', label: 'QRIS' },
                { value: 'debit', label: 'Debit' },
                { value: 'transfer', label: 'Transfer' },
              ].map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.paymentMethodButton,
                    customerData.payment_method === method.value && styles.paymentMethodActive,
                  ]}
                  onPress={() => {
                    handleUpdateCustomerField('payment_method', method.value);
                    // Reset card_type jika bukan debit
                    if (method.value !== 'debit') {
                      handleUpdateCustomerField('card_type', null);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      customerData.payment_method === method.value && styles.paymentMethodTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Card Type Selection (hanya muncul jika payment method = debit) */}
            {customerData.payment_method === 'debit' && (
              <>
                <Text style={styles.label}>Jenis Kartu Debit *</Text>
                <View style={styles.paymentMethodContainer}>
                  {[
                    { value: 'Mandiri', label: 'Mandiri' },
                    { value: 'BRI', label: 'BRI' },
                    { value: 'BCA', label: 'BCA' },
                  ].map((card) => (
                    <TouchableOpacity
                      key={card.value}
                      style={[
                        styles.cardTypeButton,
                        customerData.card_type === card.value && styles.cardTypeActive,
                      ]}
                      onPress={() => handleUpdateCustomerField('card_type', card.value)}
                    >
                      <Text
                        style={[
                          styles.cardTypeText,
                          customerData.card_type === card.value && styles.cardTypeTextActive,
                        ]}
                      >
                        {card.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Catatan</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customerData.notes}
              onChangeText={(text) => handleUpdateCustomerField('notes', text)}
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
              <Text style={styles.summaryLabel}>Harga Baru (opsional)</Text>
              <TextInput
                style={styles.newPriceInput}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="decimal-pad"
                placeholder="Rp"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>

            {/* Tampilkan diskon otomatis (read-only) jika ada harga baru */}
            {newPrice && parseFloat(newPrice) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Diskon</Text>
                <Text style={styles.discountValue}>
                  - {formatCurrency(calculateDiscountAmount())}
                </Text>
              </View>
            )}

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

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        visible={showScanner}
        availableProducts={products}
        onClose={() => {
          console.log('[NewTransactionScreen] Closing scanner');
          setShowScanner(false);
        }}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onRequestRefresh={loadProducts}
      />
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
    flexWrap: 'wrap',
  },
  paymentMethodButton: {
    flex: 1,
    minWidth: '22%',
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
  cardTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.linen,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.linen,
  },
  cardTypeActive: {
    backgroundColor: COLORS.jet,
    borderColor: COLORS.jet,
  },
  cardTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.davysGray,
  },
  cardTypeTextActive: {
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
  newPriceInput: {
    backgroundColor: COLORS.linen,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: COLORS.jet,
    width: 120,
    textAlign: 'right',
  },
  discountLabel: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
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