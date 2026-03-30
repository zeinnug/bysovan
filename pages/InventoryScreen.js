// BYSOVAN/pages/InventoryScreen.js - FINAL FIX
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Modal,
  FlatList,
  TouchableWithoutFeedback,
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

// ✅ FIX: Threshold stok menipis
// unit di API TIDAK punya field stock — stok ada di product.stock langsung
// Produk dianggap menipis jika product.stock <= threshold ini
const LOW_STOCK_THRESHOLD = 5;

const INITIAL_INVENTORY_STATE = {
  stokMenipis: 0,
  totalProduk: 0,
  totalUnit: 0,
  products: [],
  brandCounts: [],
};

// ==================== BRAND DROPDOWN COMPONENT ====================
const BrandDropdown = ({ brandCounts, totalProduk }) => {
  const [visible, setVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [buttonLayout, setButtonLayout] = useState(null);
  const buttonRef = useRef(null);

  const displayValue = selectedBrand ? selectedBrand.count : totalProduk;
  const displaySub = selectedBrand ? 'unit' : 'produk';
  const displayLabel = selectedBrand
    ? `${selectedBrand.brand} (${selectedBrand.count} unit)`
    : `Semua (${totalProduk} produk)`;

  const handleOpen = () => {
    if (buttonRef.current) {
      buttonRef.current.measure((fx, fy, width, height, px, py) => {
        setButtonLayout({ x: px, y: py, width, height });
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  const handleSelect = (item) => {
    setSelectedBrand(item);
    setVisible(false);
  };

  const handleReset = () => {
    setSelectedBrand(null);
    setVisible(false);
  };

  return (
    <View style={styles.infoCard}>
      <View style={styles.iconContainer}>
        <Octicons name="package" size={24} color="#FC6A0A" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.infoCardLabel}>TOTAL PRODUK</Text>
        <Text style={styles.infoCardValue}>{displayValue}</Text>
        <Text style={styles.infoCardSub}>{displaySub}</Text>

        <TouchableOpacity
          ref={buttonRef}
          style={styles.dropdownTrigger}
          onPress={handleOpen}
          activeOpacity={0.7}
        >
          <Text style={styles.dropdownTriggerText} numberOfLines={1}>
            {displayLabel}
          </Text>
          <Octicons name="chevron-down" size={12} color="#FC6A0A" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.dropdownOverlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.dropdownMenu,
                buttonLayout && {
                  position: 'absolute',
                  top: buttonLayout.y + buttonLayout.height + 4,
                  left: buttonLayout.x,
                  width: Math.max(buttonLayout.width, 210),
                }
              ]}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownHeaderText}>FILTER BRAND</Text>
                </View>

                <FlatList
                  data={brandCounts}
                  keyExtractor={(item) => item.brand}
                  style={styles.dropdownList}
                  showsVerticalScrollIndicator={true}
                  ListHeaderComponent={
                    <TouchableOpacity
                      style={[styles.dropdownItem, !selectedBrand && styles.dropdownItemActive]}
                      onPress={handleReset}
                    >
                      <Text style={[styles.dropdownItemText, !selectedBrand && styles.dropdownItemTextActive]}>
                        Semua Brand
                      </Text>
                      <Text style={[styles.dropdownItemCount, !selectedBrand && styles.dropdownItemCountActive]}>
                        {totalProduk} produk
                      </Text>
                    </TouchableOpacity>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        selectedBrand?.brand === item.brand && styles.dropdownItemActive,
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedBrand?.brand === item.brand && styles.dropdownItemTextActive,
                      ]}>
                        {item.brand}
                      </Text>
                      <Text style={[
                        styles.dropdownItemCount,
                        selectedBrand?.brand === item.brand && styles.dropdownItemCountActive,
                      ]}>
                        {item.count} unit
                      </Text>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.dropdownSeparator} />}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ==================== MAIN SCREEN ====================
const InventoryScreen = ({ navigation }) => {
  const [inventoryData, setInventoryData] = useState(INITIAL_INVENTORY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return inventoryData.products;
    const query = searchQuery.toLowerCase();
    return inventoryData.products.filter(product =>
      product.nama.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query) ||
      product.kategori.toLowerCase().includes(query)
    );
  }, [searchQuery, inventoryData.products]);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const loadInventoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getProducts();

      // ✅ API response: { success, data: { products, brand_counts, total_products, total_stock, low_stock_products } }
      // formatResponse di api.js mengambil response.data.data → jadi dataSource = data bagian dalam
      const dataSource = result.data?.data || result.data;

      if (result.success && dataSource?.products) {
        const products = dataSource.products;

        // ✅ Map produk — unit_code bukan unitCode (sesuai API real)
        const mappedProducts = products.map((p) => {
          let barcodeValue = '';
          if (Array.isArray(p.units) && p.units.length > 0) {
            // ✅ Gunakan QR asli dari API (unit.qr_code), fallback ke unit_code
            barcodeValue = p.units[0].qr_code || p.units[0].unit_code || '';
          }
          if (!barcodeValue && p.id) barcodeValue = `BYS${p.id}`;

          return {
            id: p.id,
            nama: p.name || p.model || '-',
            merek: p.brand || '-',
            model: p.model || '-',
            ukuran: p.size || '-',
            warna: p.color || '-',
            hargaJual: parseFloat(p.selling_price) || 0,
            hargaDiskon: parseFloat(p.discount_price) || 0,
            // ✅ stok ada di product level, BUKAN di unit level
            stok: parseInt(p.stock) || 0,
            barcode: barcodeValue,
            kategori: p.brand || '-',
            units: p.units || [],
          };
        });

        // ✅ Hitung stok menipis dari product.stock (unit TIDAK punya field stock)
        // low_stock_products dari API = 4653 > total produk 1211 → BUG di backend, hitung manual
        const stokMenipis = mappedProducts.filter(
          (p) => p.stok <= LOW_STOCK_THRESHOLD
        ).length;

        // ✅ Total unit = jumlah semua unit dari semua produk (= total_stock di API)
        const totalUnit = products.reduce((sum, p) => {
          return sum + (p.units ? p.units.length : 0);
        }, 0);

        // ✅ brand_counts dari API sudah object { "Skechers": 479, ... }
        // Convert ke array dan sort descending by count
        const rawBrandCounts = dataSource.brand_counts || {};
        const brandCounts = Object.entries(rawBrandCounts)
          .map(([brand, count]) => ({ brand, count }))
          .sort((a, b) => b.count - a.count);

        setInventoryData({
          stokMenipis,
          totalProduk: mappedProducts.length,  // jumlah baris produk
          totalUnit,                            // jumlah unit/QR total
          products: mappedProducts,
          brandCounts,
        });

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

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

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
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
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
        }
      }
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

        // ✅ Prioritas QR asli dari API (qr_code), lalu unit_code
        if (newProduct.units?.[0]?.qr_code) generatedBarcode = newProduct.units[0].qr_code;
        else if (newProduct.units?.[0]?.unit_code) generatedBarcode = newProduct.units[0].unit_code;
        else if (newProduct.units?.[0]?.unitCode) generatedBarcode = newProduct.units[0].unitCode;
        else if (newProduct.id) generatedBarcode = `BYS${newProduct.id}`;

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
          hargaJual: parseFloat(newProduct.selling_price) || 0,
          hargaDiskon: parseFloat(newProduct.discount_price) || 0,
          stok: newProduct.stock || 0,
          barcode: generatedBarcode,
          kategori: newProduct.brand,
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

        {/* ================= INFO SECTION ================= */}
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
                {/* ✅ Dihitung manual: produk dengan stock <= 5 */}
                <Text style={styles.infoCardValue}>{inventoryData.stokMenipis}</Text>
                <Text style={styles.infoCardSub}>produk ≤ {LOW_STOCK_THRESHOLD}</Text>
              </View>
            </View>

            {/* Card 2: Total Produk + Brand Dropdown */}
            <BrandDropdown
              brandCounts={inventoryData.brandCounts}
              totalProduk={inventoryData.totalProduk}
            />

            {/* Card 3: Total Unit */}
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                <Octicons name="rows" size={24} color="#FC6A0A" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.infoCardLabel}>TOTAL UNIT</Text>
                {/* ✅ Total unit = jumlah semua QR/unit dari seluruh produk */}
                <Text style={styles.infoCardValue}>{inventoryData.totalUnit}</Text>
                <Text style={styles.infoCardSub}>QR terdaftar</Text>
              </View>
            </View>

          </View>
        </View>
        {/* ================= END INFO SECTION ================= */}

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

  // INFO SECTION
  infoSection: { backgroundColor: '#292929', padding: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 15, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoCardsContainer: { flexDirection: 'row', gap: 8 },
  infoCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, justifyContent: 'flex-start' },
  iconContainer: { marginBottom: 8 },
  cardContent: { flex: 1 },
  infoCardLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  infoCardValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  infoCardSub: { fontSize: 9, color: '#94A3B8', marginBottom: 6 },

  // BRAND DROPDOWN
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#FC6A0A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, gap: 4, marginTop: 4 },
  dropdownTriggerText: { flex: 1, fontSize: 9, color: '#FC6A0A', fontWeight: '600' },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  dropdownMenu: { backgroundColor: '#FFFFFF', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, overflow: 'hidden', maxHeight: 320, minWidth: 210 },
  dropdownHeader: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10 },
  dropdownHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  dropdownList: { maxHeight: 270 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#FFFFFF' },
  dropdownItemActive: { backgroundColor: '#FFF4ED' },
  dropdownItemText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  dropdownItemTextActive: { color: '#FC6A0A', fontWeight: '700' },
  dropdownItemCount: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  dropdownItemCountActive: { color: '#FC6A0A', fontWeight: '600' },
  dropdownSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 12 },

  // ACTION SECTION
  actionSection: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 8, backgroundColor: '#292929', borderBottomWidth: 2, borderBottomColor: '#585757' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5ECE4', borderRadius: 12, paddingHorizontal: 12, borderWidth: 2, borderColor: '#585757' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#292929' },
  tambahButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FC6A0A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 6 },
  riwayatButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#585757', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // STOCK OPNAME
  stockOpnameSection: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#F5ECE4' },
  stockOpnameButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#FC6A0A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  stockOpnameIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF4ED', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  stockOpnameTextContainer: { flex: 1 },
  stockOpnameTitle: { fontSize: 18, fontWeight: 'bold', color: '#292929', marginBottom: 4 },
  stockOpnameSubtitle: { fontSize: 13, color: '#585757', lineHeight: 18 },
});

export default InventoryScreen;