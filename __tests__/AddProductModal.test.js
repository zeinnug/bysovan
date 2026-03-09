// ============================================================
// WHITE BOX TESTING - AddProductModal.js (Logic Layer)
// Aplikasi: Toko Sepatu By Sovan
// File yang diuji: components/AddProductModal.js
// Strategi: Uji logika validasi & submit tanpa render UI
// ============================================================

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios', select: (o) => o.ios },
  StyleSheet: { create: (s) => s },
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
}));

jest.mock('@expo/vector-icons', () => ({ Octicons: 'Octicons' }));

const { Alert } = require('react-native');

// ============================================================
// Simulasi logika dari AddProductModal.js
// Dipindah ke fungsi murni agar bisa diuji tanpa render
// ============================================================

// Simulasi handleSubmitProduct() dari AddProductModal
const simulateHandleSubmit = async (formData, onSubmit) => {
  const { brand, model, sellingPrice, sizes } = formData;

  // [Baris 80-88] Validasi required fields
  if (!brand || !brand.trim()) {
    Alert.alert('Validasi', 'Brand wajib diisi');
    return { success: false, reason: 'brand_kosong' };
  }
  if (!model || !model.trim()) {
    Alert.alert('Validasi', 'Model wajib diisi');
    return { success: false, reason: 'model_kosong' };
  }
  if (!sellingPrice || !sellingPrice.trim()) {
    Alert.alert('Validasi', 'Harga Jual wajib diisi');
    return { success: false, reason: 'harga_kosong' };
  }

  // [Baris 91-94] Validasi ukuran dan stok
  const validSizes = sizes.filter(s => s.size.trim() && s.stock.trim());
  if (validSizes.length === 0) {
    Alert.alert('Validasi', 'Minimal harus ada 1 ukuran dan stok yang terisi');
    return { success: false, reason: 'sizes_kosong' };
  }

  // [Baris 97-100] Format sizes
  const formattedSizes = validSizes.map(s => ({
    size: s.size.trim(),
    stock: parseInt(s.stock) || 0,
  }));

  // [Baris 103-110] Prepare product data
  const productData = {
    brand: brand.trim(),
    model: model.trim(),
    color: formData.color ? formData.color.trim() : '',
    sizes: formattedSizes,
    sellingPrice: parseFloat(sellingPrice) || 0,
    discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
    description: formData.description ? formData.description.trim() : '',
  };

  try {
    const result = await onSubmit(productData);
    if (result && result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, reason: 'submit_gagal' };
  } catch (error) {
    return { success: false, reason: 'error', message: error.message };
  }
};

// Simulasi handleAddSize()
const simulateHandleAddSize = (sizes) => {
  return [...sizes, { id: Date.now(), size: '', stock: '' }];
};

// Simulasi handleRemoveSize()
const simulateHandleRemoveSize = (sizes, id) => {
  if (sizes.length <= 1) {
    Alert.alert('Info', 'Minimal harus ada 1 ukuran dan stok');
    return sizes;
  }
  return sizes.filter(s => s.id !== id);
};

// Simulasi handleUpdateSize()
const simulateHandleUpdateSize = (sizes, id, field, value) => {
  return sizes.map(s => s.id === id ? { ...s, [field]: value } : s);
};


// ============================================================
// TEST SUITE 1: handleSubmitProduct() — Validasi Field Wajib
// Jalur Logika:
//   [AM-V1] Brand kosong → Alert 'Brand wajib diisi'
//   [AM-V2] Model kosong → Alert 'Model wajib diisi'
//   [AM-V3] Harga Jual kosong → Alert 'Harga Jual wajib diisi'
//   [AM-V4] Sizes kosong → Alert 'Minimal harus ada 1 ukuran'
//   [AM-V5] Brand hanya spasi → dianggap kosong
// ============================================================

describe('handleSubmitProduct() - Validasi Field Wajib', () => {
  beforeEach(() => jest.clearAllMocks());

  const baseSizes = [{ id: 1, size: '41', stock: '5' }];

  test('[AM-V1] Harus Alert jika brand kosong', async () => {
    const res = await simulateHandleSubmit({
      brand: '', model: 'Air Max', sellingPrice: '500000', sizes: baseSizes,
    }, jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith('Validasi', 'Brand wajib diisi');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('brand_kosong');
  });

  test('[AM-V1b] Harus Alert jika brand hanya spasi', async () => {
    const res = await simulateHandleSubmit({
      brand: '   ', model: 'Air Max', sellingPrice: '500000', sizes: baseSizes,
    }, jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith('Validasi', 'Brand wajib diisi');
    expect(res.success).toBe(false);
  });

  test('[AM-V2] Harus Alert jika model kosong', async () => {
    const res = await simulateHandleSubmit({
      brand: 'Nike', model: '', sellingPrice: '500000', sizes: baseSizes,
    }, jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith('Validasi', 'Model wajib diisi');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('model_kosong');
  });

  test('[AM-V3] Harus Alert jika sellingPrice kosong', async () => {
    const res = await simulateHandleSubmit({
      brand: 'Nike', model: 'Air Max', sellingPrice: '', sizes: baseSizes,
    }, jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith('Validasi', 'Harga Jual wajib diisi');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('harga_kosong');
  });

  test('[AM-V4] Harus Alert jika semua sizes kosong', async () => {
    const res = await simulateHandleSubmit({
      brand: 'Nike', model: 'Air Max', sellingPrice: '500000',
      sizes: [{ id: 1, size: '', stock: '' }],
    }, jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith('Validasi', 'Minimal harus ada 1 ukuran dan stok yang terisi');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('sizes_kosong');
  });

  test('[AM-V4b] Harus Alert jika size terisi tapi stock kosong', async () => {
    const res = await simulateHandleSubmit({
      brand: 'Nike', model: 'Air Max', sellingPrice: '500000',
      sizes: [{ id: 1, size: '41', stock: '' }],
    }, jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith('Validasi', 'Minimal harus ada 1 ukuran dan stok yang terisi');
    expect(res.success).toBe(false);
  });
});


// ============================================================
// TEST SUITE 2: handleSubmitProduct() — Format & Submit Data
// Jalur Logika:
//   [AM-S1] Semua field valid → format dan kirim ke onSubmit
//   [AM-S2] discountPrice ada → parsing ke float
//   [AM-S3] discountPrice kosong → null
//   [AM-S4] stock string → parsing ke integer
//   [AM-S5] sellingPrice string → parsing ke float
//   [AM-S6] onSubmit sukses → return success: true
//   [AM-S7] onSubmit gagal → return success: false
//   [AM-S8] Multiple sizes valid → semua dikirim
// ============================================================

describe('handleSubmitProduct() - Format & Submit Data', () => {
  beforeEach(() => jest.clearAllMocks());

  const validForm = {
    brand: 'Nike',
    model: 'Air Max',
    color: 'Putih',
    sellingPrice: '500000',
    discountPrice: '450000',
    sizes: [{ id: 1, size: '41', stock: '5' }],
    description: 'Sepatu lari',
  };

  test('[AM-S1] Harus memanggil onSubmit dengan data yang sudah diformat', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: { id: 1 } });

    await simulateHandleSubmit(validForm, mockSubmit);

    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Nike',
      model: 'Air Max',
      color: 'Putih',
      sellingPrice: 500000,
      discountPrice: 450000,
    }));
  });

  test('[AM-S2] Harus parse discountPrice ke float', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: {} });

    await simulateHandleSubmit({ ...validForm, discountPrice: '450000.50' }, mockSubmit);

    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      discountPrice: 450000.50,
    }));
  });

  test('[AM-S3] discountPrice kosong harus jadi null', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: {} });

    await simulateHandleSubmit({ ...validForm, discountPrice: '' }, mockSubmit);

    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      discountPrice: null,
    }));
  });

  test('[AM-S4] Harus parse stock dari string ke integer', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: {} });

    await simulateHandleSubmit({
      ...validForm,
      sizes: [{ id: 1, size: '42', stock: '10' }],
    }, mockSubmit);

    const calledWith = mockSubmit.mock.calls[0][0];
    expect(calledWith.sizes[0].stock).toBe(10);
    expect(typeof calledWith.sizes[0].stock).toBe('number');
  });

  test('[AM-S5] Harus parse sellingPrice dari string ke float', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: {} });

    await simulateHandleSubmit({ ...validForm, sellingPrice: '750000' }, mockSubmit);

    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      sellingPrice: 750000,
    }));
  });

  test('[AM-S6] Harus return success: true jika onSubmit berhasil', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: { id: 5 } });

    const res = await simulateHandleSubmit(validForm, mockSubmit);

    expect(res.success).toBe(true);
    expect(res.data.id).toBe(5);
  });

  test('[AM-S7] Harus return success: false jika onSubmit return success: false', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: false });

    const res = await simulateHandleSubmit(validForm, mockSubmit);

    expect(res.success).toBe(false);
    expect(res.reason).toBe('submit_gagal');
  });

  test('[AM-S8] Harus mengirim semua sizes yang valid (multiple)', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: {} });

    await simulateHandleSubmit({
      ...validForm,
      sizes: [
        { id: 1, size: '40', stock: '3' },
        { id: 2, size: '41', stock: '5' },
        { id: 3, size: '', stock: '' }, // tidak valid → filter out
        { id: 4, size: '42', stock: '2' },
      ],
    }, mockSubmit);

    const calledWith = mockSubmit.mock.calls[0][0];
    expect(calledWith.sizes).toHaveLength(3);
    expect(calledWith.sizes.map(s => s.size)).toEqual(['40', '41', '42']);
  });

  test('[AM-S9] Harus trim whitespace dari brand dan model', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true, data: {} });

    await simulateHandleSubmit({ ...validForm, brand: '  Nike  ', model: '  Air Max  ' }, mockSubmit);

    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Nike',
      model: 'Air Max',
    }));
  });
});


// ============================================================
// TEST SUITE 3: handleAddSize() & handleRemoveSize()
// Jalur Logika:
//   [AM-A1] handleAddSize → tambah 1 item baru dengan size & stock kosong
//   [AM-R1] handleRemoveSize dengan sizes > 1 → hapus item dengan id yang benar
//   [AM-R2] handleRemoveSize dengan sizes = 1 → Alert, jangan hapus
// ============================================================

describe('handleAddSize() & handleRemoveSize()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('[AM-A1] handleAddSize harus menambah item baru dengan size dan stock kosong', () => {
    const initialSizes = [{ id: 1, size: '41', stock: '5' }];

    const result = simulateHandleAddSize(initialSizes);

    expect(result).toHaveLength(2);
    expect(result[1].size).toBe('');
    expect(result[1].stock).toBe('');
  });

  test('[AM-A2] handleAddSize tidak mengubah item yang sudah ada', () => {
    const initialSizes = [{ id: 1, size: '41', stock: '5' }];

    const result = simulateHandleAddSize(initialSizes);

    expect(result[0]).toEqual({ id: 1, size: '41', stock: '5' });
  });

  test('[AM-R1] handleRemoveSize harus menghapus item dengan id yang benar', () => {
    const sizes = [
      { id: 1, size: '40', stock: '3' },
      { id: 2, size: '41', stock: '5' },
      { id: 3, size: '42', stock: '2' },
    ];

    const result = simulateHandleRemoveSize(sizes, 2);

    expect(result).toHaveLength(2);
    expect(result.find(s => s.id === 2)).toBeUndefined();
  });

  test('[AM-R2] handleRemoveSize harus Alert dan tidak hapus jika hanya 1 item', () => {
    const sizes = [{ id: 1, size: '41', stock: '5' }];

    const result = simulateHandleRemoveSize(sizes, 1);

    expect(Alert.alert).toHaveBeenCalledWith('Info', 'Minimal harus ada 1 ukuran dan stok');
    expect(result).toHaveLength(1);
  });
});


// ============================================================
// TEST SUITE 4: handleUpdateSize()
// Jalur Logika:
//   [AM-U1] Update field 'size' pada id yang benar → berubah
//   [AM-U2] Update field 'stock' pada id yang benar → berubah
//   [AM-U3] Id tidak ditemukan → array tidak berubah
// ============================================================

describe('handleUpdateSize()', () => {

  const initialSizes = [
    { id: 1, size: '40', stock: '3' },
    { id: 2, size: '41', stock: '5' },
  ];

  test('[AM-U1] Harus mengupdate field size pada id yang benar', () => {
    const result = simulateHandleUpdateSize(initialSizes, 1, 'size', '42');

    expect(result[0].size).toBe('42');
    expect(result[1].size).toBe('41'); // tidak berubah
  });

  test('[AM-U2] Harus mengupdate field stock pada id yang benar', () => {
    const result = simulateHandleUpdateSize(initialSizes, 2, 'stock', '10');

    expect(result[1].stock).toBe('10');
    expect(result[0].stock).toBe('3'); // tidak berubah
  });

  test('[AM-U3] Array tidak berubah jika id tidak ditemukan', () => {
    const result = simulateHandleUpdateSize(initialSizes, 99, 'size', '45');

    expect(result).toEqual(initialSizes);
  });
});