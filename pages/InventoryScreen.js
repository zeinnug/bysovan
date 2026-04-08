// BYSOVAN/pages/InventoryScreen.js - OPTIMIZED
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

// Import Components
import ProductTable from '../components/ProductTable';
import AddProductModal from '../components/AddProductModal';
import HistoryModal from '../components/HistoryModal';
import QRCodeModal from '../components/QRCodeModal';
import EditProductModal from '../components/EditProductModal';

// Import API Services
import { getProducts, createProduct, deleteProduct } from '../data/services';

// Import History Manager
import { addHistory, getHistory } from '../utils/historyManager';

// Constants
const LOW_STOCK_THRESHOLD = 5;
const INITIAL_INVENTORY_STATE = { stokMenipis: 0, totalProduk: 0, jumlahUnitPerProduk: 0, products: [] };

const InventoryScreen = ({ navigation }) => {
  // State Management
  const [inventoryData, setInventoryData] = useState(INITIAL_INVENTORY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search Filter - Optimized dengan useMemo
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return inventoryData.products;
    
    const query = searchQuery.toLowerCase();
    return inventoryData.products.filter(product => 
      product.nama.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query) ||
      product.kategori.toLowerCase().includes(query)
    );
  }, [searchQuery, inventoryData.products]);
  
  // Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Fetch Inventory Data
  const loadInventoryData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const result = await getProducts();
      
      // LOGIC BARU: Menyesuaikan dengan struktur API Log Anda
      // Struktur Log: { data: { brand_counts:..., low_stock_products: 1749, total_stock: 2114, products: [...] } }
      
      // Cek apakah data ada di result.data atau result.data.data (tergantung wrapper axios/backend)
      const dataSource = result.data?.data || result.data;

      if (result.success && dataSource?.products) {
        const mappedProducts = dataSource.products.map((p) => {
          // Generate barcode jika tidak ada
          let barcodeValue = '';
          if (p.units && p.units.length > 0 && p.units[0].unitCode) {
            barcodeValue = p.units[0].unitCode;
          } else if (p.barcode) {
            barcodeValue = p.barcode;
          } else if (p.id) {
            barcodeValue = `BYS${p.id}${Date.now().toString().slice(-6)}`;
          }
          
          return {
            id: p.id,
            nama: p.name || p.model || '-',
            merek: p.brand || '-',
            model: p.model || '-',
            ukuran: p.size || '-',
            warna: p.color || '-',
            hargaJual: parseFloat(p.sellingPrice) || parseFloat(p.selling_price) || 0,
            hargaDiskon: parseFloat(p.discountPrice) || parseFloat(p.discount_price) || 0,
            stok: parseInt(p.stock) || 0,
            barcode: barcodeValue,
            kategori: p.brand || '-',
          };
        });

        // === PERBAIKAN DATA STATISTIK BERDASARKAN LOGIKA BARU ===
        // Stok Menipis: Jumlah produk dengan stok < 5
        // Total Produk: Total produk/QR yang terdaftar di sistem
        // Jumlah Unit Per Produk: Total variant/unit types yang berbeda
        
        const LOW_STOCK_THRESHOLD = 5;
        const totalStokFallback = mappedProducts.reduce((sum, prod) => sum + (parseInt(prod.stok) || 0), 0);
        
        const apiTotalStok = dataSource.totalStock || dataSource.total_stock;
        const apiStokMenipis = dataSource.lowStockProducts || dataSource.low_stock_products;

        // Hitung stok menipis secara manual (produk dengan stok < 5)
        const stokMenipisFallback = mappedProducts.filter(prod => (parseInt(prod.stok) || 0) < LOW_STOCK_THRESHOLD).length;

        // Hitung total variant/unit types dari semua produk
        const totalUnitTypes = dataSource.products.reduce((sum, prod) => {
          if (prod.units && Array.isArray(prod.units)) {
            return sum + prod.units.length;
          }
          return sum + 1; // Jika tidak ada units, hitung 1 unit default
        }, 0);

        const transformedData = {
          stokMenipis: apiStokMenipis !== undefined ? apiStokMenipis : stokMenipisFallback, // Prioritas API, fallback hitung manual
          totalProduk: mappedProducts.length, // Total produk/QR yang terdaftar
          jumlahUnitPerProduk: totalUnitTypes, // Total variant/unit types yang berbeda
          products: mappedProducts,
        };

        setInventoryData(transformedData);

      } else {
        Alert.alert('Error', result.message || 'Gagal memuat data produk');
        setInventoryData(INITIAL_INVENTORY_STATE);
      }
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      Alert.alert('Error', error.message || 'Gagal memuat data produk');
      setInventoryData(INITIAL_INVENTORY_STATE);
    }
    
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  // ✅ Load History Data from AsyncStorage
  const loadHistoryData = async () => {
    try {
      const history = await getHistory();
      setHistoryData(history);
    } catch (error) {
      console.error('❌ Error loading history:', error);
      setHistoryData([]);
      Alert.alert('Error', 'Gagal memuat data riwayat.');
    }
  };

  // Initial Load
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Handlers - Optimized dengan useCallback
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInventoryData();
  }, [loadInventoryData]);
  
  const handleTambahProduk = useCallback(() => setShowAddProductModal(true), []);
  const handleRiwayat = useCallback(async () => {
    await loadHistoryData();
    setShowHistoryModal(true);
  }, []);
  const handleStockOpname = useCallback(() => navigation.navigate('StockOpname'), [navigation]);
  const handleShowQR = useCallback((product) => {
    if (!product?.barcode) {
      Alert.alert('Error', 'Data produk tidak valid atau tidak memiliki barcode');
      return;
    }
    setSelectedProduct(product);
    setShowQRModal(true);
  }, []);
  const handleCloseQR = useCallback(() => {
    setShowQRModal(false);
    setTimeout(() => setSelectedProduct(null), 300);
  }, []);
  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setTimeout(() => setEditingProduct(null), 300);
  }, []);

  const handleEditSuccess = useCallback(async () => {
    await loadInventoryData();
  }, [loadInventoryData]);

  const handleDeleteProduct = useCallback((productId) => {
    Alert.alert('Konfirmasi Hapus', 'Yakin hapus produk ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try {
          const result = await deleteProduct(productId);
          if (result.success) {
            Alert.alert('Berhasil', 'Produk dihapus');
            await loadInventoryData();
          } else {
            Alert.alert('Error', result.message || 'Gagal menghapus');
          }
        } catch (error) {
          Alert.alert('Error', error.message || 'Gagal menghapus');
        }
      }}
    ]);
  }, [loadInventoryData]);

  const handleCloseAddModal = useCallback(() => setShowAddProductModal(false), []);

  const handleSubmitProduct = async (productData) => {
    setIsSubmitting(true);
    try {
      const result = await createProduct(productData);
      if (result.success) {
        const newProduct = result.data;
        let generatedBarcode = '';
        if (newProduct.units?.[0]?.unitCode) generatedBarcode = newProduct.units[0].unitCode;
        else if (newProduct.id) generatedBarcode = `BYS${newProduct.id}${Date.now().toString().slice(-6)}`;

        const productForHistory = {
          brand: productData.brand, model: productData.model, color: productData.color,
          sizes: productData.sizes, sellingPrice: productData.sellingPrice,
          discountPrice: productData.discountPrice, barcode: generatedBarcode,
          description: productData.description,
        };

        await addHistory('create', productForHistory, 'Admin');
        await loadInventoryData();
        setShowAddProductModal(false);

        const productForQR = {
            id: newProduct.id,
            nama: newProduct.name || newProduct.model,
            merek: newProduct.brand, model: newProduct.model,
            ukuran: newProduct.size || '-', warna: newProduct.color || '-',
            hargaJual: newProduct.sellingPrice, hargaDiskon: newProduct.discountPrice,
            stok: newProduct.stock || 0, barcode: generatedBarcode, kategori: newProduct.brand,
        };

        Alert.alert('Berhasil!', `Produk ditambahkan!\nBarcode: ${generatedBarcode}`, [
          { text: 'Lihat QR', onPress: () => setTimeout(() => handleShowQR(productForQR), 300) },
          { text: 'OK', style: 'cancel' }
        ]);
        return { success: true, data: productForQR };
      } else {
        Alert.alert('Error', result.message);
        return { success: false };
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FC6A0A" />
        <Text style={styles.loadingText}>Memuat Inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Octicons name="arrow-left" size={24} color="#F5ECE4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>INVENTORY</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC6A0A']} tintColor="#FC6A0A" />
        }
      >
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>MANAGEMENT INVENTORY</Text>
        </View>

        {/* ================= MODIFIED INFO SECTION ================= */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>INVENTORY INFORMATION</Text>
          
          <View style={styles.infoCardsContainer}>
            {/* Card 1: Stok Menipis */}
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                 <Octicons name="alert" size={24} color="#FC6A0A" /> 
              </View>
              <View style={styles.cardContent}>
                  <Text style={styles.infoCardLabel}>STOK MENIPIS</Text>
                  <Text style={styles.infoCardValue}>{inventoryData.stokMenipis}</Text>
              </View>
            </View>

            {/* Card 2: Total Produk */}
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                 <Octicons name="arrow-right" size={24} color="#FC6A0A" />
              </View>
              <View style={styles.cardContent}>
                  <Text style={styles.infoCardLabel}>TOTAL PRODUK</Text>
                  <Text style={styles.infoCardValue}>{inventoryData.totalProduk}</Text>
              </View>
            </View>

            {/* Card 3: Jumlah Unit Per Produk */}
            <View style={styles.infoCard}>
               <View style={styles.iconContainer}>
                 <Octicons name="rows" size={24} color="#FC6A0A" />
              </View>
              <View style={styles.cardContent}>
                  <Text style={styles.infoCardLabel}>TOTAL UNIT</Text>
                  <Text style={styles.infoCardValue}>{inventoryData.jumlahUnitPerProduk}</Text>
              </View>
            </View>
          </View>
        </View>
        {/* ================= END MODIFIED INFO SECTION ================= */}

        <View style={styles.actionSection}>
          <View style={styles.searchContainer}>
            <Octicons name="search" size={20} color="#585757" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari produk..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={styles.tambahButton} onPress={handleTambahProduk}>
            <Octicons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Tambah</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.riwayatButton} onPress={handleRiwayat}>
            <Octicons name="history" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Riwayat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stockOpnameSection}>
          <TouchableOpacity style={styles.stockOpnameButton} onPress={handleStockOpname} activeOpacity={0.8}>
            <View style={styles.stockOpnameIconContainer}>
              <Octicons name="checklist" size={28} color="#FC6A0A" />
            </View>
            <View style={styles.stockOpnameTextContainer}>
              <Text style={styles.stockOpnameTitle}>Stock Opname</Text>
              <Text style={styles.stockOpnameSubtitle}>Verifikasi stok fisik dengan sistem</Text>
            </View>
            <Octicons name="chevron-right" size={24} color="#585757" />
          </TouchableOpacity>
        </View>

        <ProductTable
          products={filteredProducts}
          onShowQR={handleShowQR}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      <AddProductModal visible={showAddProductModal} onClose={handleCloseAddModal} onSubmit={handleSubmitProduct} isSubmitting={isSubmitting} />
      <HistoryModal visible={showHistoryModal} onClose={() => setShowHistoryModal(false)} historyData={historyData} />
      <QRCodeModal visible={showQRModal} onClose={handleCloseQR} product={selectedProduct} />
      <EditProductModal visible={showEditModal} onClose={handleCloseEditModal} onSuccess={handleEditSuccess} product={editingProduct} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5ECE4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5ECE4' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#585757', fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#292929', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F5ECE4', letterSpacing: 1 },
  scrollView: { flex: 1 },
  titleSection: { backgroundColor: '#FFFFFF', paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: '#585757' },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#292929', textAlign: 'center' },
  
  // === UPDATED STYLES FOR INFO SECTION ===
  infoSection: {
    backgroundColor: '#1e293b', // Warna Navy/Dark Blue sesuai gambar
    padding: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoCardsContainer: {
    flexDirection: 'row',
    gap: 8, // Menggunakan gap agar jarak antar kartu rapi
    justifyContent: 'space-between',
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Warna putih tulang/sangat muda
    borderRadius: 8,
    padding: 10,
    borderWidth: 0, // Menghilangkan border tebal
    elevation: 2, // Shadow untuk Android
    shadowColor: '#000', // Shadow untuk iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    minHeight: 80,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  cardContent: {
      justifyContent: 'center',
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B', // Warna abu-abu teks label
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A', // Warna hitam/gelap untuk angka
  },
  actionSection: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 8, backgroundColor: '#292929', borderBottomWidth: 2, borderBottomColor: '#585757' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5ECE4', borderRadius: 12, paddingHorizontal: 12, borderWidth: 2, borderColor: '#585757' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#292929' },
  tambahButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FC6A0A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 6 },
  riwayatButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#585757', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  stockOpnameSection: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#F5ECE4' },
  stockOpnameButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#FC6A0A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  stockOpnameIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF4ED', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  stockOpnameTextContainer: { flex: 1 },
  stockOpnameTitle: { fontSize: 18, fontWeight: 'bold', color: '#292929', marginBottom: 4 },
  stockOpnameSubtitle: { fontSize: 13, color: '#585757', lineHeight: 18 },
});

export default InventoryScreen;