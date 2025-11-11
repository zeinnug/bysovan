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
import Svg, { Path } from 'react-native-svg';
import { Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

// Animated Number Component
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

// Stat Card Component
const StatCard = memo(({ title, value, icon, delay = 0, isCurrency = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim }]}>
      <View style={styles.statIconContainer}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{title}</Text>
        {isCurrency ? (
          <AnimatedNumber value={value} isCurrency={true} />
        ) : (
          <AnimatedNumber value={value} />
        )}
      </View>
    </Animated.View>
  );
});

// Bar Chart Component
const SimpleBarChart = memo(({ data, labels, title, subtitle }) => {
  const maxValue = Math.max(...data, 1);
  const colors = ['#FC6A0A', '#E74504', '#FC6A0A', '#E74504', '#FC6A0A', '#E74504'];

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      
      {data.length === 0 ? (
        <View style={styles.emptyState}>
          <Octicons name="inbox" size={40} color="#585757" />
          <Text style={styles.emptyText}>Belum ada data untuk ditampilkan</Text>
        </View>
      ) : (
        <>
          <View style={styles.barChart}>
            {data.map((value, index) => {
              const heightPercentage = (value / maxValue) * 100;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barColumn}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: `${heightPercentage}%`,
                          backgroundColor: colors[index % colors.length]
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barValue}>{value}</Text>
                  <Text style={styles.barLabel}>
                    {labels[index]?.length > 6 ? labels[index].substring(0, 6) + '...' : labels[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
});

// Pie Chart Component
const SimplePieChart = memo(({ data, title, subtitle }) => {
  const total = data.reduce((sum, item) => sum + item.quantity, 0);
  const colors = ['#FC6A0A', '#E74504', '#585757'];

  const renderPieChart = () => {
    let cumulativeAngle = -Math.PI / 2; // Start from top (-90 degrees)
    const centerX = 80;
    const centerY = 80;
    const radius = 60;

    return data.map((item, index) => {
      const percentage = total > 0 ? (item.quantity / total) : 0;
      const angle = percentage * 2 * Math.PI;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      
      // Calculate arc points
      const startX = centerX + radius * Math.cos(startAngle);
      const startY = centerY + radius * Math.sin(startAngle);
      const endX = centerX + radius * Math.cos(endAngle);
      const endY = centerY + radius * Math.sin(endAngle);
      
      // Determine which arc to draw based on the percentage
      const largeArcFlag = percentage > 0.5 ? 1 : 0;
      
      // Create the SVG path
      const pathData = [
        'M', centerX, centerY, // Move to center
        'L', startX, startY,   // Line to start of arc
        'A', radius, radius,   // Arc command
        0, largeArcFlag, 1,    // Arc parameters
        endX, endY,           // End point of arc
        'Z'                    // Close path
      ].join(' ');
      
      cumulativeAngle += angle;
      
      return (
        <Path
          key={index}
          d={pathData}
          fill={colors[index % colors.length]}
          stroke="#292929"
          strokeWidth={1}
        />
      );
    });
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      
      {data.length === 0 ? (
        <View style={styles.emptyState}>
          <Octicons name="inbox" size={40} color="#585757" />
          <Text style={styles.emptyText}>Belum ada data produk terlaris</Text>
        </View>
      ) : (
        <View style={styles.pieChartContainer}>
          <Svg width={160} height={160}>
            {renderPieChart()}
          </Svg>
          <View style={styles.legendContainer}>
            {data.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors[index % colors.length] }]} />
                <View style={styles.legendTextContainer}>
                  <Text style={styles.legendText} numberOfLines={1}>
                    {item.name || '-'}
                  </Text>
                  <Text style={styles.legendSubtext}>
                    {`${item.quantity || 0} unit`}{item.percentageHint != null ? ` • API ${parseFloat(item.percentageHint)}%` : ''}
                  </Text>
                </View>
                <Text style={styles.legendPercentage}>
                  {total > 0 ? ((item.quantity / total) * 100).toFixed(1) : 0}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

// Modern Animated Pie Chart Component (ADDED)
const ModernPieChart = memo(({ data, title, subtitle }) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const total = (Array.isArray(data) ? data : []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const colors = ['#FC6A0A', '#FF8534', '#E74504', '#FFB366', '#D63A00'];

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
    const radius = 70;
    const innerRadius = 40;

    return (Array.isArray(data) ? data : []).map((item, index) => {
      const quantity = item.quantity || 0;
      const percentage = total > 0 ? (quantity / total) : 0;
      const fullAngle = percentage * 2 * Math.PI;
      const animatedAngle = fullAngle * animationProgress;

      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + animatedAngle;

      // Outer arc points
      const outerStartX = centerX + radius * Math.cos(startAngle);
      const outerStartY = centerY + radius * Math.sin(startAngle);
      const outerEndX = centerX + radius * Math.cos(endAngle);
      const outerEndY = centerY + radius * Math.sin(endAngle);

      // Inner arc points
      const innerStartX = centerX + innerRadius * Math.cos(startAngle);
      const innerStartY = centerY + innerRadius * Math.sin(startAngle);
      const innerEndX = centerX + innerRadius * Math.cos(endAngle);
      const innerEndY = centerY + innerRadius * Math.sin(endAngle);

      const largeArcFlag = percentage > 0.5 ? 1 : 0;

      // Donut path
      const pathData = [
        'M', outerStartX, outerStartY,
        'A', radius, radius, 0, largeArcFlag, 1, outerEndX, outerEndY,
        'L', innerEndX, innerEndY,
        'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerStartX, innerStartY,
        'Z'
      ].join(' ');

      cumulativeAngle += fullAngle;

      const segmentColor = colors[index % colors.length];

      return (
        <Path
          key={index}
          d={pathData}
          fill={segmentColor}
          stroke="#292929"
          strokeWidth={1}
          opacity={selectedSegment === null || selectedSegment === index ? 1 : 0.45}
        />
      );
    });
  };

  return (
    <View style={styles.modernChartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.modernChartTitle}>{title}</Text>
          <Text style={styles.modernChartSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.periodBadge}>
          <Octicons name="calendar" size={14} color="#FC6A0A" />
          <Text style={styles.periodText}>Bulan Ini</Text>
        </View>
      </View>

      {(!Array.isArray(data) || data.length === 0) ? (
        <View style={styles.modernEmptyState}>
          <View style={styles.emptyIconContainer}>
            <Octicons name="graph" size={48} color="#585757" />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Data</Text>
          <Text style={styles.emptyDescription}>Data produk terlaris akan muncul di sini setelah ada transaksi bulan ini</Text>
        </View>
      ) : (
        <View style={styles.modernPieContainer}>
          <View style={styles.pieChartWrapper}>
            <Svg width={200} height={200}>
              {renderAnimatedPieChart()}
            </Svg>

            <View style={styles.centerTextContainer}>
              <Text style={styles.centerValue}>{total}</Text>
              <Text style={styles.centerLabel}>Total Unit</Text>
            </View>

            <Animated.View
              style={[
                styles.glowEffect,
                {
                  opacity: animatedValue.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0.25, 0],
                  }),
                },
              ]}
            />
          </View>

          <View style={styles.modernLegendContainer}>
            {(Array.isArray(data) ? data : []).map((item, index) => {
              const quantity = item.quantity || 0;
              const percentage = total > 0 ? ((quantity / total) * 100).toFixed(1) : '0.0';
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.modernLegendItem, selectedSegment === index && styles.selectedLegendItem]}
                  onPress={() => setSelectedSegment(selectedSegment === index ? null : index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.legendLeftSection}>
                    <View style={[styles.modernLegendColor, { backgroundColor: colors[index % colors.length] }]} />
                    <View style={styles.legendTextSection}>
                      <Text style={styles.modernLegendText} numberOfLines={1}>{item.name || '-'}</Text>
                      <Text style={styles.legendSubtext}>{`${quantity} unit • ${percentage}%`}</Text>
                    </View>
                  </View>
                  <Text style={styles.legendPercentageSmall}>{percentage}%</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
});

// Transaction Table Component
const TransactionTable = memo(({ transactions }) => {
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString || '-';
    }
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  return (
    <View style={styles.transactionSection}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionTitle}>Detail Transaksi</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllButton}>Lihat Semua</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>ID</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Produk</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyTableRow}>
            <Text style={styles.emptyTableText}>Belum ada transaksi hari ini</Text>
          </View>
        ) : (
          transactions.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.id || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                {item.produk || '-'}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                {item.jumlah || 0}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: '600' }]}>
                {formatCurrency(item.total || 0)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
});

const HomeScreen = () => {
  const [dashboardData, setDashboardData] = useState({
    totalProduk: 0,
    pengunjungHariIni: 0,
    transaksiHariIni: 0,
    produkTerlaris: [],
    grafikPengunjung: [],
    transaksiTerbaru: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevDataRef = useRef(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'Token tidak ditemukan. Silakan login ulang.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Server tidak mengembalikan JSON valid');
      }

      if (!response.ok) {
        throw new Error(data.message || `Gagal mengambil data: ${response.status}`);
      }

      const result = data.data || data;

      // Get today's date for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter transactions for today
      const todaysTransactions = (result.transaksi_terbaru || result.transaksiTerbaru || result.recent_transactions || [])
        .filter(t => {
          const transactionDate = new Date(t.created_at || t.createdAt);
          transactionDate.setHours(0, 0, 0, 0);
          return transactionDate.getTime() === today.getTime();
        });

      // Normalize weekly visitors data
      const defaultWeekLabels = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
      const weeklyRaw = result.grafik_pengunjung 
        || result.grafikPengunjung 
        || result.weekly_visitors 
        || result.pengunjung_mingguan 
        || result.visitors_weekly 
        || [];
      
      let grafikPengunjung = [];
      if (Array.isArray(weeklyRaw) && weeklyRaw.length > 0) {
        if (typeof weeklyRaw[0] === 'number') {
          grafikPengunjung = weeklyRaw.slice(0, 7).map((v, i) => ({
            hari: defaultWeekLabels[i] || `H${i + 1}`,
            nilai: parseInt(v) || 0
          }));
        } else {
          grafikPengunjung = weeklyRaw.map((item, i) => ({
            hari: item.hari || item.day || item.label || defaultWeekLabels[i] || `H${i + 1}`,
            nilai: parseInt(item.nilai ?? item.value ?? item.count ?? item.visitors ?? 0) || 0
          }));
        }
      }

      // Parse data dengan format yang fleksibel
      const parsedData = {
        totalProduk: result.total_produk || result.totalProduk || result.total_products || 0,
        // Use only explicit visitor fields; do NOT fallback to total transactions
        pengunjungHariIni: result.pengunjung_hari_ini || result.pengunjungHariIni || 0,
        transaksiHariIni: todaysTransactions.length,
        
        produkTerlaris: (result.produk_terlaris || result.produkTerlaris || result.top_products || []).map(item => ({
          name: (item.produk && (item.produk.nama || item.produk.name))
            || (item.product && item.product.name)
            || item.nama_produk
            || item.product_name
            || item.namaProduct
            || item.nama
            || item.name
            || '-',
          // Use only unit-based fields for quantity; do not fallback to percentage
          quantity: parseInt(item.quantity ?? item.jumlah ?? item.units ?? 0) || 0,
          // Preserve percentage if API provides it, for legend hint
          percentageHint: item.persentase ?? item.percentage ?? item.percent ?? null
        })),
        
        grafikPengunjung,
        
        transaksiTerbaru: (result.transaksi_terbaru || result.transaksiTerbaru || result.recent_transactions || []).slice(0, 5).map(t => ({
          id: t.id || '-',
          produk: t.produk || t.items?.map(i => i.product?.name).join(', ') || '-',
          jumlah: t.jumlah || t.items?.length || 1,
          total: parseFloat(t.total || t.final_amount || 0)
        }))
      };

      // Cek apakah ada perubahan data
      const hasChanged = JSON.stringify(prevDataRef.current) !== JSON.stringify(parsedData);
      
      // Always update to get fresh transaction count
      setDashboardData(parsedData);
      prevDataRef.current = parsedData;

      setIsLoading(false);
      setRefreshing(false);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Fallback ke dummy data
      const dummyData = {
        totalProduk: 245,
        pengunjungHariIni: 1234,
        totalStok: 8567,
        produkTerlaris: [
          { name: 'Nike Air Jordan 1', quantity: 45 },
          { name: 'Adidas Ultraboost', quantity: 30 },
          { name: 'Converse Chuck 70', quantity: 25 },
        ],
        grafikPengunjung: [
          { hari: 'SENIN', nilai: 45 },
          { hari: 'SELASA', nilai: 85 },
          { hari: 'RABU', nilai: 75 },
          { hari: 'KAMIS', nilai: 95 },
          { hari: 'JUMAT', nilai: 65 },
          { hari: 'SABTU', nilai: 55 },
          { hari: 'MINGGU', nilai: 80 },
        ],
        transaksiTerbaru: [
          { id: 'TRX001', produk: 'Nike Air Max', jumlah: 2, total: 2500000 },
          { id: 'TRX002', produk: 'Adidas Samba', jumlah: 1, total: 1200000 },
          { id: 'TRX003', produk: 'Puma Suede', jumlah: 3, total: 1800000 },
        ]
      };

      setDashboardData(dummyData);
      setIsLoading(false);
      setRefreshing(false);

      if (!isLoading) {
        Alert.alert(
          'Peringatan',
          'Gagal memuat data dari server. Menampilkan data contoh.\n\n' + error.message
        );
      }
    }
  }, [isLoading]);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FC6A0A" />
        <Text style={styles.loadingText}>Memuat Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>DASHBOARD</Text>
            <Text style={styles.headerSubtitle}>@SEPATUBYSOVAN</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Octicons name="bell" size={24} color="#F5ECE4" />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FC6A0A']}
            tintColor="#FC6A0A"
          />
        }
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroOverlay}>
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </View>
        </View>

        {/* Laporan Harian Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LAPORAN HARIAN</Text>
          <Text style={styles.sectionSubtitle}>
            {currentTime.toLocaleString('id-ID', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard 
            title="Total Produk" 
            value={dashboardData.totalProduk} 
            icon="👟" 
            delay={0} 
          />
          <StatCard 
            title="Pengunjung Hari ini" 
            value={dashboardData.pengunjungHariIni} 
            icon="👥" 
            delay={200} 
          />
          <StatCard 
            title="Transaksi Hari Ini" 
            value={dashboardData.transaksiHariIni || 0} 
            icon="💰" 
            delay={400}
          />
        </View>

        {/* Charts */}
        <View style={styles.mainGrid}>
          <ModernPieChart 
            data={dashboardData.produkTerlaris}
            title="Produk Terlaris"
            subtitle="Distribusi unit per produk"
          />
          
          <SimpleBarChart
            data={dashboardData.grafikPengunjung.map(d => d.nilai)}
            labels={dashboardData.grafikPengunjung.map(d => d.hari)}
            title="Grafik Pengunjung Mingguan"
            subtitle="Laporan pengunjung selama seminggu"
          />
        </View>

        {/* Transactions */}
        <TransactionTable transactions={dashboardData.transaksiTerbaru} />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5ECE4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5ECE4',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#585757',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#292929',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5ECE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5ECE4',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FC6A0A',
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FC6A0A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroBanner: {
    height: 180,
    backgroundColor: '#292929',
    position: 'relative',
    overflow: 'hidden',
  },
  heroOverlay: {
    flex: 1,
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FC6A0A',
    opacity: 0.2,
    top: -20,
    left: 30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E74504',
    opacity: 0.3,
    bottom: 20,
    right: 40,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#292929',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#585757',
    marginTop: 4,
  },
  statsContainer: {
    paddingHorizontal: 20,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#585757',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5ECE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statIconText: {
    fontSize: 28,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#585757',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#292929',
  },
  mainGrid: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  chartCard: {
    backgroundColor: '#292929',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5ECE4',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#585757',
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barColumn: {
    width: '80%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 20,
  },
  barValue: {
    fontSize: 11,
    color: '#F5ECE4',
    marginTop: 4,
    fontWeight: '600',
  },
  barLabel: {
    fontSize: 9,
    color: '#585757',
    marginTop: 4,
    textAlign: 'center',
  },
  // Modern Pie Chart Styles
  modernChartCard: {
    backgroundColor: '#292929',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(252, 106, 10, 0.2)',
    shadowColor: '#FC6A0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modernChartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5ECE4',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  modernChartSubtitle: {
    fontSize: 13,
    color: '#585757',
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252, 106, 10, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(252, 106, 10, 0.3)',
  },
  periodText: {
    fontSize: 11,
    color: '#FC6A0A',
    fontWeight: '600',
    marginLeft: 6,
  },
  modernPieContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  pieChartWrapper: {
    position: 'relative',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5ECE4',
  },
  centerLabel: {
    fontSize: 12,
    color: '#585757',
    marginTop: 2,
  },
  glowEffect: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FC6A0A',
  },
  modernLegendContainer: {
    width: '100%',
  },
  modernLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 236, 228, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 236, 228, 0.1)',
  },
  selectedLegendItem: {
    backgroundColor: 'rgba(252, 106, 10, 0.1)',
    borderColor: 'rgba(252, 106, 10, 0.3)',
  },
  legendLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  modernLegendColor: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  legendTextSection: {
    flex: 1,
  },
  legendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernLegendText: {
    fontSize: 14,
    color: '#F5ECE4',
    fontWeight: '600',
    flex: 1,
  },
  topBadge: {
    backgroundColor: '#FC6A0A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  topBadgeText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: 'bold',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernLegendSubtext: {
    fontSize: 12,
    color: '#585757',
    marginLeft: 4,
  },
  percentageSection: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  modernLegendPercentage: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  legendPercentageSmall: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  legendPercentage: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modernEmptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(88, 87, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5ECE4',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#585757',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#585757',
  },
  transactionSection: {
    marginTop: 8,
    paddingHorizontal: 20,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#292929',
  },
  viewAllButton: {
    fontSize: 14,
    color: '#FC6A0A',
    fontWeight: '600',
  },
  transactionTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#585757',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#292929',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F5ECE4',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE4',
  },
  tableCell: {
    fontSize: 13,
    color: '#292929',
  },
  emptyTableRow: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 14,
    color: '#585757',
  },
});

export default HomeScreen;