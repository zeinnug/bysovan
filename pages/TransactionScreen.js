// pages/TransactionScreen.js - UPDATED dengan tombol Cetak Struk
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
  Alert, Dimensions, SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { filterTransactions } from '../data/services/transactionService'; // getTransactionById dihapus karena tidak lagi digunakan
import StrukModal, { buildReceiptData, getReceiptByInvoice } from '../keduitan/Struk';

const { width } = Dimensions.get('window');

const COLORS = {
  jet: '#1A1A1A', jetLight: '#2C2C2C', davysGray: '#6B6B6B',
  linen: '#F7F1EB', linenDark: '#EDE3D9', pumpkin: '#FC6A0A',
  pumpkinLight: '#FD8A3C', pumpkinDim: '#FC6A0A18', goldenGate: '#E74504',
  white: '#FFFFFF', success: '#10B981', successDim: '#10B98115',
  cardBg: '#FFFFFF', border: '#F0E8E0',
};

const PAYMENT_COLORS = {
  cash:     { bg: '#FFF3E0', text: '#E65100', dot: '#FF6D00' },
  qris:     { bg: '#E8F5E9', text: '#1B5E20', dot: '#2E7D32' },
  transfer: { bg: '#E3F2FD', text: '#0D47A1', dot: '#1565C0' },
  debit:    { bg: '#F3E5F5', text: '#4A148C', dot: '#6A1B9A' },
  default:  { bg: '#F5F5F5', text: '#424242', dot: '#616161' },
};

const getPaymentColor = (method) => {
  const m = (method || '').toLowerCase();
  if (m === 'cash') return PAYMENT_COLORS.cash;
  if (m === 'qris') return PAYMENT_COLORS.qris;
  if (m.includes('transfer')) return PAYMENT_COLORS.transfer;
  if (m === 'debit') return PAYMENT_COLORS.debit;
  return PAYMENT_COLORS.default;
};

export default function TransactionScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePaymentFilter, setActivePaymentFilter] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('');

  // ── Struk state ──────────────────────────────────────────────────────────
  const [showStruk, setShowStruk] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = formatDateToYYYYMMDD(new Date());

  useFocusEffect(
    useCallback(() => {
      setActivePaymentFilter('');
      setActiveStatusFilter('');
      loadTransactionsWithFilter({ date: todayStr, payment_method: '', status: '' });
    }, [])
  );

  const loadTransactionsWithFilter = async (customFilter) => {
    try {
      setLoading(true);
      const result = await filterTransactions({
        date: customFilter?.date || todayStr,
        payment_method: customFilter?.payment_method || undefined,
        status: customFilter?.status || undefined,
      });
      if (result.success) {
        const transactionData =
          result.data?.data?.transactions && Array.isArray(result.data.data.transactions)
            ? result.data.data.transactions
            : Array.isArray(result.data) ? result.data
            : result.data?.transactions ? result.data.transactions
            : [];
        setTransactions(transactionData);
      } else {
        setTransactions([]);
        Alert.alert('Error', result.error || 'Gagal memuat transaksi');
      }
    } catch {
      setTransactions([]);
      Alert.alert('Error', 'Terjadi kesalahan saat memuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFilter = (value) => {
    const newVal = activePaymentFilter === value ? '' : value;
    setActivePaymentFilter(newVal);
    loadTransactionsWithFilter({ date: todayStr, payment_method: newVal, status: activeStatusFilter });
  };

  const handleStatusFilter = (value) => {
    const newVal = activeStatusFilter === value ? '' : value;
    setActiveStatusFilter(newVal);
    loadTransactionsWithFilter({ date: todayStr, payment_method: activePaymentFilter, status: newVal });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactionsWithFilter({
      date: todayStr,
      payment_method: activePaymentFilter,
      status: activeStatusFilter,
    });
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
      }).format(amount || 0);
    } catch {
      return `Rp ${(amount || 0).toLocaleString('id-ID')}`;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDisplayDate = () => new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const calculateTotal = () => {
    if (!Array.isArray(transactions)) return 0;
    return transactions.reduce((sum, t) => sum + (t.final_amount || t.total || 0), 0);
  };

  const paidCount = transactions.filter((t) => t.payment_status === 'paid').length;

  // ── Tampilkan Struk ──────────────────────────────────────────────────────
  const handleShowStruk = useCallback(async (transaction) => {
    setLoadingReceipt(true);
    try {
      // Coba dari storage lokal dulu
      const stored = await getReceiptByInvoice(transaction.invoice_number);
      if (stored) {
        setSelectedReceipt(stored);
        setShowStruk(true);
        setLoadingReceipt(false);
        return;
      }

      // Bangun langsung dari data transaksi yang ada (tanpa fetch API)
      const receiptData = buildReceiptData(
        { data: transaction },
        (transaction.items || []).map((item) => ({
          name: item.product_name || item.name,
          unit_code: item.unit_code || item.code,
          quantity: item.quantity,
          price: item.unit_price || item.price,
          subtotal: item.subtotal || item.quantity * (item.unit_price || item.price),
          color: item.color || null,
          size: item.size || null,
        })),
        {
          customer_name: transaction.customer_name,
          customer_phone: transaction.customer_phone,
          payment_method: transaction.payment_method,
          card_type: transaction.card_type,
          notes: transaction.notes,
        },
        transaction.final_amount || transaction.total || 0,
        transaction.discount_amount || 0
      );
      setSelectedReceipt(receiptData);
      setShowStruk(true);
    } catch (error) {
      console.error('Error loading receipt:', error);
      Alert.alert('Error', 'Gagal memuat data struk');
    } finally {
      setLoadingReceipt(false);
    }
  }, []);

  // ── Transaction Card ─────────────────────────────────────────────────────
  const renderTransactionCard = ({ item, index }) => {
    if (!item) return null;
    const payColor = getPaymentColor(item.payment_method);
    const isPaid = item.payment_status === 'paid';
    const itemCount = item.items?.length || 0;

    return (
      <View style={styles.transactionCard}>
        {/* Top Row */}
        <View style={styles.cardTop}>
          <View style={styles.cardIndexBadge}>
            <Text style={styles.cardIndexText}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.invoiceText} numberOfLines={1}>
              {item.invoice_number || `TRX-${item.id}`}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: isPaid ? COLORS.successDim : '#FFF3E0' }]}>
            <View style={[styles.statusDot, { backgroundColor: isPaid ? COLORS.success : '#FF6D00' }]} />
            <Text style={[styles.statusPillText, { color: isPaid ? COLORS.success : '#E65100' }]}>
              {isPaid ? 'Lunas' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Info Grid */}
        <View style={styles.cardGrid}>
          <View style={styles.cardGridItem}>
            <Text style={styles.gridLabel}>Customer</Text>
            <Text style={styles.gridValue} numberOfLines={1}>
              {item.customer_name || 'Umum'}
            </Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.gridLabel}>Produk</Text>
            <Text style={styles.gridValue}>{itemCount > 0 ? `${itemCount} item` : '-'}</Text>
          </View>
        </View>

        {/* Bottom Row */}
        <View style={styles.cardBottom}>
          <View style={[styles.paymentChip, { backgroundColor: payColor.bg }]}>
            <View style={[styles.paymentDot, { backgroundColor: payColor.dot }]} />
            <Text style={[styles.paymentChipText, { color: payColor.text }]}>
              {(item.payment_method || 'Cash').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.amountText}>
            {formatCurrency(item.final_amount || item.total || 0)}
          </Text>
        </View>

        {/* ── Tombol Cetak Struk ── */}
        <TouchableOpacity
          style={styles.printReceiptBtn}
          onPress={() => handleShowStruk(item)}
          disabled={loadingReceipt}
        >
          {loadingReceipt ? (
            <ActivityIndicator size="small" color={COLORS.pumpkin} />
          ) : (
            <>
              <Ionicons name="receipt-outline" size={15} color={COLORS.pumpkin} />
              <Text style={styles.printReceiptBtnText}>Lihat / Cetak Struk</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const paymentFilters = [
    { label: 'Semua', value: '' },
    { label: 'Cash', value: 'cash' },
    { label: 'QRIS', value: 'qris' },
    { label: 'Transfer', value: 'transfer' },
    { label: 'Debit', value: 'debit' },
  ];
  const statusFilters = [
    { label: 'Semua', value: '' },
    { label: 'Lunas', value: 'paid' },
    { label: 'Pending', value: 'unpaid' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.jet} />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brandName}>@SEPATUBYSOVAN</Text>
              <Text style={styles.headerDate}>{formatDisplayDate()}</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color={COLORS.pumpkin} />
                : <Ionicons name="refresh-outline" size={20} color={COLORS.pumpkin} />
              }
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Transaksi</Text>
            </View>
            <View style={[styles.statCard, styles.statCardHighlight]}>
              <Text style={[styles.statValue, styles.statValueHighlight]}>
                {formatCurrency(calculateTotal())}
              </Text>
              <Text style={[styles.statLabel, { color: COLORS.pumpkinLight }]}>Total Pendapatan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{paidCount}</Text>
              <Text style={styles.statLabel}>Lunas</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('NewTransaction')}>
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.actionBtnText}>Transaksi Baru</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('SalesReport')}>
              <Ionicons name="bar-chart-outline" size={18} color={COLORS.pumpkin} />
              <Text style={[styles.actionBtnText, { color: COLORS.pumpkin }]}>Laporan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Text style={styles.filterSectionLabel}>Bayar:</Text>
            {paymentFilters.map((f) => {
              const isActive = activePaymentFilter === f.value;
              return (
                <TouchableOpacity
                  key={`pay-${f.value}`}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handlePaymentFilter(f.value)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.filterSeparator} />
            <Text style={styles.filterSectionLabel}>Status:</Text>
            {statusFilters.map((f) => {
              const isActive = activeStatusFilter === f.value;
              return (
                <TouchableOpacity
                  key={`status-${f.value}`}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleStatusFilter(f.value)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content */}
        {loading && transactions.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.pumpkin} />
            <Text style={styles.loadingText}>Memuat transaksi...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.pumpkin} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptySubtitle}>Transaksi hari ini akan muncul di sini</Text>
            <TouchableOpacity style={styles.newTransactionBtn} onPress={() => navigation.navigate('NewTransaction')}>
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.newTransactionBtnText}>Buat Transaksi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionCard}
            keyExtractor={(item, index) =>
              item?.id?.toString() || item?.transaction_id?.toString() || index.toString()
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.pumpkin]} tintColor={COLORS.pumpkin} />
            }
            ListHeaderComponent={
              <Text style={styles.listHeader}>{transactions.length} transaksi ditemukan</Text>
            }
          />
        )}
      </View>

      {/* ── Struk Modal ─────────────────────────────────────────────────── */}
      <StrukModal
        visible={showStruk}
        receiptData={selectedReceipt}
        onClose={() => { setShowStruk(false); setSelectedReceipt(null); }}
        showPrintBtn={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.jet },
  container: { flex: 1, backgroundColor: COLORS.linen },
  header: {
    backgroundColor: COLORS.jet, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  brandName: { fontSize: 22, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  headerDate: { fontSize: 12, color: COLORS.davysGray, marginTop: 3 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.jetLight, justifyContent: 'center', alignItems: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.jetLight, borderRadius: 12, padding: 12, alignItems: 'center' },
  statCardHighlight: { flex: 2, backgroundColor: '#FC6A0A12', borderWidth: 1, borderColor: '#FC6A0A25' },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
  statValueHighlight: { color: COLORS.pumpkin, fontSize: 13 },
  statLabel: { fontSize: 11, color: COLORS.davysGray, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.pumpkin, paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.pumpkin },
  actionBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  filterSection: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 8 },
  filterSectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.davysGray, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.linen, borderWidth: 1.5, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.pumpkin, borderColor: COLORS.pumpkin },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.davysGray },
  filterChipTextActive: { color: COLORS.white },
  filterSeparator: { width: 1, height: 20, backgroundColor: COLORS.border, marginHorizontal: 4 },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },
  listHeader: { fontSize: 11, fontWeight: '700', color: COLORS.davysGray, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  transactionCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIndexBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.pumpkinDim, justifyContent: 'center', alignItems: 'center' },
  cardIndexText: { fontSize: 12, fontWeight: '800', color: COLORS.pumpkin },
  invoiceText: { fontSize: 14, fontWeight: '700', color: COLORS.jet },
  timeText: { fontSize: 11, color: COLORS.davysGray, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  cardGrid: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  cardGridItem: { flex: 1 },
  gridLabel: { fontSize: 10, color: COLORS.davysGray, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  gridValue: { fontSize: 13, fontWeight: '600', color: COLORS.jet },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  paymentChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  paymentDot: { width: 6, height: 6, borderRadius: 3 },
  paymentChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  amountText: { fontSize: 16, fontWeight: '800', color: COLORS.jet },

  // ── Tombol Cetak Struk ──
  printReceiptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8,
    backgroundColor: COLORS.pumpkinDim,
    borderWidth: 1, borderColor: `${COLORS.pumpkin}33`,
  },
  printReceiptBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.pumpkin },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.davysGray, fontWeight: '500' },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.pumpkinDim, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.jet, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: COLORS.davysGray, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  newTransactionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.pumpkin, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, gap: 8 },
  newTransactionBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});