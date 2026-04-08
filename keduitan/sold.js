// keduitan/sold.js - Business Logic untuk Transaction (FIXED)
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

  // Load products from API
  const loadProducts = async () => {
    try {
      setLoading(true);
      setIsProductsLoaded(false);
      
      const result = await getProducts({ perPage: 1000 });
      
      if (result.success && result.data?.products) {
        const mappedProducts = result.data.products.map((p) => {
          let unitCode = '';
          if (p.units && p.units.length > 0 && p.units[0].unitCode) {
            unitCode = p.units[0].unitCode;
          } else if (p.barcode) {
            unitCode = p.barcode;
          } else if (p.code) {
            unitCode = p.code;
          } else {
            unitCode = `BYS${p.id}${Date.now().toString().slice(-6)}`;
          }

          return {
            id: p.id,
            product_id: p.id,
            name: p.name || p.model || '',
            code: unitCode,
            price: parseFloat(p.selling_price || p.sellingPrice || p.price || 0),
            color: p.color || '',
            size: p.size || '',
            production_code: p.production_code || p.code || '',
            stock: parseInt(p.stock) || 0,
            // Tambahkan field untuk QR scanner
            barcode: p.barcode || unitCode,
            unit_code: unitCode,
            qr_code: unitCode,
            // Tambahkan units array jika ada
            units: p.units || [],
          };
        });
        
        console.log('✓ Products loaded:', mappedProducts.length);
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

  // Cart operations
  const addToCart = (product) => {
    if (!product) {
      Alert.alert('Error', 'Produk tidak valid');
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
          code: product.code,
          price: price,
          quantity: 1,
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

  // FIXED: Added calculateDiscountAmount function
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

  // Checkout process
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong');
      return;
    }

    // Customer name is optional (sesuai dengan UI yang menampilkan "opsional")
    // if (!customerData.customer_name || !customerData.customer_name.trim()) {
    //   Alert.alert('Error', 'Nama pelanggan harus diisi');
    //   return;
    // }

    if (!customerData.payment_method) {
      Alert.alert('Error', 'Pilih metode pembayaran');
      return;
    }

    // FIXED: Validasi card_type jika payment method adalah debit
    if (customerData.payment_method === 'debit' && !customerData.card_type) {
      Alert.alert('Error', 'Pilih jenis kartu debit');
      return;
    }

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const discountAmountValue = calculateDiscountAmount();
      const finalTotal = calculateTotal();

      // FIXED: Validasi produk memiliki code
      const invalidProducts = cart.filter(item => !item.code || item.code.trim() === '');
      if (invalidProducts.length > 0) {
        Alert.alert('Error', 'Beberapa produk tidak memiliki kode. Silakan refresh data produk.');
        setLoading(false);
        return;
      }

      // FIXED: Format data sesuai dengan requirement API
      // FIXED: Format sesuai dengan transactionService.js (snake_case)
      // FIXED: Customer name is optional - use null if empty
      const transactionData = {
        customerName: customerData.customer_name?.trim() || null,
        customerPhone: customerData.customer_phone?.trim() || null,
        customerEmail: null,
        paymentMethod: customerData.payment_method.trim(),
        cardType: customerData.payment_method === 'debit' ? customerData.card_type : null,
        discountAmount: discountAmountValue,
        products: cart.map((item) => ({
          unitCode: item.code.trim(),
          quantity: parseInt(item.quantity) || 1,
          discountPrice: null,
        })),
        notes: customerData.notes?.trim() || null,
      };

      console.log('Transaction data:', JSON.stringify(transactionData, null, 2));

      let result;
      try {
        result = await createTransaction(transactionData);
      } catch (error) {
        // Handle error yang di-throw oleh createTransaction
        console.error('Error creating transaction (caught):', error);
        const errorMessage = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
        Alert.alert('Error', errorMessage);
        setLoading(false);
        return;
      }

      // Check if result has success property (from transactionService)
      if (result && result.success) {
        // FIXED: Stock update - simplified karena API limitation
        console.log('[Transaction] Transaction successful, stock will be updated by backend');
        
        // Reset semua state sebelum navigasi
        setCart([]);
        dispatchCustomer({ type: 'RESET' });
        setNewPrice('');
        
        // Show success alert dengan opsi untuk melihat transaksi
        Alert.alert(
          'Sukses', 
          'Transaksi berhasil dibuat!\n\nTransaksi akan muncul di halaman laporan dan dashboard akan diperbarui.',
          [
            { 
              text: 'Lihat Transaksi', 
              onPress: () => {
                // Navigate ke MainApp dengan tab Transaksi untuk melihat transaksi hari ini
                // TransactionScreen akan auto-refresh karena menggunakan useFocusEffect
                navigation.navigate('MainApp', { screen: 'Transaksi' });
              }
            },
            { 
              text: 'OK', 
              onPress: () => {
                // Kembali ke halaman sebelumnya (biasanya TransactionScreen atau HomeScreen)
                navigation.goBack();
              }
            },
          ]
        );
      } else {
        // Handle error response dari API
        const errorMessage = result?.error || result?.message || 'Gagal membuat transaksi';
        console.error('Transaction failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error creating transaction (outer catch):', error);
      const errorMessage = error.message || error.response?.data?.message || 'Gagal membuat transaksi';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Scanner operations
  const openScanner = () => {
    console.log('[Scanner] Opening scanner...');
    console.log('[Scanner] isProductsLoaded:', isProductsLoaded);
    console.log('[Scanner] products.length:', products.length);
    console.log('[Scanner] loading:', loading);
    
    if (loading) {
      Alert.alert(
        'Tunggu',
        'Data produk sedang dimuat. Silakan coba lagi dalam beberapa detik.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!isProductsLoaded) {
      Alert.alert(
        'Tunggu',
        'Data produk sedang dimuat. Silakan coba lagi dalam beberapa detik.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (products.length === 0) {
      Alert.alert(
        'Tidak Ada Data',
        'Tidak ada produk yang tersedia untuk di-scan. Tambahkan produk terlebih dahulu.',
        [
          { 
            text: 'Refresh Data', 
            onPress: () => {
              loadProducts();
            }
          },
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
        setCart([...cart, cartItem]);
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
    calculateDiscountAmount, // FIXED: Exported function
    calculateTotal,
    handleCheckout,
    openScanner,
    handleScanSuccess,
    handleScanError,
  };
};