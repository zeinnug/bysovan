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

  // Filter states
  const [filterData, setFilterData] = useState({
    date: '',
    payment_method: '',
    status: '',
  });

  // Load transactions on screen focus
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const loadTransactions = async () => {
    setLoading(true);
    const result = await getTransactions();
    setLoading(false);

    if (result.success) {
      setTransactions(result.data.transactions || result.data || []);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleFilter = async () => {
    if (!filterData.date && !filterData.payment_method && !filterData.status) {
      loadTransactions();
      return;
    }

    setLoading(true);
    const result = await filterTransactions(filterData);
    setLoading(false);

    if (result.success) {
      setTransactions(result.data.transactions || result.data || []);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const resetFilter = () => {
    setFilterData({
      date: '',
      payment_method: '',
      status: '',
    });
    loadTransactions();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransactionCard = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Kode pembayaran</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Produk:</Text>
          <Text style={styles.infoValue}>
            {item.product_name || item.products || '-'}
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
          <Text style={styles.infoValue}>
            {formatCurrency(item.total || item.price || 0)}
          </Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tanggal:</Text>
          <Text style={styles.infoValue}>
            {formatDate(item.created_at || item.date)}
          </Text>
        </View>
      </View>
    </View>
  );

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
              <Ionicons name="close" size={28} color={COLORS.pumpkin} />
            </View>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Kembali ke Dashboard</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.headerTitle}>@SEPATUBYSOVAN</Text>
          <Text style={styles.headerSubtitle}>Point Of Sale</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('NewTransaction')}
            >
              <Text style={styles.actionButtonText}>Transaksi Baru</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SalesReport')}
            >
              <Text style={styles.actionButtonText}>Laporan penjualan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Filter Transaksi</Text>
          
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
                placeholder="Cash, Card, Transfer"
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
                placeholder="Completed, Pending"
                placeholderTextColor={COLORS.davysGray}
              />
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetFilter}
          >
            <Ionicons name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.resetButtonText}>Reset Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Cards */}
        {loading && transactions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.pumpkin} />
            <Text style={styles.loadingText}>Memuat transaksi...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.davysGray} />
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            <FlatList
              data={transactions}
              renderItem={renderTransactionCard}
              keyExtractor={(item, index) =>
                item.id?.toString() || item.transaction_id?.toString() || index.toString()
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
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    backgroundColor: COLORS.pumpkin,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
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
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.pumpkin,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 20,
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
  },
  resetButton: {
    backgroundColor: COLORS.goldenGate,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    gap: 5,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.davysGray,
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
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.davysGray,
  },
});