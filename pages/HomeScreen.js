import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Image,
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// ✅ FIX 1: Import filterTransactions untuk hitung transaksi hari ini secara akurat
import { filterTransactions } from '../data/services/transactionService';
import { translateErrorMessage } from '../keduitan/sold';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

// ─── Animated Number ─────────────────────────────────────────────────────────
const AnimatedNumber = memo(({ value, isCurrency = false }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        current = value;
        clearInterval(timer);
      }
      setDisplayValue(Math.floor(current));
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <Text style={styles.statValue}>
      {isCurrency
        ? displayValue.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : displayValue.toLocaleString('id-ID')}
    </Text>
  );
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = memo(({ title, value, icon, delay = 0, isCurrency = false, accent = false }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.statCard,
        accent && styles.statCardAccent,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[styles.statIconBadge, accent && styles.statIconBadgeAccent]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{title}</Text>
      {isCurrency ? (
        <AnimatedNumber value={value} isCurrency={true} />
      ) : (
        <AnimatedNumber value={value} />
      )}
    </Animated.View>
  );
});

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const SimpleBarChart = memo(({ data, labels, title, subtitle }) => {
  const maxValue = Math.max(...data, 1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.stagger(80, barAnims.map(anim =>
      Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: false })
    )).start();
  }, []);

  return (
    <Animated.View style={[styles.chartCard, { opacity: fadeAnim }]}>
      <View style={styles.chartCardHeader}>
        <View style={styles.chartTitleDot} />
        <View>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
        </View>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyState}>
          <Octicons name="inbox" size={36} color="#585757" />
          <Text style={styles.emptyText}>Belum ada data untuk ditampilkan</Text>
        </View>
      ) : (
        <View style={styles.barChart}>
          {data.map((value, index) => {
            const heightPercentage = (value / maxValue) * 100;
            const isHighest = value === Math.max(...data);
            return (
              <View key={index} style={styles.barWrapper}>
                <Text style={[styles.barValue, isHighest && styles.barValueHighlight]}>{value}</Text>
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: barAnims[index]
                          ? barAnims[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', `${heightPercentage}%`],
                            })
                          : `${heightPercentage}%`,
                        backgroundColor: isHighest ? '#FC6A0A' : '#585757',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {labels[index]?.length > 3 ? labels[index].substring(0, 3) : labels[index]}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
});

// ─── Modern Pie Chart ─────────────────────────────────────────────────────────
const ModernPieChart = memo(({ data, title, subtitle }) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const total = (Array.isArray(data) ? data : []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const colors = ['#FC6A0A', '#E74504', '#585757', '#FFB366', '#D63A00'];

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value }) => {
      setAnimationProgress(value);
    });

    return () => animatedValue.removeListener(listener);
  }, [data]);

  const renderAnimatedPieChart = () => {
    let cumulativeAngle = -Math.PI / 2;
    const centerX = 100;
    const centerY = 100;
    const radius = 72;
    const innerRadius = 44;

    return (Array.isArray(data) ? data : []).map((item, index) => {
      const quantity = item.quantity || 0;
      const percentage = total > 0 ? (quantity / total) : 0;
      const fullAngle = percentage * 2 * Math.PI;
      const animatedAngle = fullAngle * animationProgress;

      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + animatedAngle;

      const outerStartX = centerX + radius * Math.cos(startAngle);
      const outerStartY = centerY + radius * Math.sin(startAngle);
      const outerEndX = centerX + radius * Math.cos(endAngle);
      const outerEndY = centerY + radius * Math.sin(endAngle);

      const innerStartX = centerX + innerRadius * Math.cos(startAngle);
      const innerStartY = centerY + innerRadius * Math.sin(startAngle);
      const innerEndX = centerX + innerRadius * Math.cos(endAngle);
      const innerEndY = centerY + innerRadius * Math.sin(endAngle);

      const largeArcFlag = percentage > 0.5 ? 1 : 0;

      const pathData = [
        'M', outerStartX, outerStartY,
        'A', radius, radius, 0, largeArcFlag, 1, outerEndX, outerEndY,
        'L', innerEndX, innerEndY,
        'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerStartX, innerStartY,
        'Z'
      ].join(' ');

      cumulativeAngle += fullAngle;

      return (
        <Path
          key={index}
          d={pathData}
          fill={colors[index % colors.length]}
          stroke="#1C1C1C"
          strokeWidth={2}
          opacity={selectedSegment === null || selectedSegment === index ? 1 : 0.35}
        />
      );
    });
  };

  return (
    <View style={styles.modernChartCard}>
      <View style={styles.chartCardHeader}>
        <View style={styles.chartTitleDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.periodBadge}>
          <Text style={styles.periodText}>Bulan Ini</Text>
        </View>
      </View>

      {(!Array.isArray(data) || data.length === 0) ? (
        <View style={styles.emptyState}>
          <Octicons name="graph" size={36} color="#585757" />
          <Text style={styles.emptyText}>Belum ada data produk terlaris</Text>
        </View>
      ) : (
        <View style={styles.pieLayout}>
          <View style={styles.pieChartWrapper}>
            <Svg width={200} height={200}>
              {renderAnimatedPieChart()}
            </Svg>
            <View style={styles.centerTextContainer}>
              <Text style={styles.centerValue}>{total}</Text>
              <Text style={styles.centerLabel}>Unit</Text>
            </View>
          </View>

          <View style={styles.legendList}>
            {(Array.isArray(data) ? data : []).map((item, index) => {
              const quantity = item.quantity || 0;
              const percentage = total > 0 ? ((quantity / total) * 100).toFixed(1) : '0.0';
              const isSelected = selectedSegment === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.legendRow, isSelected && styles.legendRowSelected]}
                  onPress={() => setSelectedSegment(isSelected ? null : index)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.legendSwatch, { backgroundColor: colors[index % colors.length] }]} />
                  <View style={styles.legendText}>
                    <Text style={styles.legendName} numberOfLines={1}>{item.name || '-'}</Text>
                    <Text style={styles.legendSub}>{quantity} unit</Text>
                  </View>
                  <Text style={styles.legendPct}>{percentage}%</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
});

// ─── Transaction Table ────────────────────────────────────────────────────────
const TransactionTable = memo(({ transactions, navigation }) => {
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString || '-';
    }
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    });
  };

  return (
    <View style={styles.txSection}>
      <View style={styles.txHeader}>
        <View style={styles.txTitleRow}>
          <View style={styles.chartTitleDot} />
          <Text style={styles.txTitle}>Transaksi Terbaru</Text>
        </View>
        <TouchableOpacity onPress={() => navigation?.navigate('Transaksi')} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>Lihat Semua</Text>
          <Octicons name="arrow-right" size={13} color="#FC6A0A" />
        </TouchableOpacity>
      </View>

      <View style={styles.txCard}>
        {/* Table Header */}
        <View style={styles.txTableHead}>
          <Text style={[styles.thText, { flex: 0.7 }]}>ID</Text>
          <Text style={[styles.thText, { flex: 2 }]}>Produk</Text>
          <Text style={[styles.thText, { flex: 0.6, textAlign: 'center' }]}>Qty</Text>
          <Text style={[styles.thText, { flex: 1.4, textAlign: 'right' }]}>Total</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.txEmpty}>
            <Octicons name="inbox" size={28} color="#585757" />
            <Text style={styles.txEmptyText}>Belum ada transaksi hari ini</Text>
          </View>
        ) : (
          transactions.map((item, index) => (
            <View
              key={item.id || index}
              style={[styles.txRow, index % 2 === 0 && styles.txRowEven]}
            >
              <Text style={[styles.tdId, { flex: 0.7 }]}>{item.id || '-'}</Text>
              <Text style={[styles.tdText, { flex: 2 }]} numberOfLines={1}>{item.produk || '-'}</Text>
              <View style={[{ flex: 0.6, alignItems: 'center' }]}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.jumlah || 0}</Text>
                </View>
              </View>
              <Text style={[styles.tdAmount, { flex: 1.4, textAlign: 'right' }]}>
                {formatCurrency(item.total || 0)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
});

// ─── Home Screen ──────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const [dashboardData, setDashboardData] = useState({
    totalProduk: 0,
    pengunjungHariIni: 0,
    transaksiHariIni: 0,
    produkTerlaris: [],
    grafikPengunjung: [],
    transaksiTerbaru: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevDataRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ✅ FIX 2: Helper format tanggal YYYY-MM-DD (sama persis dengan TransactionScreen)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ✅ FIX 3: Fungsi khusus untuk ambil jumlah transaksi hari ini yang akurat
  // Menggunakan endpoint /transactions?date=YYYY-MM-DD yang sama dengan TransactionScreen
  const fetchTodayTransactionCount = async () => {
    try {
      const result = await filterTransactions({
        date: getTodayString(),
      });

      if (result.success) {
        const transactionData =
          result.data?.data?.transactions && Array.isArray(result.data.data.transactions)
            ? result.data.data.transactions
            : Array.isArray(result.data) ? result.data
            : result.data?.transactions ? result.data.transactions
            : [];

        return transactionData.length;
      }
      return 0;
    } catch (error) {
      console.error('[HomeScreen] Error fetching today transaction count:', error);
      return 0;
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) { Alert.alert('Error', 'Token tidak ditemukan. Silakan login ulang.'); return; }

      // ✅ FIX 4: Jalankan dashboard API dan hitung transaksi hari ini secara paralel
      const [dashboardResponse, todayCount] = await Promise.all([
        fetch(`${API_BASE_URL}/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }),
        fetchTodayTransactionCount(),
      ]);

      const text = await dashboardResponse.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server tidak mengembalikan JSON valid'); }

      if (!dashboardResponse.ok) throw new Error(data.message || `Gagal mengambil data: ${dashboardResponse.status}`);

      const result = data.data || data;

      const defaultWeekLabels = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
      const weeklyRaw = result.grafik_pengunjung || result.grafikPengunjung || result.weekly_visitors || result.pengunjung_mingguan || result.visitors_weekly || [];

      let grafikPengunjung = [];
      if (Array.isArray(weeklyRaw) && weeklyRaw.length > 0) {
        if (typeof weeklyRaw[0] === 'number') {
          grafikPengunjung = weeklyRaw.slice(0, 7).map((v, i) => ({ hari: defaultWeekLabels[i] || `H${i+1}`, nilai: parseInt(v) || 0 }));
        } else {
          grafikPengunjung = weeklyRaw.map((item, i) => ({
            hari: item.hari || item.day || item.label || defaultWeekLabels[i] || `H${i+1}`,
            nilai: parseInt(item.nilai ?? item.value ?? item.count ?? item.visitors ?? 0) || 0,
          }));
        }
      }

      const parsedData = {
        totalProduk: result.total_produk || result.totalProduk || result.total_products || 0,
        pengunjungHariIni: result.pengunjung_hari_ini || result.pengunjungHariIni || 0,

        // ✅ FIX 5: Prioritaskan field dari API, fallback ke hitungan akurat dari filterTransactions
        transaksiHariIni: result.transaksi_hari_ini
          ?? result.transaksiHariIni
          ?? result.today_transactions_count
          ?? result.today_transaction_count
          ?? result.total_transactions_today
          ?? todayCount, // ← hitungan akurat dari /transactions?date=today

        produkTerlaris: (result.produk_terlaris || result.produkTerlaris || result.top_products || []).map(item => ({
          name: (item.produk && (item.produk.nama || item.produk.name)) || (item.product && item.product.name) || item.nama_produk || item.product_name || item.namaProduct || item.nama || item.name || '-',
          quantity: parseInt(item.quantity ?? item.jumlah ?? item.units ?? 0) || 0,
          percentageHint: item.persentase ?? item.percentage ?? item.percent ?? null,
        })),
        grafikPengunjung,
        transaksiTerbaru: (result.transaksi_terbaru || result.transaksiTerbaru || result.recent_transactions || []).slice(0, 5).map(t => ({
          id: t.id || '-',
          produk: t.produk || t.items?.map(i => i.product?.name).join(', ') || '-',
          jumlah: t.jumlah || t.items?.length || 1,
          total: parseFloat(t.total || t.final_amount || 0),
        })),
      };

      setDashboardData(parsedData);
      prevDataRef.current = parsedData;
      setIsLoading(false);
      setRefreshing(false);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      // Fallback: coba ambil minimal jumlah transaksi hari ini meski dashboard gagal
      const todayCount = await fetchTodayTransactionCount();

      const dummyData = {
        totalProduk: 245,
        pengunjungHariIni: 1234,
        transaksiHariIni: todayCount, // ✅ Tetap akurat meski dashboard error
        produkTerlaris: [
          { name: 'Nike Air Jordan 1', quantity: 45 },
          { name: 'Adidas Ultraboost', quantity: 30 },
          { name: 'Converse Chuck 70', quantity: 25 },
        ],
        grafikPengunjung: [
          { hari: 'SENIN', nilai: 45 }, { hari: 'SELASA', nilai: 85 },
          { hari: 'RABU', nilai: 75 }, { hari: 'KAMIS', nilai: 95 },
          { hari: 'JUMAT', nilai: 65 }, { hari: 'SABTU', nilai: 55 }, { hari: 'MINGGU', nilai: 80 },
        ],
        transaksiTerbaru: [
          { id: 'TRX001', produk: 'Nike Air Max', jumlah: 2, total: 2500000 },
          { id: 'TRX002', produk: 'Adidas Samba', jumlah: 1, total: 1200000 },
          { id: 'TRX003', produk: 'Puma Suede', jumlah: 3, total: 1800000 },
        ],
      };
      setDashboardData(dummyData);
      setIsLoading(false);
      setRefreshing(false);
      if (!isLoading) Alert.alert('Peringatan', 'Gagal memuat data dari server. Menampilkan data contoh.\n\n' + translateErrorMessage(error.message));
    }
  }, [isLoading]);

  useEffect(() => { fetchDashboardData(); }, []);

  useFocusEffect(useCallback(() => {
    console.log('Dashboard focused - refreshing data...');
    fetchDashboardData();
  }, [fetchDashboardData]));

  // ✅ FIX 6: Polling tiap 10 detik (lebih wajar dari 5 detik)
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FC6A0A" />
        <Text style={styles.loadingText}>Memuat Dashboard...</Text>
      </View>
    );
  }

  const dateStr = currentTime.toLocaleString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = currentTime.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Image source={require('../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.headerBrand}>SEPATU SOVAN</Text>
            <Text style={styles.headerTagline}>Sistem Manajemen Toko Sepatu</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Octicons name="bell" size={20} color="#F5ECE4" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC6A0A']} tintColor="#FC6A0A" />}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>Selamat Datang 👋</Text>
            <Text style={styles.heroDate}>{dateStr}</Text>
            <View style={styles.heroBadge}>
              <Octicons name="clock" size={11} color="#FC6A0A" />
              <Text style={styles.heroBadgeText}>{timeStr} WIB</Text>
            </View>
          </View>
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />
          <View style={styles.heroOrb3} />
        </View>

        {/* ── Section Label ── */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>LAPORAN HARIAN</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        {/* ── Stat Cards ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statRow}
        >
          <StatCard title="Total Stok" value={dashboardData.totalProduk} icon="👟" delay={0} />
          <StatCard title="Pengunjung" value={dashboardData.pengunjungHariIni} icon="👥" delay={150} accent />
          <StatCard title="Transaksi" value={dashboardData.transaksiHariIni} icon="💰" delay={300} />
        </ScrollView>

        {/* ── Charts ── */}
        <View style={styles.chartsSection}>
          <ModernPieChart
            data={dashboardData.produkTerlaris}
            title="Produk Terlaris"
            subtitle="Distribusi unit per produk"
          />
          <SimpleBarChart
            data={dashboardData.grafikPengunjung.map(d => d.nilai)}
            labels={dashboardData.grafikPengunjung.map(d => d.hari)}
            title="Pengunjung Mingguan"
            subtitle="Laporan 7 hari terakhir"
          />
        </View>

        {/* ── Transactions ── */}
        <TransactionTable transactions={dashboardData.transaksiTerbaru} navigation={navigation} />

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0E8DF' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0E8DF' },
  loadingText: { marginTop: 14, fontSize: 14, color: '#585757', fontWeight: '600', letterSpacing: 0.5 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(252,106,10,0.25)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 38, height: 38,
    borderRadius: 10,
    backgroundColor: '#F5ECE4',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  headerBrand: { fontSize: 15, fontWeight: '800', color: '#F5ECE4', letterSpacing: 1.5 },
  headerTagline: { fontSize: 11, color: '#FC6A0A', marginTop: 1, fontWeight: '500', letterSpacing: 0.5 },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FC6A0A', borderWidth: 1.5, borderColor: '#1C1C1C' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // Hero
  hero: {
    backgroundColor: '#292929',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    minHeight: 130,
  },
  heroContent: { zIndex: 2, position: 'relative' },
  heroGreeting: { fontSize: 13, color: '#FC6A0A', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  heroDate: { fontSize: 20, fontWeight: '800', color: '#F5ECE4', letterSpacing: 0.3, lineHeight: 26 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 12, alignSelf: 'flex-start',
    backgroundColor: 'rgba(252,106,10,0.15)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(252,106,10,0.3)',
  },
  heroBadgeText: { fontSize: 12, color: '#FC6A0A', fontWeight: '600' },
  heroOrb1: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#FC6A0A', opacity: 0.12, top: -30, right: 20, zIndex: 0 },
  heroOrb2: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#E74504', opacity: 0.2, bottom: -10, right: 80, zIndex: 0 },
  heroOrb3: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#FC6A0A', opacity: 0.1, top: 20, right: 130, zIndex: 0 },

  // Section Label
  sectionLabel: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 14, gap: 10 },
  sectionLabelText: { fontSize: 11, fontWeight: '800', color: '#585757', letterSpacing: 2 },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: 'rgba(88,87,87,0.2)' },

  // Stat Cards (horizontal scroll)
  statRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  statCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(88,87,87,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  statCardAccent: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(204, 178, 178, 0.4)',
  },
  statIconBadge: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: '#F5ECE4',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  statIconBadgeAccent: { backgroundColor: 'rgba(252,106,10,0.15)' },
  statIconText: { fontSize: 22 },
  statLabel: { fontSize: 11, color: '#585757', fontWeight: '600', letterSpacing: 0.3, marginBottom: 6 },
  statLabelAccent: { color: '#8a8a8a' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#292929', letterSpacing: -0.5 },

  // Charts
  chartsSection: { paddingHorizontal: 16, marginTop: 20, gap: 14 },
  chartCard: {
    backgroundColor: '#292929',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(252,106,10,0.15)',
  },
  modernChartCard: {
    backgroundColor: '#292929',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(252,106,10,0.15)',
  },
  chartCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  chartTitleDot: { width: 4, height: 28, borderRadius: 2, backgroundColor: '#FC6A0A', marginTop: 2 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#F5ECE4', letterSpacing: 0.3 },
  chartSubtitle: { fontSize: 12, color: '#585757', marginTop: 3 },

  periodBadge: {
    backgroundColor: 'rgba(252,106,10,0.15)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(252,106,10,0.3)',
  },
  periodText: { fontSize: 11, color: '#FC6A0A', fontWeight: '700' },

  // Pie Chart
  pieLayout: { alignItems: 'center', gap: 4 },
  pieChartWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  centerTextContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  centerValue: { fontSize: 28, fontWeight: '800', color: '#F5ECE4', letterSpacing: -0.5 },
  centerLabel: { fontSize: 11, color: '#585757', marginTop: 2, fontWeight: '500' },

  legendList: { width: '100%', gap: 8 },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(245,236,228,0.05)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(245,236,228,0.08)',
  },
  legendRowSelected: { backgroundColor: 'rgba(252,106,10,0.1)', borderColor: 'rgba(252,106,10,0.3)' },
  legendSwatch: { width: 28, height: 28, borderRadius: 7 },
  legendText: { flex: 1 },
  legendName: { fontSize: 13, color: '#F5ECE4', fontWeight: '600' },
  legendSub: { fontSize: 11, color: '#585757', marginTop: 2 },
  legendPct: { fontSize: 14, color: '#F5ECE4', fontWeight: '700' },

  // Bar Chart
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginTop: 4,
  },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '65%', height: 110, justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(88,87,87,0.2)' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 4 },
  barValue: { fontSize: 10, color: '#585757', marginBottom: 4, fontWeight: '600' },
  barValueHighlight: { color: '#FC6A0A' },
  barLabel: { fontSize: 9, color: '#585757', marginTop: 6, fontWeight: '500', letterSpacing: 0.3 },

  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: 13, color: '#585757', textAlign: 'center' },

  // Transactions
  txSection: { paddingHorizontal: 16, marginTop: 20 },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  txTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txTitle: { fontSize: 16, fontWeight: '700', color: '#292929', letterSpacing: 0.3 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 13, color: '#FC6A0A', fontWeight: '600' },

  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(88,87,87,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  txTableHead: {
    flexDirection: 'row',
    backgroundColor: '#292929',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  thText: { fontSize: 10, fontWeight: '800', color: '#F5ECE4', letterSpacing: 1, textTransform: 'uppercase' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DF',
  },
  txRowEven: { backgroundColor: '#FDFAF7' },
  tdId: { fontSize: 12, color: '#585757', fontWeight: '500' },
  tdText: { fontSize: 13, color: '#292929', fontWeight: '500' },
  tdAmount: { fontSize: 13, color: '#292929', fontWeight: '700' },

  qtyBadge: {
    backgroundColor: 'rgba(252,106,10,0.12)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(252,106,10,0.25)',
  },
  qtyText: { fontSize: 12, color: '#FC6A0A', fontWeight: '700' },

  txEmpty: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  txEmptyText: { fontSize: 13, color: '#585757' },
});

export default HomeScreen;