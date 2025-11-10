// BYSOVAN/pages/InventoryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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

// Import API Services
import { getProducts, createProduct, deleteProduct } from '../data/services';

const InventoryScreen = ({ navigation }) => {
  // State Management
  const [inventoryData, setInventoryData] = useState({
    totalProduk: 0,
    stokMenipis: 0,
    totalStok: 0,
    products: []
  });
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    namaProduk: '',
    merek: '',
    kategori: '',
    kodeSKU: '',
    hargaBeli: '',
    hargaJual: '',
    ukuran: '',
    warna: '',
    stokAwal: '',
    minimumStok: '',
    supplier: '',
    deskripsi: '',
    barcode: '',
  });

  // Fetch Inventory Data
  const loadInventoryData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const result = await getProducts();
      
      // 🔥 DEBUGGING: Log raw response
      console.log('=== RAW API RESPONSE ===');
      console.log('Success:', result.success);
      console.log('Full Data:', JSON.stringify(result.data, null, 2));
      
      if (result.success && result.data.products) {
        // 🔥 DEBUGGING: Log first product
        console.log('=== FIRST PRODUCT DETAILS ===');
        console.log(JSON.stringify(result.data.products[0], null, 2));
        
        // Transform data to match expected format
        const mappedProducts = result.data.products.map((p, index) => {
            // 🔥 DEBUGGING: Log transformation
            console.log(`=== TRANSFORMING PRODUCT ${index + 1} ===`);
            console.log('Original:', p);
            
            // Generate barcode jika tidak ada
            let barcodeValue = '';
            if (p.units && p.units.length > 0 && p.units[0].unitCode) {
              barcodeValue = p.units[0].unitCode;
            } else if (p.barcode) {
              barcodeValue = p.barcode;
            } else if (p.id) {
              // Auto-generate barcode dari product ID
              barcodeValue = `BYS${p.id}${Date.now().toString().slice(-6)}`;
            }
            
            const transformed = {
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
            
            console.log('Transformed:', transformed);
            console.log('Barcode:', transformed.barcode);
            console.log('Harga Jual:', transformed.hargaJual);
            
            return transformed;
          });

        // Compute fallback statistics when API doesn't provide them or uses different keys
        const totalProdukFallback = mappedProducts.length;
        const totalStokFallback = mappedProducts.reduce((sum, prod) => sum + (parseInt(prod.stok) || 0), 0);
        // Define low stock threshold (fallback). Prefer API value when available.
        const LOW_STOCK_THRESHOLD = 5;
        const stokMenipisFallback = mappedProducts.filter(prod => (parseInt(prod.stok) || 0) <= LOW_STOCK_THRESHOLD).length;

        const transformedData = {
          totalProduk: result.data.statistics?.totalProducts || result.data.statistics?.total_products || totalProdukFallback,
          stokMenipis: result.data.statistics?.lowStockProducts || result.data.statistics?.low_stock_products || stokMenipisFallback,
          totalStok: result.data.statistics?.totalStock || result.data.statistics?.total_stock || totalStokFallback,
          products: mappedProducts,
        };

        // 🔥 DEBUGGING: Log final transformed data
        console.log('=== FINAL TRANSFORMED DATA ===');
        console.log('Total Products (api/stat/fallback):', transformedData.totalProduk);
        console.log('Total Stok (api/stat/fallback):', transformedData.totalStok);
        console.log('Stok Menipis (api/stat/fallback):', transformedData.stokMenipis);
        console.log('First Product:', transformedData.products[0]);

        setInventoryData(transformedData);
        setFilteredProducts(transformedData.products);
      } else {
        Alert.alert('Error', result.message || 'Gagal memuat data produk');
        setInventoryData({
          totalProduk: 0,
          stokMenipis: 0,
          totalStok: 0,
          products: []
        });
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      Alert.alert('Error', error.message || 'Gagal memuat data produk');
      setInventoryData({
        totalProduk: 0,
        stokMenipis: 0,
        totalStok: 0,
        products: []
      });
      setFilteredProducts([]);
    }
    
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  // Fetch History Data
  const loadHistoryData = async () => {
    try {
      setHistoryData([]);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryData([]);
      Alert.alert('Error', 'Gagal memuat data riwayat.');
    }
  };

  // Initial Load
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Search Filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(inventoryData.products);
    } else {
      const filtered = inventoryData.products.filter(product => 
        product.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.kategori.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, inventoryData.products]);

  // Handlers
  const onRefresh = () => {
    setRefreshing(true);
    loadInventoryData();
  };

  const handleTambahProduk = () => {
    setShowAddProductModal(true);
  };

  const handleRiwayat = () => {
    loadHistoryData();
    setShowHistoryModal(true);
  };

  const handleShowQR = (product) => {
    // 🔥 DEBUGGING: Log product saat QR ditampilkan
    console.log('=== SHOW QR MODAL ===');
    console.log('Product Data:', product);
    console.log('Barcode:', product?.barcode);
    console.log('Harga Jual:', product?.hargaJual);
    
    if (!product) {
      Alert.alert('Error', 'Data produk tidak valid');
      return;
    }

    if (!product.barcode) {
      Alert.alert('Error', 'Produk tidak memiliki barcode');
      return;
    }

    setSelectedProduct(product);
    setShowQRModal(true);
  };

  const handleCloseQR = () => {
    setShowQRModal(false);
    setTimeout(() => {
      setSelectedProduct(null);
    }, 300);
  };

  const handleEditProduct = (product) => {
    Alert.alert('Info', 'Fitur Edit Produk akan segera ditambahkan');
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus produk ini?',
      [
        {
          text: 'Batal',
          style: 'cancel'
        },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteProduct(productId);
              
              if (result.success) {
                Alert.alert('Berhasil', 'Produk berhasil dihapus');
                loadInventoryData();
              } else {
                Alert.alert('Error', result.message || 'Gagal menghapus produk');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', error.message || 'Gagal menghapus produk');
            }
          }
        }
      ]
    );
  };

  const handleCloseAddModal = () => {
    setShowAddProductModal(false);
    setFormData({
      namaProduk: '',
      merek: '',
      kategori: '',
      kodeSKU: '',
      hargaBeli: '',
      hargaJual: '',
      ukuran: '',
      warna: '',
      stokAwal: '',
      minimumStok: '',
      supplier: '',
      deskripsi: '',
      barcode: '',
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitProduct = async () => {
    if (!formData.namaProduk || !formData.hargaJual || !formData.stokAwal) {
      Alert.alert(
        'Validasi', 
        'Mohon lengkapi data produk (Nama, Harga Jual, dan Stok Awal wajib diisi)'
      );
      return;
    }

    setIsSubmitting(true);

    let barcodeToSave = formData.barcode;
    
    if (!barcodeToSave || barcodeToSave.trim() === '') {
      const timestamp = Date.now();
      const random = Math.floor(1000 + Math.random() * 9000);
      barcodeToSave = `BYS${timestamp}${random}`;
      
      console.log('🔥 Barcode auto-generated:', barcodeToSave);
    }

    const productData = {
      brand: formData.merek || '',
      model: formData.namaProduk || '',
      color: formData.warna || '',
      sizes: formData.ukuran ? [{ size: formData.ukuran, stock: parseInt(formData.stokAwal) || 0 }] : [],
      sellingPrice: parseFloat(formData.hargaJual) || 0,
      discountPrice: formData.hargaDiskon ? parseFloat(formData.hargaDiskon) : null,
    };

    try {
      const result = await createProduct(productData);

      if (result.success) {
        Alert.alert(
          'Berhasil!', 
          `Produk berhasil ditambahkan!`
        );
        handleCloseAddModal();
        loadInventoryData();
      } else {
        Alert.alert('Error', result.message || 'Terjadi kesalahan saat menambahkan produk');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', error.message || 'Terjadi kesalahan saat menambahkan produk');
    }

    setIsSubmitting(false);
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Octicons name="arrow-left" size={24} color="#F5ECE4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>INVENTORY</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FC6A0A']}
            tintColor="#FC6A0A"
          />
        }
      >
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>MANAGEMENT INVENTORY</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>INVENTORY INFORMATION</Text>
          
          <View style={styles.infoCardsContainer}>
            <View style={styles.infoCard}>
              <Octicons name="graph" size={32} color="#FC6A0A" />
              <Text style={styles.infoCardLabel}>Total Produk</Text>
              <Text style={styles.infoCardValue}>{inventoryData.totalProduk}</Text>
            </View>

            <View style={styles.infoCard}>
              <Octicons name="package" size={32} color="#FC6A0A" />
              <Text style={styles.infoCardLabel}>Stok Menipis</Text>
              <Text style={styles.infoCardValue}>{inventoryData.stokMenipis}</Text>
            </View>

            <View style={styles.infoCard}>
              <Octicons name="archive" size={32} color="#FC6A0A" />
              <Text style={styles.infoCardLabel}>Total Stok</Text>
              <Text style={styles.infoCardValue}>{inventoryData.totalStok}</Text>
            </View>
          </View>
        </View>

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

        <ProductTable
          products={filteredProducts}
          onShowQR={handleShowQR}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      <AddProductModal
        visible={showAddProductModal}
        onClose={handleCloseAddModal}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleSubmitProduct}
        isSubmitting={isSubmitting}
      />

      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        historyData={historyData}
      />

      <QRCodeModal
        visible={showQRModal}
        onClose={handleCloseQR}
        product={selectedProduct}
      />
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5ECE4',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  titleSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#585757',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#292929',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#292929',
    padding: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5ECE4',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  infoCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F5ECE4',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#585757',
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#585757',
    marginTop: 8,
    textAlign: 'center',
  },
  infoCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#292929',
    marginTop: 4,
  },
  actionSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: '#292929',
    borderBottomWidth: 2,
    borderBottomColor: '#585757',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5ECE4',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#585757',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#292929',
  },
  tambahButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FC6A0A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  riwayatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#585757',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InventoryScreen;