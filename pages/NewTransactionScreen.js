// pages/NewTransactionScreen.js - UPDATED: Keyboard-aware + Rupiah auto-format
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeScanner from '../keduitan/qrscan';
import StrukModal from '../keduitan/Struk';
import { COLORS, cardShadow, formatCurrency } from '../utils/styleHelpers';
import { useTransactionLogic } from '../keduitan/sold';

export default function NewTransactionScreen({ navigation }) {
  const scrollRef = useRef(null);

  const {
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
    handleNewPriceChange,
    customerData,
    dispatchCustomer,
    itemNewPrices,
    updateItemNewPrice,
    getEffectivePricePerItem,
    parseRupiahInput,
    showStruk,
    currentReceiptData,
    handleCloseStruk,
    loadProducts,
    handlePrevious,
    handleNext,
    addToCart,
    removeFromCart,
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

  // Scroll ke bawah saat input mendapat fokus agar tidak tertutup keyboard
  const handleInputFocus = (yOffset) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 300);
  };

  // ── Product Card ─────────────────────────────────────────────────────────
  const renderProductItem = ({ item }) => {
    const sellingPrice = parseFloat(item.selling_price || item.price) || 0;
    const discountPrice = item.discount_price ? parseFloat(item.discount_price) : null;

    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name} ({item.code})
          </Text>
          <View style={styles.productPriceRow}>
            {discountPrice ? (
              <>
                <Text style={styles.productPriceStrike}>
                  {formatCurrency(sellingPrice)}
                </Text>
                <Text style={styles.productPriceDiscount}>
                  {formatCurrency(discountPrice)}
                </Text>
              </>
            ) : (
              <Text style={styles.productPrice}>
                {sellingPrice > 0 ? formatCurrency(sellingPrice) : 'Rp 0'}
              </Text>
            )}
          </View>
          {(item.color || item.size || item.production_code) ? (
            <Text style={styles.productDetails}>
              {[
                item.color,
                item.size ? `Ukuran ${item.size}` : null,
                item.production_code || null,
              ].filter(Boolean).join(', ')}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Cart Card ────────────────────────────────────────────────────────────
  const renderCartItem = ({ item, index }) => {
    const sellingPrice = parseFloat(item.selling_price || item.price) || 0;
    const discountPrice = item.discount_price ? parseFloat(item.discount_price) : null;
    const itemNewPriceStr = itemNewPrices[item.id] || '';
    const itemNewPriceVal = parseRupiahInput(itemNewPriceStr);

    const effectivePrice = getEffectivePricePerItem(item);

    // Diskon per item = harga dasar (discount_price atau selling_price) - harga baru per item
    const baseForDiscount = discountPrice ?? sellingPrice;
    const itemDiscount = itemNewPriceVal > 0
      ? Math.max(0, baseForDiscount - itemNewPriceVal)
      : null;

    // Estimasi y-offset kartu ini untuk auto-scroll saat input fokus
    // Setiap kartu kira-kira 220px, plus offset section di atasnya (~700px)
    const estimatedOffset = 700 + index * 230;

    return (
      <View style={styles.cartItem}>
        {/* Header: nama + tombol hapus */}
        <View style={styles.cartItemHeader}>
          <Text style={styles.cartItemName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeFromCart(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Detail info */}
        <Text style={styles.cartItemDetail}>
          {[
            item.color,
            item.size ? `Ukuran: ${item.size}` : null,
            `Kode: ${item.code}`,
          ].filter(Boolean).join(', ')}
        </Text>

        <View style={styles.cartDivider} />

        {/* Harga Asli */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Harga Asli</Text>
          <Text style={styles.priceValue}>{formatCurrency(sellingPrice)}</Text>
        </View>

        {/* Harga Diskon — hanya jika ada discount_price */}
        {discountPrice !== null && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Harga Diskon</Text>
            <Text style={styles.priceValueDiscount}>{formatCurrency(discountPrice)}</Text>
          </View>
        )}

        {/* Input Harga Baru per item */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Harga Baru</Text>
          <View style={styles.rupiahInputWrapper}>
            <Text style={styles.rupiahPrefix}>Rp</Text>
            <TextInput
              style={styles.itemNewPriceInput}
              value={itemNewPriceStr}
              onChangeText={(val) => updateItemNewPrice(item.id, val)}
              keyboardType="number-pad"
              placeholder="Opsional"
              placeholderTextColor={COLORS.davysGray}
              returnKeyType="done"
              onFocus={() => handleInputFocus(estimatedOffset)}
            />
          </View>
        </View>

        {/* Diskon per item — tampil jika Harga Baru diisi */}
        {itemDiscount !== null && itemDiscount > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabelGreen}>Diskon</Text>
            <Text style={styles.priceValueGreen}>- {formatCurrency(itemDiscount)}</Text>
          </View>
        )}

        <View style={styles.cartDividerThin} />

        {/* Total item */}
        <View style={styles.priceRow}>
          <Text style={styles.totalItemLabel}>Total</Text>
          <Text style={styles.totalItemValue}>{formatCurrency(effectivePrice)}</Text>
        </View>
      </View>
    );
  };

  return (
    // KeyboardAvoidingView: mendorong konten ke atas saat keyboard muncul
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.linen} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buat Transaksi Baru</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Scanner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Produk</Text>
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

        {/* Product List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilih Produk</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={COLORS.davysGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.pumpkin} style={{ marginTop: 20 }} />
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
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationControls}>
                    <TouchableOpacity
                      style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                      onPress={handlePrevious}
                      disabled={currentPage === 1}
                    >
                      <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? COLORS.davysGray : COLORS.white} />
                      <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                        Previous
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.pageNumberContainer}>
                      <Text style={styles.pageNumber}>{currentPage}</Text>
                      <Text style={styles.pageNumberSeparator}>/</Text>
                      <Text style={styles.pageNumberTotal}>{totalPages}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                      onPress={handleNext}
                      disabled={currentPage === totalPages}
                    >
                      <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                        Next
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? COLORS.davysGray : COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>
          <View style={styles.customerCard}>
            <Text style={styles.label}>Nama Pelanggan</Text>
            <TextInput
              style={styles.input}
              value={customerData.customer_name}
              onChangeText={(text) => handleUpdateCustomerField('customer_name', text)}
              placeholder="Masukkan nama pelanggan (opsional)"
              placeholderTextColor={COLORS.davysGray}
              returnKeyType="next"
            />
            <Text style={styles.label}>No. Telepon</Text>
            <TextInput
              style={styles.input}
              value={customerData.customer_phone}
              onChangeText={(text) => handleUpdateCustomerField('customer_phone', text)}
              placeholder="Masukkan nomor telepon (opsional)"
              placeholderTextColor={COLORS.davysGray}
              keyboardType="phone-pad"
              returnKeyType="done"
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
                    if (method.value !== 'debit') handleUpdateCustomerField('card_type', null);
                  }}
                >
                  <Text style={[
                    styles.paymentMethodText,
                    customerData.payment_method === method.value && styles.paymentMethodTextActive,
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
                      <Text style={[
                        styles.cardTypeText,
                        customerData.card_type === card.value && styles.cardTypeTextActive,
                      ]}>
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
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Cart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keranjang Belanja</Text>
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

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
          <View style={styles.summaryCard}>
            {/* Subtotal */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(calculateSubtotal())}</Text>
            </View>

            {/* Harga Baru Keseluruhan */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Harga Baru{'\n'}Keseluruhan</Text>
              <View style={styles.rupiahInputWrapper}>
                <Text style={styles.rupiahPrefix}>Rp</Text>
                <TextInput
                  style={styles.newPriceInput}
                  value={newPrice}
                  onChangeText={handleNewPriceChange}
                  keyboardType="number-pad"
                  placeholder="Opsional"
                  placeholderTextColor={COLORS.davysGray}
                  returnKeyType="done"
                  onFocus={() => handleInputFocus(9999)} // scroll ke paling bawah
                />
              </View>
            </View>

            {/* Diskon — tampil jika Harga Baru Keseluruhan diisi */}
            {parseRupiahInput(newPrice) > 0 && calculateDiscountAmount() > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Diskon</Text>
                <Text style={styles.discountValue}>
                  - {formatCurrency(calculateDiscountAmount())}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Total Bayar */}
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Bayar</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
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

        {/* Extra padding bawah agar tidak tertutup keyboard */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Scanner */}
      <QRCodeScanner
        visible={showScanner}
        availableProducts={products}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onRequestRefresh={loadProducts}
      />

      {/* Struk Modal */}
      <StrukModal
        visible={showStruk}
        receiptData={currentReceiptData}
        onClose={handleCloseStruk}
        showPrintBtn={true}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.linen },

  // ── Header ──
  header: {
    backgroundColor: COLORS.jet,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, letterSpacing: 1 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // ── Scroll ──
  content: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Section ──
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.pumpkin, marginBottom: 15 },

  // ── Scanner ──
  scannerCard: {
    backgroundColor: COLORS.jet, borderRadius: 12, padding: 40,
    alignItems: 'center', ...cardShadow,
  },
  scanButton: {
    backgroundColor: COLORS.pumpkin, paddingHorizontal: 30,
    paddingVertical: 15, borderRadius: 8, marginTop: 20,
  },
  scanButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  // ── Search ──
  searchInput: {
    backgroundColor: COLORS.white, borderRadius: 8, padding: 12,
    fontSize: 14, color: COLORS.jet, marginBottom: 15,
    borderWidth: 1, borderColor: COLORS.davysGray,
  },

  // ── Product Card ──
  productCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 15, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...cardShadow,
  },
  productInfo: { flex: 1, marginRight: 10 },
  productName: { fontSize: 15, fontWeight: 'bold', color: COLORS.jet, marginBottom: 5 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  productPrice: { fontSize: 14, color: COLORS.pumpkin, fontWeight: '600' },
  productPriceStrike: { fontSize: 12, color: COLORS.davysGray, textDecorationLine: 'line-through' },
  productPriceDiscount: { fontSize: 14, color: COLORS.pumpkin, fontWeight: '700' },
  productDetails: { fontSize: 12, color: COLORS.davysGray },
  addButton: {
    backgroundColor: COLORS.pumpkin, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  addButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  // ── Cart Item ──
  cartItem: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: 16, marginBottom: 12, ...cardShadow,
  },
  cartItemHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  cartItemName: {
    fontSize: 15, fontWeight: 'bold', color: COLORS.jet,
    flex: 1, marginRight: 10, lineHeight: 22,
  },
  deleteButton: {
    backgroundColor: COLORS.goldenGate, width: 34, height: 34,
    borderRadius: 6, justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cartItemDetail: { fontSize: 12, color: COLORS.davysGray, marginBottom: 12, lineHeight: 18 },
  cartDivider: { height: 1, backgroundColor: COLORS.linen, marginBottom: 12 },
  cartDividerThin: { height: 1, backgroundColor: COLORS.linen, marginVertical: 8 },

  // Baris harga
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  priceLabel: { fontSize: 14, color: COLORS.davysGray, flex: 1 },
  priceLabelGreen: { fontSize: 14, color: COLORS.success, fontWeight: '600', flex: 1 },
  priceValue: { fontSize: 14, fontWeight: '600', color: COLORS.jet },
  priceValueDiscount: { fontSize: 14, fontWeight: '700', color: COLORS.pumpkin },
  priceValueGreen: { fontSize: 14, fontWeight: '600', color: COLORS.success },

  // Rupiah input wrapper (prefix "Rp" + input)
  rupiahInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.linen,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.davysGray,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 2,
    minWidth: 140,
  },
  rupiahPrefix: {
    fontSize: 14, color: COLORS.davysGray,
    marginRight: 4, flexShrink: 0,
  },
  itemNewPriceInput: {
    fontSize: 14, color: COLORS.jet,
    flex: 1, textAlign: 'right',
    padding: 0, minWidth: 80,
  },

  // Total item
  totalItemLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.jet },
  totalItemValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.pumpkin },

  // ── Customer Card ──
  customerCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20, ...cardShadow },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.jet, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: COLORS.linen, borderRadius: 8, padding: 12,
    fontSize: 14, color: COLORS.jet, borderWidth: 1, borderColor: COLORS.linen,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  paymentMethodContainer: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  paymentMethodButton: {
    flex: 1, minWidth: '22%', paddingVertical: 12, borderRadius: 8,
    backgroundColor: COLORS.linen, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.linen,
  },
  paymentMethodActive: { backgroundColor: COLORS.pumpkin, borderColor: COLORS.pumpkin },
  paymentMethodText: { fontSize: 14, fontWeight: '600', color: COLORS.davysGray },
  paymentMethodTextActive: { color: COLORS.white },
  cardTypeButton: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: COLORS.linen, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.linen,
  },
  cardTypeActive: { backgroundColor: COLORS.jet, borderColor: COLORS.jet },
  cardTypeText: { fontSize: 14, fontWeight: '600', color: COLORS.davysGray },
  cardTypeTextActive: { color: COLORS.white },

  // ── Empty ──
  emptyCart: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: 40, alignItems: 'center', ...cardShadow,
  },
  emptyText: { fontSize: 16, color: COLORS.davysGray, marginTop: 10, textAlign: 'center' },

  // ── Summary Card ──
  summaryCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20, ...cardShadow },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 15,
  },
  summaryLabel: { fontSize: 14, color: COLORS.davysGray, flex: 1, lineHeight: 20 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: COLORS.jet },
  newPriceInput: {
    fontSize: 14, color: COLORS.jet,
    flex: 1, textAlign: 'right',
    padding: 0, minWidth: 90,
  },
  discountLabel: { fontSize: 14, color: COLORS.success, fontWeight: '600' },
  discountValue: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  divider: { height: 1, backgroundColor: COLORS.linen, marginVertical: 10 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.jet },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.pumpkin },
  checkoutButton: {
    backgroundColor: COLORS.success, paddingVertical: 16,
    borderRadius: 8, alignItems: 'center', marginTop: 20,
  },
  checkoutButtonDisabled: { opacity: 0.6 },
  checkoutButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  // ── Pagination ──
  paginationContainer: {
    backgroundColor: COLORS.jet, paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 12, marginTop: 15, alignItems: 'center',
  },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paginationButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.pumpkin,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 6,
  },
  paginationButtonDisabled: { backgroundColor: COLORS.davysGray, opacity: 0.5 },
  paginationButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  paginationButtonTextDisabled: { color: COLORS.davysGray },
  pageNumberContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.linen,
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
    minWidth: 80, justifyContent: 'center', gap: 4,
  },
  pageNumber: { fontSize: 16, fontWeight: 'bold', color: COLORS.jet },
  pageNumberSeparator: { fontSize: 16, fontWeight: '600', color: COLORS.davysGray },
  pageNumberTotal: { fontSize: 16, fontWeight: '600', color: COLORS.davysGray },
});