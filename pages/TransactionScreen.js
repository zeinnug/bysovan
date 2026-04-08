// pages/TransactionScreen.js - UPDATED dengan Filter Tanggal & Metode Pembayaran
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
  Alert, Dimensions, SafeAreaView, StatusBar, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { filterTransactions } from '../data/services/transactionService';
import StrukModal, { buildReceiptData, getReceiptByInvoice } from '../keduitan/Struk';

const { width } = Dimensions.get('window');

const COLORS = {
  jet: '#1A1A1A', jetLight: '#2C2C2C', davysGray: '#6B6B6B',
  linen: '#F7F1EB', linenDark: '#EDE3D9', pumpkin: '#FC6A0A',
  pumpkinLight: '#FD8A3C', pumpkinDim: '#FC6A0A18', goldenGate: '#E74504',
  white: '#FFFFFF', success: '#10B981', successDim: '#10B98115',
  cardBg: '#FFFFFF', border: '#F0E8E0',
  // Filter panel (dark theme seperti gambar)
  filterBg: '#1A1A1A', filterCard: '#2A3347', filterBorder: '#374151',
  filterText: '#FC6A0A', filterMuted: '#ffffff',
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
  if (m === 'cash' || m === 'tunai') return PAYMENT_COLORS.cash;
  if (m === 'qris') return PAYMENT_COLORS.qris;
  if (m.includes('transfer')) return PAYMENT_COLORS.transfer;
  if (m === 'debit') return PAYMENT_COLORS.debit;
  return PAYMENT_COLORS.default;
};

const PAYMENT_OPTIONS = [
  { label: 'Semua Metode', value: '' },
  { label: 'Tunai', value: 'cash' },
  { label: 'QRIS', value: 'qris' },
  { label: 'Debit', value: 'debit' },
  { label: 'Transfer', value: 'transfer' },
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Custom Calendar Component ──────────────────────────────────────────────
function CustomCalendar({ selectedDate, onSelectDate, onClear, onToday }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selectedDate || today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build calendar grid (6 rows × 7 cols)
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: daysInPrevMonth - firstDay + 1 + i, type: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current' });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: 'next' });
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isSelected = (day, type) => {
    if (!selectedDate || type !== 'current') return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const isToday = (day, type) => {
    if (type !== 'current') return false;
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  return (
    <View style={calStyles.container}>
      {/* Month / Year header */}
      <View style={calStyles.header}>
        <Text style={calStyles.monthYear}>
          {MONTHS[month]} {year} ▼
        </Text>
        <View style={calStyles.navRow}>
          <TouchableOpacity style={calStyles.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-up" size={16} color={COLORS.filterText} />
          </TouchableOpacity>
          <TouchableOpacity style={calStyles.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-down" size={16} color={COLORS.filterText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day names */}
      <View style={calStyles.dayNames}>
        {DAYS.map((d) => (
          <Text key={d} style={calStyles.dayName}>{d}</Text>
        ))}
      </View>

      {/* Date grid */}
      <View style={calStyles.grid}>
        {cells.map((cell, idx) => {
          const sel = isSelected(cell.day, cell.type);
          const tod = isToday(cell.day, cell.type);
          return (
            <TouchableOpacity
              key={idx}
              style={[
                calStyles.cell,
                sel && calStyles.cellSelected,
                tod && !sel && calStyles.cellToday,
              ]}
              onPress={() => {
                if (cell.type === 'current') {
                  onSelectDate(new Date(year, month, cell.day));
                } else if (cell.type === 'prev') {
                  const d = new Date(year, month - 1, cell.day);
                  setViewDate(new Date(year, month - 1, 1));
                  onSelectDate(d);
                } else {
                  const d = new Date(year, month + 1, cell.day);
                  setViewDate(new Date(year, month + 1, 1));
                  onSelectDate(d);
                }
              }}
            >
              <Text style={[
                calStyles.cellText,
                cell.type !== 'current' && calStyles.cellTextOther,
                sel && calStyles.cellTextSelected,
                tod && !sel && calStyles.cellTextToday,
              ]}>
                {cell.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={calStyles.footer}>
        <TouchableOpacity onPress={onClear}>
          <Text style={calStyles.footerClear}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { onSelectDate(today); setViewDate(today); onToday(); }}>
          <Text style={calStyles.footerToday}>Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Payment Dropdown Component ──────────────────────────────────────────────
function PaymentDropdown({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = PAYMENT_OPTIONS.find((o) => o.value === value) || PAYMENT_OPTIONS[0];

  return (
    <View style={dropStyles.wrapper}>
      <TouchableOpacity
        style={[dropStyles.trigger, open && dropStyles.triggerOpen]}
        onPress={() => setOpen(!open)}
      >
        <Text style={dropStyles.triggerText}>{selected.label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.filterMuted} />
      </TouchableOpacity>
      {open && (
        <View style={dropStyles.menu}>
          {PAYMENT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[dropStyles.menuItem, opt.value === value && dropStyles.menuItemActive]}
              onPress={() => { onSelect(opt.value); setOpen(false); }}
            >
              <Text style={[dropStyles.menuItemText, opt.value === value && dropStyles.menuItemTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function TransactionScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filter state ──
  const [filterOpen, setFilterOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [activePaymentFilter, setActivePaymentFilter] = useState('');

  // ── Struk state ──
  const [showStruk, setShowStruk] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date) => {
    if (!date) return '--/--/----';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const todayStr = formatDateToYYYYMMDD(new Date());

  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      setSelectedDate(today);
      setActivePaymentFilter('');
      loadTransactionsWithFilter({ date: todayStr, payment_method: '' });
    }, [])
  );

  const loadTransactionsWithFilter = async (customFilter) => {
    try {
      setLoading(true);
      const result = await filterTransactions({
        date: customFilter?.date || todayStr,
        payment_method: customFilter?.payment_method || undefined,
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

  const applyFilter = (date, paymentMethod) => {
    loadTransactionsWithFilter({
      date: formatDateToYYYYMMDD(date),
      payment_method: paymentMethod,
    });
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    applyFilter(date, activePaymentFilter);
  };

  const handlePaymentChange = (value) => {
    setActivePaymentFilter(value);
    applyFilter(selectedDate, value);
  };

  const handleResetFilter = () => {
    const today = new Date();
    setSelectedDate(today);
    setActivePaymentFilter('');
    loadTransactionsWithFilter({ date: todayStr, payment_method: '' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactionsWithFilter({
      date: formatDateToYYYYMMDD(selectedDate),
      payment_method: activePaymentFilter,
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

  // ── Tampilkan Struk ──
  const handleShowStruk = useCallback(async (transaction) => {
    setLoadingReceipt(true);
    try {
      const stored = await getReceiptByInvoice(transaction.invoice_number);
      if (stored) {
        setSelectedReceipt(stored);
        setShowStruk(true);
        setLoadingReceipt(false);
        return;
      }
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

  // ── Transaction Card ──
  const renderTransactionCard = ({ item, index }) => {
    if (!item) return null;
    const payColor = getPaymentColor(item.payment_method);
    const isPaid = item.payment_status === 'paid';
    const itemCount = item.items?.length || 0;

    return (
      <View style={styles.transactionCard}>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.jet} />
      <View style={styles.container}>

        {/* ── Header ── */}
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

        {/* ── Filter Panel ── */}
        <View style={filterStyles.panel}>
          {/* Panel header / toggle */}
          <TouchableOpacity style={filterStyles.panelHeader} onPress={() => setFilterOpen(!filterOpen)}>
            <View style={filterStyles.panelTitleRow}>
              <Ionicons name="filter-outline" size={16} color={COLORS.filterText} />
              <Text style={filterStyles.panelTitle}>Filter Transaksi</Text>
            </View>
            <View style={filterStyles.toggleBox}>
              <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.filterMuted} />
            </View>
          </TouchableOpacity>

          {filterOpen && (
            <>
              <View style={filterStyles.divider} />
              <View style={filterStyles.body}>
                {/* Tanggal */}
                <View style={filterStyles.fieldGroup}>
                  <Text style={filterStyles.fieldLabel}>Tanggal</Text>
                  <TouchableOpacity
                    style={filterStyles.dateInput}
                    onPress={() => setShowCalendar(!showCalendar)}
                  >
                    <Text style={filterStyles.dateInputText}>
                      {formatDateDisplay(selectedDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.filterMuted} />
                  </TouchableOpacity>

                  {/* Calendar popup */}
                  {showCalendar && (
                    <CustomCalendar
                      selectedDate={selectedDate}
                      onSelectDate={handleDateSelect}
                      onClear={() => { setSelectedDate(null); setShowCalendar(false); applyFilter(null, activePaymentFilter); }}
                      onToday={() => setShowCalendar(false)}
                    />
                  )}
                </View>

                {/* Metode Pembayaran */}
                <View style={filterStyles.fieldGroup}>
                  <Text style={filterStyles.fieldLabel}>Metode Pembayaran</Text>
                  <PaymentDropdown value={activePaymentFilter} onSelect={handlePaymentChange} />
                </View>

                {/* Reset Button */}
                <TouchableOpacity style={filterStyles.resetBtn} onPress={handleResetFilter}>
                  <Ionicons name="refresh-outline" size={14} color={COLORS.filterText} />
                  <Text style={filterStyles.resetBtnText}>Reset Filter</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ── Content ── */}
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
            <Text style={styles.emptySubtitle}>Tidak ada transaksi untuk filter yang dipilih</Text>
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

      {/* ── Struk Modal ── */}
      <StrukModal
        visible={showStruk}
        receiptData={selectedReceipt}
        onClose={() => { setShowStruk(false); setSelectedReceipt(null); }}
        showPrintBtn={true}
      />
    </SafeAreaView>
  );
}

// ─── Filter Panel Styles ──────────────────────────────────────────────────────
const filterStyles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.filterBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.filterBorder,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.filterText,
  },
  toggleBox: {
    backgroundColor: COLORS.filterCard,
    borderWidth: 1,
    borderColor: COLORS.filterBorder,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: width * 0.6,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.filterBorder,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
  },
  fieldGroup: {
    flex: 1,
    minWidth: 140,
    position: 'relative',
    zIndex: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.filterMuted,
    marginBottom: 6,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.filterCard,
    borderWidth: 1,
    borderColor: COLORS.filterBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputText: {
    fontSize: 14,
    color: COLORS.filterText,
    fontWeight: '500',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.filterCard,
    borderWidth: 1,
    borderColor: COLORS.filterBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.filterText,
  },
});

// ─── Calendar Styles ──────────────────────────────────────────────────────────
const calStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: COLORS.filterCard,
    borderWidth: 1,
    borderColor: COLORS.filterBorder,
    borderRadius: 12,
    padding: 12,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthYear: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.filterText,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    padding: 4,
  },
  dayNames: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.filterMuted,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  cellSelected: {
    backgroundColor: COLORS.filterBorder,
    borderWidth: 2,
    borderColor: COLORS.filterText,
  },
  cellToday: {},
  cellText: {
    fontSize: 13,
    color: COLORS.filterText,
    fontWeight: '500',
  },
  cellTextOther: {
    color: COLORS.filterMuted,
    opacity: 0.5,
  },
  cellTextSelected: {
    color: COLORS.filterText,
    fontWeight: '700',
  },
  cellTextToday: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.filterBorder,
  },
  footerClear: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
  },
  footerToday: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
  },
});

// ─── Dropdown Styles ──────────────────────────────────────────────────────────
const dropStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 20,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.filterCard,
    borderWidth: 1,
    borderColor: COLORS.filterBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerOpen: {
    borderColor: '#60A5FA',
  },
  triggerText: {
    fontSize: 14,
    color: COLORS.filterText,
    fontWeight: '500',
  },
  menu: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: COLORS.filterCard,
    borderWidth: 1,
    borderColor: COLORS.filterBorder,
    borderRadius: 8,
    zIndex: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemActive: {
    backgroundColor: '#374151',
  },
  menuItemText: {
    fontSize: 14,
    color: COLORS.filterText,
    fontWeight: '500',
  },
  menuItemTextActive: {
    fontWeight: '700',
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
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