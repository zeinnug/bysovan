import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getTransactions,
  createTransaction,
  filterTransactions,
} from '../keduitan/transactions';

const { width } = Dimensions.get('window');

// Color Palette
const COLORS = {
  jet: '#292929',
  davysGray: '#585757',
  linen: '#F5ECE4',
  pumpkin: '#FC6A0A',
  goldenGate: '#E74504',
  white: '#FFFFFF',
};

export default function TransactionScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function untuk format tanggal ke YYYY-MM-DD
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter states - default tanggal hari ini
  const [filterData, setFilterData] = useState({
    date: formatDateToYYYYMMDD(new Date()),
    payment_method: '',
    status: '',
  });

  // Load transactions on screen focus
  useFocusEffect(
    useCallback(() => {
      loadTransactionsWithFilter();
    }, [])
  );

  const loadTransactionsWithFilter = async () => {
    try {
      setLoading(true);
      
      console.log('Filter data:', filterData);
      
      // Selalu gunakan filter dengan tanggal hari ini
      const result = await filterTransactions({
        date: filterData.date,
        payment_method: filterData.payment_method || undefined,
        status: filterData.status || undefined,
      });
      
      console.log('Filter result:', result);
      
      if (result.success) {
        // Pastikan data adalah array
        let transactionData = [];
        
        if (Array.isArray(result.data)) {
          transactionData = result.data;
        } else if (result.data && Array.isArray(result.data.transactions)) {
          transactionData = result.data.transactions;
        } else if (result.data && typeof result.data === 'object') {
          transactionData = Object.values(result.data).filter(item => 
            item && typeof item === 'object' && (item.id || item.transaction_id)
          );
        }
        
        console.log('Transaction count:', transactionData.length);
        setTransactions(transactionData);
      } else {
        console.error('Error from API:', result.error);
        setTransactions([]);
        Alert.alert('Error', result.error || 'Gagal memuat transaksi');
      }
    } catch (error) {
      console.error('Exception in loadTransactionsWithFilter:', error);
      setTransactions([]);
      Alert.alert('Error', 'Terjadi kesalahan saat memuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactionsWithFilter();
    setRefreshing(false);
  };

  const handleFilter = async () => {
    await loadTransactionsWithFilter();
  };

  const resetFilter = () => {
    setFilterData({
      date: formatDateToYYYYMMDD(new Date()),
      payment_method: '',
      status: '',
    });
    setTimeout(() => {
      loadTransactionsWithFilter();
    }, 100);
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
      }).format(amount || 0);
    } catch (error) {
      return `Rp ${(amount || 0).toLocaleString('id-ID')}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  // Hitung total dengan aman
  const calculateTotal = () => {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return 0;
    }
    
    return transactions.reduce((sum, t) => {
      const amount = t.final_amount || t.total || t.price || 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);
  };

  const renderTransactionCard = ({ item }) => {
    if (!item) return null;
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {item.invoice_number || 'Kode pembayaran'}
          </Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                item.payment_status === 'paid'
                  ? { backgroundColor: '#10B981' }
                  : { backgroundColor: COLORS.davysGray },
              ]}
            />
            <Text style={styles.statusText}>
              {item.payment_status === 'paid' ? 'Lunas' : 'Pending'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer:</Text>
            <Text style={styles.infoValue}>
              {item.customer_name || '-'}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Produk:</Text>
            <Text style={styles.infoValue}>
              {item.items && Array.isArray(item.items) && item.items.length > 0
                ? `${item.items.length} item${item.items.length > 1 ? 's' : ''}`
                : item.product_name || item.products || '-'}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Metode:</Text>
            <Text style={styles.infoValue}>
              {item.payment_method || 'Cash'}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total:</Text>
            <Text style={[styles.infoValue, styles.totalAmount]}>
              {formatCurrency(item.final_amount || item.total || item.price || 0)}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waktu:</Text>
            <Text style={styles.infoValue}>
              {formatDate(item.created_at || item.date)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.pumpkin]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <Ionicons name="receipt-outline" size={28} color={COLORS.white} />
            </View>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
              <Text style={styles.backButtonText}>Kembali</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.headerTitle}>@SEPATUBYSOVAN</Text>
          <Text style={styles.headerSubtitle}>Transaksi Hari Ini</Text>
          <Text style={styles.headerDate}>
            {formatDisplayDate(filterData.date)}
          </Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('NewTransaction')}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Transaksi Baru</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SalesReport')}
            >
              <Ionicons name="stats-chart-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Laporan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.sectionTitle}>Filter Transaksi</Text>
            <Text style={styles.filterInfo}>
              Menampilkan transaksi: {formatDisplayDate(filterData.date)}
            </Text>
          </View>
          
          <View style={styles.filterGrid}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Tanggal</Text>
              <TextInput
                style={styles.filterInput}
                value={filterData.date}
                onChangeText={(text) =>
                  setFilterData({ ...filterData, date: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>
            
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Metode Pembayaran</Text>
              <TextInput
                style={styles.filterInput}
                value={filterData.payment_method}
                onChangeText={(text) =>
                  setFilterData({ ...filterData, payment_method: text })
                }
                placeholder="cash, qris, Transfer Bank"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>
            
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status</Text>
              <TextInput
                style={styles.filterInput}
                value={filterData.status}
                onChangeText={(text) =>
                  setFilterData({ ...filterData, status: text })
                }
                placeholder="paid, unpaid"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>
          </View>
          
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleFilter}
            >
              <Ionicons name="filter" size={18} color={COLORS.white} />
              <Text style={styles.applyButtonText}>Terapkan Filter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetFilter}
            >
              <Ionicons name="refresh" size={18} color={COLORS.white} />
              <Text style={styles.resetButtonText}>Reset ke Hari Ini</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.pumpkin} />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Total Transaksi</Text>
              <Text style={styles.summaryValue}>
                {Array.isArray(transactions) ? transactions.length : 0}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Ionicons name="cash-outline" size={24} color={COLORS.pumpkin} />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Total Pendapatan</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction Cards */}
        {loading && (!Array.isArray(transactions) || transactions.length === 0) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.pumpkin} />
            <Text style={styles.loadingText}>Memuat transaksi...</Text>
          </View>
        ) : !Array.isArray(transactions) || transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.davysGray} />
            <Text style={styles.emptyText}>Belum ada transaksi hari ini</Text>
            <Text style={styles.emptySubtext}>
              Transaksi yang dibuat hari ini akan muncul di sini
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            <Text style={styles.cardsTitle}>
              Daftar Transaksi ({transactions.length})
            </Text>
            <FlatList
              data={transactions}
              renderItem={renderTransactionCard}
              keyExtractor={(item, index) =>
                item?.id?.toString() || item?.transaction_id?.toString() || index.toString()
              }
              numColumns={width > 768 ? 3 : 1}
              key={width > 768 ? 'grid' : 'list'}
              scrollEnabled={false}
              columnWrapperStyle={width > 768 ? styles.cardRow : null}
            />
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.pumpkin,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pumpkin,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 18,
    color: COLORS.white,
    marginBottom: 5,
  },
  headerDate: {
    fontSize: 16,
    color: COLORS.pumpkin,
    fontWeight: '600',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pumpkin,
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: COLORS.jet,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  filterInfo: {
    fontSize: 14,
    color: COLORS.pumpkin,
    fontWeight: '500',
  },
  filterGrid: {
    gap: 15,
  },
  filterItem: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  filterInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.jet,
    borderWidth: 1,
    borderColor: COLORS.pumpkin + '30',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  applyButton: {
    flex: 1,
    backgroundColor: COLORS.pumpkin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: COLORS.goldenGate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.davysGray,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.jet,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.linen,
    marginHorizontal: 15,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.jet,
    marginBottom: 15,
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  transactionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flex: width > 768 ? 0.32 : 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.pumpkin,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.jet,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.linen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.jet,
  },
  cardBody: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.davysGray,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.jet,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  totalAmount: {
    color: COLORS.pumpkin,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.linen,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.davysGray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.jet,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.davysGray,
    textAlign: 'center',
  },
})