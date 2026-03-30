// keduitan/sold.js - Business Logic dengan integrasi Struk
import { useState, useEffect, useReducer } from 'react';
import { Alert } from 'react-native';
import { createTransaction } from '../data/services/transactionService';
import { getProducts } from '../data/services/inventoryService';
import {
  buildReceiptData,
  saveReceiptToStorage,
} from './Struk';

const customerReducer = (state, action) => {
  if (action.type === 'UPDATE_FIELD') {
    return { ...state, [action.field]: action.value };
  }
  if (action.type === 'RESET') {
    return {
      customer_name: '',
      customer_phone: '',
      payment_method: 'cash',
      card_type: null,
      notes: '',
    };
  }
  return state;
};

export const useTransactionLogic = (navigation) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProductsLoaded, setIsProductsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [newPrice, setNewPrice] = useState('');
  const [customerData, dispatchCustomer] = useReducer(customerReducer, {
    customer_name: '',
    customer_phone: '',
    payment_method: 'cash',
    card_type: null,
    notes: '',
  });

  // ── STRUK STATE ──────────────────────────────────────────────────────────
  const [showStruk, setShowStruk] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState(null);

  const itemsPerPage = 5;

  // Filter products
  useEffect(() => {
    const filtered = !searchQuery.trim()
      ? products
      : products.filter(
          (p) =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products]);

  // Helper: unit_code valid
  const getValidUnitCode = (product) => {
    if (product.unit_code?.trim()) return product.unit_code.trim().toUpperCase();
    if (product.code?.trim()) return product.code.trim().toUpperCase();
    if (product.barcode?.trim()) return product.barcode.trim().toUpperCase();
    if (product.qr_code?.trim()) return product.qr_code.trim().toUpperCase();
    if (product.units?.length > 0) {
      const u = product.units[0];
      const uc = u.unitCode || u.unit_code || u.code;
      if (uc) return uc.trim().toUpperCase();
    }
    console.warn(`⚠️ Product ${product.id} has no valid unit_code, generating fallback`);
    return `BYS${product.id}${Date.now().toString().slice(-6)}`.toUpperCase();
  };

  // Load products
  const loadProducts = async () => {
    try {
      setLoading(true);
      setIsProductsLoaded(false);
      const result = await getProducts({ perPage: 1000 });
      if (result.success && result.data?.products) {
        const mappedProducts = result.data.products.map((p) => {
          const unitCode = getValidUnitCode(p);
          return {
            id: p.id,
            product_id: p.id,
            name: p.name || p.model || '',
            code: unitCode,
            unit_code: unitCode,
            price: parseFloat(p.selling_price || p.sellingPrice || p.price || 0),
            color: p.color || '',
            size: p.size || '',
            production_code: p.production_code || p.code || '',
            stock: parseInt(p.stock) || 0,
            discount_price: p.discount_price || p.discountPrice || null,
            barcode: p.barcode || unitCode,
            qr_code: unitCode,
            units: p.units || [],
          };
        });
        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts);
      } else {
        Alert.alert('Warning', 'Tidak ada data produk yang tersedia');
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data produk. Periksa koneksi internet.');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
      setIsProductsLoaded(true);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  // Cart operations
  const addToCart = (product) => {
    if (!product) { Alert.alert('Error', 'Produk tidak valid'); return; }
    const unitCode = product.code || product.unit_code || product.barcode;
    if (!unitCode?.trim()) {
      Alert.alert('Error', `Produk "${product.name}" tidak memiliki kode unit yang valid.`);
      return;
    }
    const price = parseFloat(product.price) || 0;
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        product_id: product.id,
        name: product.name,
        code: unitCode.trim().toUpperCase(),
        unit_code: unitCode.trim().toUpperCase(),
        price,
        quantity: 1,
        color: product.color || null,
        size: product.size || null,
        discount_price: product.discount_price || null,
      }]);
    }
    Alert.alert('Berhasil', `${product.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (productId) => setCart(cart.filter((item) => item.id !== productId));

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) { removeFromCart(productId); return; }
    setCart(cart.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  // Price calculations
  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (newPrice && parseFloat(newPrice) > 0) {
      return Math.max(0, subtotal - parseFloat(newPrice));
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    if (newPrice && parseFloat(newPrice) > 0) return parseFloat(newPrice);
    return subtotal;
  };

  // ── CHECKOUT dengan integrasi Struk ──────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) { Alert.alert('Error', 'Keranjang masih kosong'); return; }
    if (!customerData.payment_method) { Alert.alert('Error', 'Pilih metode pembayaran'); return; }
    if (customerData.payment_method === 'debit' && !customerData.card_type) {
      Alert.alert('Error', 'Pilih jenis kartu debit');
      return;
    }

    const invalidProducts = cart.filter((item) => {
      const hasUnitCode = (item.code || item.unit_code)?.trim() !== '';
      const hasProductId = item.product_id || item.id;
      return !hasUnitCode || !hasProductId;
    });
    if (invalidProducts.length > 0) {
      Alert.alert('Error', `Produk berikut tidak valid: ${invalidProducts.map((p) => p.name).join(', ')}`);
      return;
    }

    if (newPrice?.trim() !== '') {
      const subtotal = calculateSubtotal();
      const newTotalValue = parseFloat(newPrice);
      if (isNaN(newTotalValue) || newTotalValue < 0) {
        Alert.alert('Error', 'Harga baru tidak valid.');
        return;
      }
      if (newTotalValue > subtotal) {
        Alert.alert('Error', `Harga baru tidak boleh melebihi subtotal.`);
        return;
      }
    }

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const discountAmountValue = calculateDiscountAmount();
      const finalTotal = calculateTotal();

      const transactionData = {
        customerName: customerData.customer_name?.trim() || null,
        customerPhone: customerData.customer_phone?.trim() || null,
        customerEmail: null,
        paymentMethod: customerData.payment_method.trim(),
        cardType: customerData.payment_method === 'debit' ? customerData.card_type : null,
        overallNewPrice: newPrice?.trim() ? parseFloat(newPrice) : null,
        discountAmount: discountAmountValue,
        products: cart.map((item) => {
          const productId = item.product_id || item.id;
          const unitCode = (item.unit_code || item.code || '').trim().toUpperCase();
          if (!productId) throw new Error(`Produk "${item.name}" tidak memiliki ID`);
          if (!unitCode) throw new Error(`Produk "${item.name}" tidak memiliki kode unit`);
          return {
            product_id: productId,
            unit_code: unitCode,
            quantity: parseInt(item.quantity) || 1,
            new_price: null,
          };
        }),
        notes: customerData.notes?.trim() || null,
      };

      // Simpan snapshot cart & customerData sebelum di-reset (untuk struk)
      const cartSnapshot = [...cart];
      const customerSnapshot = { ...customerData };

      let result;
      try {
        result = await createTransaction(transactionData);
      } catch (error) {
        const errorMessage = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
        Alert.alert('Error', errorMessage);
        setLoading(false);
        return;
      }

      if (result && result.success) {
        console.log('✅ Transaction successful:', result.data);

        // ── Build & simpan struk ───────────────────────────────────────────
        const receiptData = await buildReceiptData(
          result,
          cartSnapshot,
          customerSnapshot,
          finalTotal,
          discountAmountValue
        );
        await saveReceiptToStorage(receiptData);
        setCurrentReceiptData(receiptData);

        // Reset state transaksi
        setCart([]);
        dispatchCustomer({ type: 'RESET' });
        setNewPrice('');

        // Tampilkan modal struk
        setLoading(false);
        setShowStruk(true);
      } else {
        const errorMessage = result?.error || result?.message || 'Gagal membuat transaksi';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Tutup struk & navigate
  const handleCloseStruk = () => {
    setShowStruk(false);
    setCurrentReceiptData(null);
    Alert.alert(
      'Transaksi Berhasil',
      'Transaksi telah disimpan.',
      [
        {
          text: 'Lihat Transaksi',
          onPress: () => navigation.navigate('MainApp', { screen: 'Transaksi' }),
        },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]
    );
  };

  // Scanner operations
  const openScanner = () => {
    if (loading) { Alert.alert('Tunggu', 'Data produk sedang dimuat.'); return; }
    if (!isProductsLoaded) { Alert.alert('Tunggu', 'Data produk sedang dimuat.'); return; }
    if (products.length === 0) {
      Alert.alert(
        'Tidak Ada Data',
        'Tidak ada produk tersedia.',
        [{ text: 'Refresh', onPress: loadProducts }, { text: 'OK' }]
      );
      return;
    }
    setShowScanner(true);
  };

  const handleScanSuccess = (cartItem) => {
    if (!cartItem?.id) { Alert.alert('Info', 'Hasil scan tidak cocok dengan produk'); return; }
    const unitCode = cartItem.code || cartItem.unit_code;
    if (!unitCode?.trim()) { Alert.alert('Error', 'Produk dari scan tidak memiliki kode unit.'); return; }

    const existingItem = cart.find((item) => item.id === cartItem.id);
    if (existingItem) {
      setCart(cart.map((item) =>
        item.id === cartItem.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        ...cartItem,
        code: unitCode.trim().toUpperCase(),
        unit_code: unitCode.trim().toUpperCase(),
      }]);
    }
    setTimeout(() => Alert.alert('Berhasil', `${cartItem.name} ditambahkan dari scan`), 300);
  };

  const handleScanError = (title = 'Error', message = 'Gagal melakukan scan') => {
    setShowScanner(false);
    Alert.alert(title, message);
  };

  return {
    // State
    products,
    filteredProducts,
    currentProducts,
    searchQuery,
    setSearchQuery,
    cart,
    loading,
    showScanner,
    setShowScanner,
    isProductsLoaded,
    currentPage,
    totalPages,
    newPrice,
    setNewPrice,
    customerData,
    dispatchCustomer,

    // Struk state
    showStruk,
    setShowStruk,
    currentReceiptData,
    handleCloseStruk,

    // Functions
    loadProducts,
    handlePrevious,
    handleNext,
    addToCart,
    removeFromCart,
    updateQuantity,
    calculateSubtotal,
    calculateDiscountAmount,
    calculateTotal,
    handleCheckout,
    openScanner,
    handleScanSuccess,
    handleScanError,
  };
};