// keduitan/sold.js - Business Logic untuk Transaction (UPDATED - No Discount %)
import { useState, useEffect, useReducer } from 'react';
import { Alert } from 'react-native';
import { createTransaction } from './transactions';
import { getProducts, updateProduct } from '../data/services/inventoryService';

const customerReducer = (state, action) => {
  if (action.type === 'UPDATE_FIELD') {
    return { ...state, [action.field]: action.value };
  }
  if (action.type === 'RESET') {
    return { 
      customer_name: '', 
      phone_number: '', 
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
  const [newPrice, setNewPrice] = useState(''); // Hanya newPrice, no discount %
  const [customerData, dispatchCustomer] = useReducer(customerReducer, {
    customer_name: '',
    phone_number: '',
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

  // Hitung diskon otomatis dari selisih subtotal dan harga baru
  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    
    if (newPrice && parseFloat(newPrice) > 0) {
      const newPriceValue = parseFloat(newPrice);
      // Diskon = Subtotal - Harga Baru (tidak boleh negatif)
      return Math.max(0, subtotal - newPriceValue);
    }
    
    return 0;
  };

  // Total = Harga Baru (jika ada), atau Subtotal (jika tidak ada diskon)
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

    if (!customerData.payment_method) {
      Alert.alert('Error', 'Pilih metode pembayaran');
      return;
    }

    // Validasi card_type jika payment method adalah debit
    if (customerData.payment_method === 'debit' && !customerData.card_type) {
      Alert.alert('Error', 'Pilih jenis kartu debit');
      return;
    }

    setLoading(true);

    try {
      const discountAmountValue = calculateDiscountAmount();

      const invalidProducts = cart.filter(item => !item.code || item.code.trim() === '');
      if (invalidProducts.length > 0) {
        Alert.alert('Error', 'Beberapa produk tidak memiliki kode. Silakan refresh data produk.');
        setLoading(false);
        return;
      }

      const transactionData = {
        customer_name: customerData.customer_name?.trim() || null,
        customer_phone: customerData.phone_number?.trim() || null,
        customer_email: null,
        payment_method: customerData.payment_method.toLowerCase(),
        card_type: customerData.card_type || null,
        discount_amount: discountAmountValue, // Diskon dalam rupiah (WAJIB, minimal 0)
        products: cart.map((item) => ({
          unit_code: item.code.trim(),
          quantity: parseInt(item.quantity) || 1,
          discount_price: null,
        })),
        notes: customerData.notes?.trim() || null,
      };

      console.log('Transaction data:', JSON.stringify(transactionData, null, 2));

      const result = await createTransaction(transactionData);

      if (result.success) {
        // Update stock produk
        try {
          for (const item of cart) {
            const product = products.find(p => p.id === item.product_id || p.id === item.id);
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - (parseInt(item.quantity) || 1));
              console.log(`Updating product ${product.id} stock from ${product.stock} to ${newStock}`);
              
              await updateProduct(product.id, {
                ...product,
                stock: newStock,
              });
            }
          }
        } catch (stockError) {
          console.error('Warning: Failed to update inventory stock:', stockError);
        }

        Alert.alert('Sukses', 'Transaksi berhasil dibuat', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        
        // Reset form
        setCart([]);
        dispatchCustomer({ type: 'RESET' });
        setNewPrice('');
      } else {
        Alert.alert('Error', result.error || 'Gagal membuat transaksi');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', error.message || 'Gagal membuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  // Scanner operations
  const openScanner = () => {
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
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowScanner(true);
  };

  const handleScanSuccess = (cartItem) => {
    if (cartItem && cartItem.id) {
      const existingItem = cart.find((item) => item.id === cartItem.id);

      if (existingItem) {
        setCart(
          cart.map((item) =>
            item.id === cartItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        setCart([...cart, cartItem]);
      }

      setTimeout(() => {
        Alert.alert('Berhasil', `${cartItem.name} ditambahkan ke keranjang dari hasil scan`);
      }, 300);
    } else {
      Alert.alert('Info', 'Hasil scan tidak cocok dengan produk yang tersedia');
    }
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
    
    // Functions
    loadProducts,
    handlePrevious,
    handleNext,
    addToCart,
    removeFromCart,
    updateQuantity,
    calculateSubtotal,
    calculateDiscountAmount, // Export untuk ditampilkan di UI
    calculateTotal,
    handleCheckout,
    openScanner,
    handleScanSuccess,
    handleScanError,
  };
};