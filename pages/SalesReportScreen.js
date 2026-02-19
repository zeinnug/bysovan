import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// ✅ FIX: Import dari data/services bukan dari keduitan/transactions
import { getTransactions } from '../data/services/transactionService';

// Color Palette
const COLORS = {
  jet: '#292929',
  davysGray: '#585757',
  linen: '#F5ECE4',
  pumpkin: '#FC6A0A',
  goldenGate: '#E74504',
  white: '#FFFFFF',
};

export default function SalesReportScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [reportType, setReportType] = useState('harian');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentType, setPaymentType] = useState('');

  // Auto refresh effect - refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto refreshing data...');
      fetchTransactions();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Focus effect - refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused - refreshing data...');
      fetchTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [transactions, reportType, selectedDate, paymentType, searchQuery]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const result = await getTransactions();

      console.log('API Result:', result);

      if (result.success) {
        // ✅ FIX: Handle berbagai kemungkinan struktur data dari API
        const transactionsData =
          result.data?.data?.transactions ||
          result.data?.transactions ||
          result.data?.data ||
          (Array.isArray(result.data) ? result.data : []);

        console.log('Transactions Count:', transactionsData.length);
        setTransactions(transactionsData);
        setFilteredTransactions(transactionsData);
      } else {
        console.log('API Error:', result.error);
        Alert.alert('Error', result.error);
        setTransactions([]);
        setFilteredTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Gagal memuat data transaksi');
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Rename agar tidak konflik dengan nama import filterTransactions
  const applyFilter = () => {
    if (!Array.isArray(transactions)) {
      setFilteredTransactions([]);
      return;
    }

    let filtered = [...transactions];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.items?.some((item) =>
            item.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Filter by payment type
    if (paymentType) {
      filtered = filtered.filter((t) => {
        const method = t.payment_method?.toLowerCase() || '';
        const selectedMethod = paymentType.toLowerCase();
        if (selectedMethod === 'transfer bank' || selectedMethod === 'transfer') {
          return method === 'transfer' || method === 'transfer bank';
        }
        return method === selectedMethod;
      });
    }

    // Filter by date and report type
    if (selectedDate) {
      filtered = filtered.filter((t) => {
        if (!t.created_at) return false;

        const transactionDate = new Date(t.created_at);
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const selectedDay = selectedDate.getDate();
        const transYear = transactionDate.getFullYear();
        const transMonth = transactionDate.getMonth();
        const transDay = transactionDate.getDate();

        if (reportType === 'harian') {
          return (
            transYear === selectedYear &&
            transMonth === selectedMonth &&
            transDay === selectedDay
          );
        } else if (reportType === 'mingguan') {
          const weekStart = new Date(selectedDate);
          weekStart.setHours(0, 0, 0, 0);
          weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setHours(23, 59, 59, 999);
          weekEnd.setDate(weekStart.getDate() + 6);
          const transDateNormalized = new Date(transYear, transMonth, transDay);
          return transDateNormalized >= weekStart && transDateNormalized <= weekEnd;
        } else if (reportType === 'bulanan') {
          return transYear === selectedYear && transMonth === selectedMonth;
        } else if (reportType === 'tahunan') {
          return transYear === selectedYear;
        }
        return true;
      });
    }

    console.log('Filtered count:', filtered.length);
    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatInvoiceNumber = (date) => {
    if (!date) return '-';
    // ✅ FIX: Gunakan WIB offset lokal
    const WIB_OFFSET = 7 * 60 * 60 * 1000;
    const wibDate = new Date(new Date(date).getTime() + WIB_OFFSET);
    const day = wibDate.getUTCDate().toString().padStart(2, '0');
    const month = (wibDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = wibDate.getUTCFullYear().toString();
    return `INV-${day}${month}${year}`;
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const goToPreviousDate = () => {
    const newDate = new Date(selectedDate);
    if (reportType === 'harian') newDate.setDate(newDate.getDate() - 1);
    else if (reportType === 'mingguan') newDate.setDate(newDate.getDate() - 7);
    else if (reportType === 'bulanan') newDate.setMonth(newDate.getMonth() - 1);
    else if (reportType === 'tahunan') newDate.setFullYear(newDate.getFullYear() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDate = () => {
    const newDate = new Date(selectedDate);
    const today = new Date();
    if (reportType === 'harian') newDate.setDate(newDate.getDate() + 1);
    else if (reportType === 'mingguan') newDate.setDate(newDate.getDate() + 7);
    else if (reportType === 'bulanan') newDate.setMonth(newDate.getMonth() + 1);
    else if (reportType === 'tahunan') newDate.setFullYear(newDate.getFullYear() + 1);
    if (newDate <= today) setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(new Date());

  const getDateRangeText = () => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (reportType === 'harian') {
      return selectedDate.toLocaleDateString('id-ID', options);
    } else if (reportType === 'mingguan') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const startStr = weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const endStr = weekEnd.toLocaleDateString('id-ID', options);
      return `${startStr} - ${endStr}`;
    } else if (reportType === 'bulanan') {
      return selectedDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
    } else if (reportType === 'tahunan') {
      return selectedDate.getFullYear().toString();
    }
    return '';
  };

  const getPaymentBadgeStyle = (paymentMethod) => {
    const method = paymentMethod?.toLowerCase() || '';
    if (method === 'cash') return styles.paymentCash;
    if (method === 'qris') return styles.paymentQris;
    if (method.includes('transfer') || method === 'card') return styles.paymentTransfer;
    return styles.paymentCash;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.pumpkin} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Transaksi</Text>
      </View>

      <ScrollView>
        {/* Filter Section */}
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Rentang waktu</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Tipe Laporan</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={reportType}
                  onValueChange={(itemValue) => setReportType(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Harian" value="harian" />
                  <Picker.Item label="Mingguan" value="mingguan" />
                  <Picker.Item label="Bulanan" value="bulanan" />
                  <Picker.Item label="Tahunan" value="tahunan" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Tanggal</Text>
              <View style={styles.dateNavigationContainer}>
                <TouchableOpacity onPress={goToPreviousDate} style={styles.dateNavButton}>
                  <Text style={styles.dateNavButtonText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateButtonExpanded}
                >
                  <Text style={styles.dateButtonText}>{getDateRangeText()}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goToNextDate} style={styles.dateNavButton}>
                  <Text style={styles.dateNavButtonText}>▶</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Hari Ini</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date(2024, 0, 1)}
                  // ✅ FIX: maximumDate diset ke hari ini, bukan hardcode 2025
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Jenis Pembayaran</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={paymentType}
                  onValueChange={(itemValue) => setPaymentType(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Semua Pembayaran" value="" />
                  <Picker.Item label="Cash" value="cash" />
                  <Picker.Item label="QRIS" value="qris" />
                  <Picker.Item label="Transfer" value="Transfer Bank" />
                  <Picker.Item label="Debit" value="debit" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Cari Transaksi</Text>
              <TextInput
                placeholder="Cari invoice, customer, produk..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                placeholderTextColor={COLORS.davysGray}
              />
            </View>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryHeaderTitle}>Ringkasan</Text>
            <TouchableOpacity style={styles.refreshIconButton} onPress={fetchTransactions}>
              <Ionicons name="refresh" size={20} color={COLORS.pumpkin} />
            </TouchableOpacity>
          </View>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Transaksi</Text>
              <Text style={styles.summaryValue}>{filteredTransactions?.length || 0}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Pendapatan</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(
                  Array.isArray(filteredTransactions)
                    ? filteredTransactions.reduce((sum, t) => sum + (t.final_amount || 0), 0)
                    : 0
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Laporan Table */}
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Laporan</Text>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.pumpkin} />
              <Text style={styles.loadingText}>Memuat data...</Text>
            </View>
          ) : !Array.isArray(filteredTransactions) || filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color={COLORS.davysGray} />
              <Text style={styles.emptyText}>Tidak ada data transaksi</Text>
              <Text style={styles.emptySubText}>
                untuk periode {reportType} yang dipilih
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.colNo]}>NO</Text>
                  <Text style={[styles.tableHeaderCell, styles.colInvoice]}>No pesanan</Text>
                  <Text style={[styles.tableHeaderCell, styles.colDate]}>Tanggal pesanan</Text>
                  <Text style={[styles.tableHeaderCell, styles.colProduct]}>Nama Produk</Text>
                  <Text style={[styles.tableHeaderCell, styles.colPrice]}>Harga</Text>
                  <Text style={[styles.tableHeaderCell, styles.colPayment]}>Jenis pembayaran</Text>
                </View>
                <ScrollView style={styles.tableBody}>
                  {filteredTransactions.map((transaction, index) => (
                    <View
                      key={transaction.id || index}
                      style={[
                        styles.tableRow,
                        index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                      ]}
                    >
                      <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
                      <Text style={[styles.tableCell, styles.colInvoice]}>
                        {formatInvoiceNumber(transaction.created_at)}
                      </Text>
                      <Text style={[styles.tableCell, styles.colDate]}>
                        {formatDate(transaction.created_at)}
                      </Text>
                      <View style={[styles.tableCell, styles.colProduct]}>
                        {transaction.items?.map((item, idx) => (
                          <Text key={idx} style={styles.productText}>
                            {item.product_name}
                            {item.size ? ` (${item.size})` : ''}
                            {item.color ? ` - ${item.color}` : ''}
                          </Text>
                        ))}
                      </View>
                      <Text style={[styles.tableCell, styles.colPrice, styles.priceText]}>
                        {formatCurrency(transaction.final_amount || 0)}
                      </Text>
                      <View style={[styles.tableCell, styles.colPayment]}>
                        <View
                          style={[styles.paymentBadge, getPaymentBadgeStyle(transaction.payment_method)]}
                        >
                          <Text style={styles.paymentBadgeText}>
                            {(transaction.payment_method || 'Cash').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.linen },
  header: {
    backgroundColor: COLORS.jet,
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  backButton: { marginRight: 15 },
  headerTitle: { color: COLORS.pumpkin, fontSize: 24, fontWeight: 'bold' },
  filterCard: {
    backgroundColor: COLORS.white, margin: 16, padding: 20,
    borderRadius: 12, elevation: 3,
  },
  filterTitle: { fontSize: 18, fontWeight: '600', color: COLORS.jet, marginBottom: 16 },
  filterRow: { gap: 12 },
  filterItem: { marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: '500', color: COLORS.jet, marginBottom: 8 },
  pickerContainer: {
    borderWidth: 2, borderColor: COLORS.davysGray,
    borderRadius: 8, backgroundColor: COLORS.white,
  },
  picker: { height: 48, color: COLORS.jet },
  dateButtonExpanded: {
    flex: 1, borderWidth: 2, borderColor: COLORS.davysGray,
    borderRadius: 8, padding: 14, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  dateButtonText: { color: COLORS.jet, fontSize: 14, fontWeight: '500' },
  dateNavigationContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateNavButton: {
    width: 50, height: 48, borderWidth: 2, borderColor: COLORS.davysGray,
    borderRadius: 8, backgroundColor: COLORS.pumpkin,
    alignItems: 'center', justifyContent: 'center',
  },
  dateNavButtonText: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  todayButton: {
    marginTop: 8, borderWidth: 2, borderColor: COLORS.pumpkin,
    borderRadius: 8, padding: 10, backgroundColor: COLORS.white, alignItems: 'center',
  },
  todayButtonText: { color: COLORS.pumpkin, fontSize: 13, fontWeight: '600' },
  searchInput: {
    borderWidth: 2, borderColor: COLORS.davysGray,
    borderRadius: 8, padding: 14, backgroundColor: COLORS.white,
    color: COLORS.jet, fontSize: 14,
  },
  summarySection: { marginBottom: 16 },
  summaryHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 12,
  },
  summaryHeaderTitle: { fontSize: 18, fontWeight: '600', color: COLORS.jet },
  refreshIconButton: { padding: 8 },
  summaryContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.white, padding: 20,
    borderRadius: 12, elevation: 3,
  },
  summaryLabel: { fontSize: 14, color: COLORS.davysGray, marginBottom: 8 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.pumpkin },
  reportCard: {
    backgroundColor: COLORS.white, margin: 16, marginTop: 0,
    borderRadius: 12, overflow: 'hidden', elevation: 3,
  },
  reportHeader: { backgroundColor: COLORS.jet, padding: 20 },
  reportTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.davysGray, fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 15, color: COLORS.davysGray, fontSize: 14, fontWeight: '500' },
  emptySubText: { marginTop: 5, color: COLORS.davysGray, fontSize: 12 },
  tableContainer: { padding: 15 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.davysGray,
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
    borderBottomWidth: 2, borderBottomColor: COLORS.jet,
  },
  tableHeaderCell: { padding: 12, color: COLORS.white, fontWeight: '600', fontSize: 13 },
  tableBody: { maxHeight: 400 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.davysGray },
  tableRowEven: { backgroundColor: COLORS.linen },
  tableRowOdd: { backgroundColor: COLORS.white },
  tableCell: { padding: 12, color: COLORS.jet, fontSize: 12 },
  colNo: { width: 50 },
  colInvoice: { width: 150 },
  colDate: { width: 200 },
  colProduct: { width: 250 },
  colPrice: { width: 130 },
  colPayment: { width: 150 },
  productText: { fontSize: 12, color: COLORS.jet, marginBottom: 4 },
  priceText: { color: COLORS.pumpkin, fontWeight: '600' },
  paymentBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' },
  paymentCash: { backgroundColor: COLORS.goldenGate },
  paymentQris: { backgroundColor: COLORS.pumpkin },
  paymentTransfer: { backgroundColor: COLORS.davysGray },
  paymentBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
});