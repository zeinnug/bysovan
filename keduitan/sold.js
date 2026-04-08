// keduitan/sold.js - Business Logic dengan integrasi Struk
import { useState, useEffect, useReducer } from 'react';
import { Alert } from 'react-native';
import { createTransaction } from '../data/services/transactionService';
import { getProducts } from '../data/services/inventoryService';
import {
  buildReceiptData,
  saveReceiptToStorage,
} from './Struk';

// ── RUPIAH FORMAT HELPERS ────────────────────────────────────────────────────

/**
 * Parse string berformat "1.275.000" → angka 1275000
 */
export const parseRupiahInput = (str) => {
  if (!str) return 0;
  const cleaned = String(str).replace(/\./g, '').replace(/\D/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Format raw text input menjadi string dengan titik ribuan
 * Dipanggil di onChangeText — strip non-digit lalu format
 */
export const formatRupiahOnChange = (rawText) => {
  const digits = String(rawText).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// ── ERROR MESSAGE TRANSLATOR ─────────────────────────────────────────────────
/**
 * Menerjemahkan pesan error dari API/sistem menjadi pesan yang user-friendly
 * Digunakan di berbagai modul: sold, inventory, print, dashboard, dll
 */
export const translateErrorMessage = (errorMsg) => {
  if (!errorMsg) return 'Gagal membuat transaksi';
  
  const msg = String(errorMsg).toLowerCase();
  
  // Mapping pesan API ke pesan user-friendly (comprehensive version)
  const errorMap = {
    // ─ TRANSACTION ERRORS ─
    'not found or inactive': 'Produk yang dipilih sudah terjual atau sudah tidak tersedia di sistem',
    'product unit with code': 'Produk yang dipilih sudah terjual atau sudah tidak tersedia di sistem',
    'unit code': 'Kode unit produk tidak valid atau sudah dihapus',
    'stock': 'Stok produk tidak mencukupi atau sudah habis',
    'payment': 'Metode pembayaran tidak valid atau tidak tersedia',
    
    // ─ INVENTORY ERRORS ─
    'duplicate product': 'Kode produk sudah ada di sistem',
    'duplicate product code': 'Kode produk atau SKU sudah terdaftar',
    'foreign key': 'Tidak bisa menghapus produk ini karena masih ada transaksi terkait',
    'product has': 'Produk ini tidak bisa diubah karena sedang digunakan',
    'sku format': 'Format kode produk tidak valid',
    'brand not found': 'Brand tidak ditemukan di sistem',
    
    // ─ PERMISSION ERRORS ─
    'permission denied': 'Anda tidak memiliki izin untuk melakukan tindakan ini',
    'permission': 'Akses ditolak karena hak akses yang terbatas',
    'only admin': 'Hanya admin yang dapat melakukan tindakan ini',
    'locked': 'Produk sedang digunakan oleh user lain, coba lagi nanti',
    
    // ─ NETWORK ERRORS ─
    'connection': 'Koneksi internet bermasalah, silakan periksa dan coba lagi',
    'timeout': 'Koneksi timeout, silakan coba lagi beberapa saat',
    'network': 'Koneksi internet putus, silakan periksa sinyal',
    'econnrefused': 'Server tidak dapat dihubungi, coba lagi atau hubungi admin',
    '404 not found': 'Data tidak ditemukan atau sudah dihapus',
    '500': 'Terjadi kesalahan pada server, hubungi admin',
    
    // ─ PRINT/STORAGE ERRORS ─
    'print cancelled': 'Cetak dibatalkan',
    'printer not found': 'Printer tidak ditemukan, pastikan printer aktif',
    'camera': 'Kamera tidak dapat diakses atau tidak tersedia',
    'storage quota': 'Ruang penyimpanan tidak cukup',
    'write to': 'Tidak dapat menyimpan file, periksa izin penyimpanan',
    'file path invalid': 'Lokasi penyimpanan tidak valid',
    
    // ─ QR/BARCODE ERRORS ─
    'invalid qr': 'Format QR Code tidak valid atau rusak',
    'barcode not recognized': 'Barcode tidak dapat dibaca, pastikan QR code jelas',
    'qr code tidak ditemukan': 'QR Code tidak terdaftar di sistem',
    
    // ─ DATA VALIDATION ERRORS ─
    'invalid': 'Data tidak valid, silakan periksa kembali',
    'required': 'Field ini wajib diisi',
    'already exists': 'Data ini sudah terdaftar',
    'undefined': 'Terjadi kesalahan data, silakan refresh halaman',
    
    // ─ GENERAL ERRORS ─
    'cannot read': 'Terjadi kesalahan sistem, hubungi admin jika masalah berlanjut',
    'error': 'Terjadi kesalahan, silakan coba lagi',
  };
  
  // Cari keyword dalam pesan error (prioritas panjang keyword lebih panjang)
  const sorted = Object.entries(errorMap).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, replacement] of sorted) {
    if (msg.includes(keyword)) {
      return replacement;
    }
  }
  
  // Jika tidak ada keyword yang cocok, tampilkan pesan original
  return errorMsg;
};

// ── REDUCER ──────────────────────────────────────────────────────────────────

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

// ── HOOK ─────────────────────────────────────────────────────────────────────

export const useTransactionLogic = (navigation) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProductsLoaded, setIsProductsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Disimpan sebagai string berformat "1.275.000"
  const [newPrice, setNewPrice] = useState('');
  // { [productId]: "500.000" } — string berformat per item
  const [itemNewPrices, setItemNewPrices] = useState({});

  const [customerData, dispatchCustomer] = useReducer(customerReducer, {
    customer_name: '',
    customer_phone: '',
    payment_method: 'cash',
    card_type: null,
    notes: '',
  });

  const [showStruk, setShowStruk] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState(null);

  const itemsPerPage = 5;

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
    return `BYS${product.id}${Date.now().toString().slice(-6)}`.toUpperCase();
  };

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
            selling_price: parseFloat(p.selling_price || p.sellingPrice || p.price || 0),
            price: parseFloat(p.selling_price || p.sellingPrice || p.price || 0),
            discount_price: (p.discount_price || p.discountPrice)
              ? parseFloat(p.discount_price || p.discountPrice)
              : null,
            color: p.color || '',
            size: p.size || '',
            production_code: p.production_code || p.code || '',
            stock: parseInt(p.stock) || 0,
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

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  // ── CART OPERATIONS ──────────────────────────────────────────────────────

  const addToCart = (product) => {
    if (!product) { Alert.alert('Error', 'Produk tidak valid'); return; }
    const unitCode = product.code || product.unit_code || product.barcode;
    if (!unitCode?.trim()) {
      Alert.alert('Error', `Produk "${product.name}" tidak memiliki kode unit yang valid.`);
      return;
    }
    if (cart.find((item) => item.id === product.id)) {
      Alert.alert('Info', `${product.name} sudah ada di keranjang`);
      return;
    }
    setCart([...cart, {
      id: product.id,
      product_id: product.id,
      name: product.name,
      code: unitCode.trim().toUpperCase(),
      unit_code: unitCode.trim().toUpperCase(),
      selling_price: parseFloat(product.selling_price || product.price) || 0,
      price: parseFloat(product.selling_price || product.price) || 0,
      discount_price: product.discount_price ? parseFloat(product.discount_price) : null,
      quantity: 1,
      color: product.color || null,
      size: product.size || null,
      production_code: product.production_code || null,
    }]);
    Alert.alert('Berhasil', `${product.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
    setItemNewPrices((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  // Handler per-item: format rupiah otomatis
  const updateItemNewPrice = (productId, rawText) => {
    const formatted = formatRupiahOnChange(rawText);
    setItemNewPrices((prev) => ({ ...prev, [productId]: formatted }));
  };

  // Handler harga baru keseluruhan: format rupiah otomatis
  const handleNewPriceChange = (rawText) => {
    setNewPrice(formatRupiahOnChange(rawText));
  };

  // ── PRICE CALCULATIONS ───────────────────────────────────────────────────

  const getEffectivePricePerItem = (item) => {
    const itemNewPriceVal = parseRupiahInput(itemNewPrices[item.id]);
    if (itemNewPriceVal > 0) return itemNewPriceVal;
    if (item.discount_price && parseFloat(item.discount_price) > 0) {
      return parseFloat(item.discount_price);
    }
    return parseFloat(item.selling_price || item.price) || 0;
  };

  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + getEffectivePricePerItem(item), 0);

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    const newPriceVal = parseRupiahInput(newPrice);
    if (newPriceVal > 0) return Math.max(0, subtotal - newPriceVal);
    return 0;
  };

  const calculateTotal = () => {
    const newPriceVal = parseRupiahInput(newPrice);
    if (newPriceVal > 0) return newPriceVal;
    return calculateSubtotal();
  };

  // ── CHECKOUT ─────────────────────────────────────────────────────────────
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

    const newPriceVal = parseRupiahInput(newPrice);
    if (newPrice && newPrice.trim() !== '') {
      const subtotal = calculateSubtotal();
      if (isNaN(newPriceVal) || newPriceVal < 0) {
        Alert.alert('Error', 'Harga baru tidak valid.');
        return;
      }
      if (newPriceVal > subtotal) {
        Alert.alert('Error', 'Harga baru tidak boleh melebihi subtotal.');
        return;
      }
    }

    setLoading(true);
    try {
      const discountAmountValue = calculateDiscountAmount();
      const finalTotal = calculateTotal();

      const transactionData = {
        customerName: customerData.customer_name?.trim() || null,
        customerPhone: customerData.customer_phone?.trim() || null,
        customerEmail: null,
        paymentMethod: customerData.payment_method.trim(),
        cardType: customerData.payment_method === 'debit' ? customerData.card_type : null,
        overallNewPrice: newPriceVal > 0 ? newPriceVal : null,
        discountAmount: discountAmountValue,
        products: cart.map((item) => {
          const productId = item.product_id || item.id;
          const unitCode = (item.unit_code || item.code || '').trim().toUpperCase();
          if (!productId) throw new Error(`Produk "${item.name}" tidak memiliki ID`);
          if (!unitCode) throw new Error(`Produk "${item.name}" tidak memiliki kode unit`);
          const itemNewPriceVal = parseRupiahInput(itemNewPrices[item.id]);
          return {
            product_id: productId,
            unit_code: unitCode,
            quantity: 1,
            new_price: (!newPriceVal && itemNewPriceVal > 0) ? itemNewPriceVal : null,
            effective_price: getEffectivePricePerItem(item),
          };
        }),
        notes: customerData.notes?.trim() || null,
      };

      const cartSnapshot = [...cart];
      const customerSnapshot = { ...customerData };

      let result;
      try {
        result = await createTransaction(transactionData);
      } catch (error) {
        const errorMsg = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
        Alert.alert('Error', translateErrorMessage(errorMsg));
        setLoading(false);
        return;
      }

      if (result && result.success) {
        const receiptData = await buildReceiptData(
          result, cartSnapshot, customerSnapshot, finalTotal, discountAmountValue
        );
        await saveReceiptToStorage(receiptData);
        setCurrentReceiptData(receiptData);
        setCart([]);
        setItemNewPrices({});
        dispatchCustomer({ type: 'RESET' });
        setNewPrice('');
        setLoading(false);
        setShowStruk(true);
      } else {
        const errorMsg = result?.error || result?.message || 'Gagal membuat transaksi';
        Alert.alert('Error', translateErrorMessage(errorMsg));
      }
    } catch (error) {
      const errorMsg = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
      Alert.alert('Error', translateErrorMessage(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseStruk = () => {
    setShowStruk(false);
    setCurrentReceiptData(null);
    Alert.alert(
      'Transaksi Berhasil',
      'Transaksi telah disimpan.',
      [
        { text: 'Lihat Transaksi', onPress: () => navigation.navigate('MainApp', { screen: 'Transaksi' }) },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]
    );
  };

  const openScanner = () => {
    if (loading || !isProductsLoaded) { Alert.alert('Tunggu', 'Data produk sedang dimuat.'); return; }
    if (products.length === 0) {
      Alert.alert('Tidak Ada Data', 'Tidak ada produk tersedia.',
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
    if (cart.find((item) => item.id === cartItem.id)) {
      Alert.alert('Info', `${cartItem.name} sudah ada di keranjang`);
      return;
    }
    setCart([...cart, {
      ...cartItem,
      code: unitCode.trim().toUpperCase(),
      unit_code: unitCode.trim().toUpperCase(),
      selling_price: parseFloat(cartItem.selling_price || cartItem.price) || 0,
      price: parseFloat(cartItem.selling_price || cartItem.price) || 0,
      discount_price: cartItem.discount_price ? parseFloat(cartItem.discount_price) : null,
      quantity: 1,
    }]);
    setTimeout(() => Alert.alert('Berhasil', `${cartItem.name} ditambahkan dari scan`), 300);
  };

  const handleScanError = (title = 'Error', message = 'Gagal melakukan scan') => {
    setShowScanner(false);
    Alert.alert(title, message);
  };

  return {
    products, filteredProducts, currentProducts,
    searchQuery, setSearchQuery,
    cart, loading,
    showScanner, setShowScanner,
    isProductsLoaded,
    currentPage, totalPages,
    newPrice, handleNewPriceChange,
    customerData, dispatchCustomer,
    itemNewPrices, updateItemNewPrice,
    getEffectivePricePerItem, parseRupiahInput,
    showStruk, setShowStruk,
    currentReceiptData, handleCloseStruk,
    loadProducts,
    handlePrevious, handleNext,
    addToCart, removeFromCart,
    calculateSubtotal, calculateDiscountAmount, calculateTotal,
    handleCheckout,
    openScanner, handleScanSuccess, handleScanError,
  };
};