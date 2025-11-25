// keduitan/sold.js - Business Logic untuk Transaction (FIXED - Unit Code & Validation)
import { useState, useEffect, useReducer } from 'react';
import { Alert } from 'react-native';
import { createTransaction } from '../data/services/transactionService';
import { getProducts, updateProduct } from '../data/services/inventoryService';

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
      notes: '' 
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

  const itemsPerPage = 5;

  // Filter products based on search query
  useEffect(() => {
    const filtered = !searchQuery.trim() ? products : products.filter((p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products]);

  // ✅ IMPROVED: Helper function untuk mendapatkan unit_code yang valid
  const getValidUnitCode = (product) => {
    // Priority: unit_code > code > barcode > qr_code > generate from ID
    if (product.unit_code && product.unit_code.trim() !== '') {
      return product.unit_code.trim().toUpperCase();
    }
    if (product.code && product.code.trim() !== '') {
      return product.code.trim().toUpperCase();
    }
    if (product.barcode && product.barcode.trim() !== '') {
      return product.barcode.trim().toUpperCase();
    }
    if (product.qr_code && product.qr_code.trim() !== '') {
      return product.qr_code.trim().toUpperCase();
    }
    // Fallback: generate from units array
    if (product.units && product.units.length > 0) {
      const firstUnit = product.units[0];
      if (firstUnit.unitCode) return firstUnit.unitCode.trim().toUpperCase();
      if (firstUnit.unit_code) return firstUnit.unit_code.trim().toUpperCase();
      if (firstUnit.code) return firstUnit.code.trim().toUpperCase();
    }
    // Last resort: generate generic code
    console.warn(`⚠️ Product ${product.id} has no valid unit_code, generating fallback`);
    return `BYS${product.id}${Date.now().toString().slice(-6)}`.toUpperCase();
  };

  // Load products from API
  const loadProducts = async () => {
    try {
      setLoading(true);
      setIsProductsLoaded(false);
      
      const result = await getProducts({ perPage: 1000 });
      
      if (result.success && result.data?.products) {
        const mappedProducts = result.data.products.map((p) => {
          // ✅ IMPROVED: Get valid unit code dengan fallback
          const unitCode = getValidUnitCode(p);

          return {
            id: p.id,
            product_id: p.id,
            name: p.name || p.model || '',
            code: unitCode, // ✅ Pastikan selalu ada
            unit_code: unitCode, // ✅ Tambahkan field unit_code
            price: parseFloat(p.selling_price || p.sellingPrice || p.price || 0),
            color: p.color || '',
            size: p.size || '',
            production_code: p.production_code || p.code || '',
            stock: parseInt(p.stock) || 0,
            discount_price: p.discount_price || p.discountPrice || null,
            // Tambahkan field untuk QR scanner
            barcode: p.barcode || unitCode,
            qr_code: unitCode,
            // Tambahkan units array jika ada
            units: p.units || [],
          };
        });
        
        console.log('✓ Products loaded:', mappedProducts.length);
        console.log('✓ Sample product:', mappedProducts[0]); // Debug first product
        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts);
      } else {
        console.warn('No products found');
        Alert.alert('Warning', 'Tidak ada data produk yang tersedia');
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Gagal memuat data produk. Periksa koneksi internet.');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
      setIsProductsLoaded(true);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  // ✅ IMPROVED: Cart operations dengan validasi unit_code
  const addToCart = (product) => {
    if (!product) {
      Alert.alert('Error', 'Produk tidak valid');
      return;
    }

    // ✅ VALIDASI: Pastikan product memiliki unit_code
    const unitCode = product.code || product.unit_code || product.barcode;
    if (!unitCode || unitCode.trim() === '') {
      Alert.alert('Error', `Produk "${product.name}" tidak memiliki kode unit yang valid. Silakan refresh data produk.`);
      return;
    }

    const price = parseFloat(product.price) || 0;
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          product_id: product.id,
          name: product.name,
          code: unitCode.trim().toUpperCase(), // ✅ Simpan unit_code dengan uppercase
          unit_code: unitCode.trim().toUpperCase(), // ✅ Tambahkan field unit_code
          price: price,
          quantity: 1,
          discount_price: product.discount_price || null,
        },
      ]);
    }

    Alert.alert('Berhasil', `${product.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Price calculations
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (newPrice && parseFloat(newPrice) > 0) {
      const discount = subtotal - parseFloat(newPrice);
      return Math.max(0, discount);
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    if (newPrice && parseFloat(newPrice) > 0) {
      return parseFloat(newPrice);
    }
    return subtotal;
  };

  // ✅ IMPROVED: Checkout process dengan validasi lengkap
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong');
      return;
    }

    if (!customerData.payment_method) {
      Alert.alert('Error', 'Pilih metode pembayaran');
      return;
    }

    if (customerData.payment_method === 'debit' && !customerData.card_type) {
      Alert.alert('Error', 'Pilih jenis kartu debit');
      return;
    }

    // ✅ VALIDASI: Cek semua produk memiliki unit_code yang valid
    const invalidProducts = cart.filter(item => {
      const hasUnitCode = (item.code || item.unit_code) && (item.code || item.unit_code).trim() !== '';
      const hasProductId = item.product_id || item.id;
      if (!hasUnitCode) {
        console.error(`❌ Product ${item.name} missing unit_code:`, item);
      }
      if (!hasProductId) {
        console.error(`❌ Product ${item.name} missing product_id:`, item);
      }
      return !hasUnitCode || !hasProductId;
    });

    if (invalidProducts.length > 0) {
      const productNames = invalidProducts.map(p => p.name).join(', ');
      Alert.alert(
        'Error', 
        `Produk berikut tidak memiliki kode unit yang valid: ${productNames}.\n\nSilakan hapus dari keranjang dan tambahkan kembali, atau refresh data produk.`
      );
      return;
    }

    // ✅ VALIDASI: Validasi newPrice jika diisi
    if (newPrice && newPrice.trim() !== '') {
      const subtotal = calculateSubtotal();
      const newTotalValue = parseFloat(newPrice);
      
      if (isNaN(newTotalValue) || newTotalValue < 0) {
        Alert.alert('Error', 'Harga baru harus diisi dengan angka yang valid dan tidak boleh kurang dari 0.');
        return;
      }
      if (newTotalValue > subtotal) {
        Alert.alert('Error', `Harga baru (Rp ${newTotalValue.toLocaleString()}) tidak boleh melebihi subtotal (Rp ${subtotal.toLocaleString()}).`);
        return;
      }
    }

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const discountAmountValue = calculateDiscountAmount();
      const finalTotal = calculateTotal();

      // ✅ IMPROVED: Format payload sesuai dengan API backend
      const transactionData = {
        customerName: customerData.customer_name?.trim() || null,
        customerPhone: customerData.customer_phone?.trim() || null,
        customerEmail: null,
        paymentMethod: customerData.payment_method.trim(),
        cardType: customerData.payment_method === 'debit' ? customerData.card_type : null,
        overallNewPrice: newPrice && newPrice.trim() !== '' ? parseFloat(newPrice) : null,
        discountAmount: discountAmountValue, // ✅ REQUIRED by API
        products: cart.map((item) => {
          const productId = item.product_id || item.id;
          const unitCode = (item.unit_code || item.code || '').trim().toUpperCase();
          
          // ✅ Final validation sebelum mapping
          if (!productId) {
            throw new Error(`Produk "${item.name || 'Unknown'}" tidak memiliki ID produk yang valid`);
          }
          if (!unitCode || unitCode === '') {
            throw new Error(`Produk "${item.name || 'Unknown'}" tidak memiliki kode unit yang valid`);
          }
          
          console.log(`✓ Mapping product: ${item.name} (ID: ${productId}, Unit: ${unitCode})`);
          
          return {
            product_id: productId, // ✅ Kirim product_id untuk reference (meski backend tidak pakai)
            unit_code: unitCode, // ✅ REQUIRED: Backend pakai ini untuk cari produk
            quantity: parseInt(item.quantity) || 1,
            new_price: null, // Tidak support diskon per item (hanya overall discount)
          };
        }),
        notes: customerData.notes?.trim() || null,
      };

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 TRANSACTION PAYLOAD:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(transactionData, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let result;
      try {
        result = await createTransaction(transactionData);
      } catch (error) {
        console.error('❌ Error creating transaction:', error);
        const errorMessage = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
        Alert.alert('Error', errorMessage);
        setLoading(false);
        return;
      }

      if (result && result.success) {
        console.log('✅ Transaction successful:', result.data);
        
        // Reset semua state
        setCart([]);
        dispatchCustomer({ type: 'RESET' });
        setNewPrice('');
        
        Alert.alert(
          'Sukses', 
          'Transaksi berhasil dibuat!\n\nTransaksi akan muncul di halaman laporan dan dashboard akan diperbarui.',
          [
            { 
              text: 'Lihat Transaksi', 
              onPress: () => {
                navigation.navigate('MainApp', { screen: 'Transaksi' });
              }
            },
            { 
              text: 'OK', 
              onPress: () => {
                navigation.goBack();
              }
            },
          ]
        );
      } else {
        const errorMessage = result?.error || result?.message || 'Gagal membuat transaksi';
        console.error('❌ Transaction failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('❌ Error creating transaction (outer catch):', error);
      const errorMessage = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Scanner operations
  const openScanner = () => {
    console.log('[Scanner] Opening scanner...');
    
    if (loading) {
      Alert.alert('Tunggu', 'Data produk sedang dimuat. Silakan coba lagi dalam beberapa detik.');
      return;
    }
    
    if (!isProductsLoaded) {
      Alert.alert('Tunggu', 'Data produk sedang dimuat. Silakan coba lagi dalam beberapa detik.');
      return;
    }
    
    if (products.length === 0) {
      Alert.alert(
        'Tidak Ada Data',
        'Tidak ada produk yang tersedia untuk di-scan. Tambahkan produk terlebih dahulu.',
        [
          { text: 'Refresh Data', onPress: () => loadProducts() },
          { text: 'OK' }
        ]
      );
      return;
    }
    
    console.log('[Scanner] Opening scanner modal...');
    setShowScanner(true);
  };

  const handleScanSuccess = (cartItem) => {
    console.log('[Scanner] Scan success, cartItem:', cartItem);
    
    if (cartItem && cartItem.id) {
      // ✅ VALIDASI: Pastikan cartItem memiliki unit_code
      const unitCode = cartItem.code || cartItem.unit_code;
      if (!unitCode || unitCode.trim() === '') {
        Alert.alert('Error', 'Produk dari hasil scan tidak memiliki kode unit yang valid.');
        return;
      }

      const existingItem = cart.find((item) => item.id === cartItem.id);

      if (existingItem) {
        console.log('[Scanner] Product already in cart, increasing quantity');
        setCart(
          cart.map((item) =>
            item.id === cartItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        console.log('[Scanner] Adding new product to cart');
        // ✅ Pastikan cartItem memiliki unit_code sebelum ditambahkan
        const validCartItem = {
          ...cartItem,
          code: unitCode.trim().toUpperCase(),
          unit_code: unitCode.trim().toUpperCase(),
        };
        setCart([...cart, validCartItem]);
      }

      setTimeout(() => {
        Alert.alert('Berhasil', `${cartItem.name} ditambahkan ke keranjang dari hasil scan`);
      }, 300);
    } else {
      console.warn('[Scanner] Invalid cartItem:', cartItem);
      Alert.alert('Info', 'Hasil scan tidak cocok dengan produk yang tersedia');
    }
  };

  const handleScanError = (title = 'Error', message = 'Gagal melakukan scan') => {
    console.error('[Scanner] Scan error:', { title, message });
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