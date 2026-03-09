// ============================================================
// WHITE BOX TESTING - inventoryService.js
// Aplikasi: Toko Sepatu By Sovan
// File yang diuji: data/services/inventoryService.js
// ============================================================

import apiClient, { formatError, formatResponse } from '../data/api';

jest.mock('../data/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  formatError: jest.fn((error) => ({
    success: false,
    message: error?.message || 'Terjadi kesalahan',
  })),
  formatResponse: jest.fn((response) => ({
    success: true,
    data: response.data?.data || response.data,
    message: response.data?.message || 'Berhasil',
  })),
}));

jest.mock('../data/constants', () => ({
  API_ENDPOINTS: {
    PRODUCTS: '/products',
    PRODUCT_BY_ID: (id) => `/products/${id}`,
    PRODUCT_UNIT: (productId, unitCode) => `/products/${productId}/units/${unitCode}`,
    STOCK_OPNAME: '/stock-opname',
    UPDATE_PHYSICAL_STOCK: (id) => `/products/${id}/physical-stock`,
    SAVE_STOCK_REPORT: '/stock-opname/save',
    DELETE_STOCK_REPORT: (index) => `/stock-opname/${index}`,
    DELETE_ALL_REPORTS: '/stock-opname',
    ADD_PRODUCT_BY_QR: (unitCode) => `/transactions/add-product/${unitCode}`,
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PER_PAGE: 9999,
  },
}));

import {
  getProducts,
  getInventoryStatistics,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductUnit,
  getProductByQRCode,
  updatePhysicalStock,
  saveStockOpnameReport,
  deleteStockOpnameReport,
  deleteAllStockOpnameReports,
  addProductByQR,
  searchProductByCode,
} from '../data/services/inventoryService';

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
  jest.clearAllMocks();
  formatError.mockImplementation((error) => ({
    success: false,
    message: error?.message || 'Terjadi kesalahan',
  }));
  formatResponse.mockImplementation((response) => ({
    success: true,
    data: response.data?.data || response.data,
    message: response.data?.message || 'Berhasil',
  }));
});

// ============================================================
// TEST SUITE 1: getProducts()
// Jalur Logika:
//   [GP1] Tanpa params → gunakan nilai default
//   [GP2] Dengan params custom → gunakan nilai dari params
//   [GP3] API error → throw formatError
// ============================================================

describe('getProducts()', () => {

  test('[GP1] Harus menggunakan nilai default jika params kosong', async () => {
    apiClient.get.mockResolvedValue({ data: { products: [] } });

    await getProducts();

    expect(apiClient.get).toHaveBeenCalledWith('/products', {
      params: expect.objectContaining({
        page: 1,
        per_page: 9999,
        search: '',
        order_by: 'created_at',
        sort: 'desc',
        no_cache: false,
      }),
    });
  });

  test('[GP2] Harus menggunakan nilai params yang dikirim', async () => {
    apiClient.get.mockResolvedValue({ data: { products: [] } });

    await getProducts({ page: 2, perPage: 10, search: 'adidas', orderBy: 'name', sort: 'asc' });

    expect(apiClient.get).toHaveBeenCalledWith('/products', {
      params: expect.objectContaining({
        page: 2,
        per_page: 10,
        search: 'adidas',
        order_by: 'name',
        sort: 'asc',
      }),
    });
  });

  test('[GP3] Harus throw formatError jika API gagal', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));

    await expect(getProducts()).rejects.toMatchObject({ message: 'Network Error' });
  });
});


// ============================================================
// TEST SUITE 2: getInventoryStatistics()
// Jalur Logika:
//   [GS1] Produk dengan units array → hitung dari units.stock
//   [GS2] Produk tanpa units → hitung dari product.stock
//   [GS3] Low stock threshold = 5 → produk dengan stok ≤ 5
//   [GS4] API sukses tapi products null → throw error
//   [GS5] API error → throw formatError
// ============================================================

describe('getInventoryStatistics()', () => {

  const mockProductsWithUnits = [
    { id: 1, units: [{ stock: '3' }, { stock: '2' }] },  // total 5, low stock
    { id: 2, units: [{ stock: '10' }, { stock: '8' }] }, // total 18
    { id: 3, units: [{ stock: '1' }] },                  // total 1, low stock
  ];

  const mockProductsWithoutUnits = [
    { id: 1, stock: '3' },   // low stock
    { id: 2, stock: '10' },
    { id: 3, stock: '5' },   // low stock (= 5)
  ];

  test('[GS1] Harus menghitung totalStock dari units jika units ada', async () => {
    formatResponse.mockReturnValue({
      success: true,
      data: { products: mockProductsWithUnits },
    });
    apiClient.get.mockResolvedValue({ data: {} });

    const result = await getInventoryStatistics();

    expect(result.success).toBe(true);
    expect(result.data.totalProducts).toBe(3);
    expect(result.data.totalStock).toBe(24); // 5 + 18 + 1
  });

  test('[GS2] Harus menghitung totalStock dari product.stock jika tidak ada units', async () => {
    formatResponse.mockReturnValue({
      success: true,
      data: { products: mockProductsWithoutUnits },
    });
    apiClient.get.mockResolvedValue({ data: {} });

    const result = await getInventoryStatistics();

    expect(result.data.totalStock).toBe(18); // 3 + 10 + 5
  });

  test('[GS3] Harus menghitung lowStockProducts dengan threshold 5', async () => {
    formatResponse.mockReturnValue({
      success: true,
      data: { products: mockProductsWithoutUnits },
    });
    apiClient.get.mockResolvedValue({ data: {} });

    const result = await getInventoryStatistics();

    // stok 3 (≤5) dan stok 5 (≤5) = 2 produk
    expect(result.data.lowStockProducts).toBe(2);
    expect(result.data.lowStockThreshold).toBe(5);
  });

  test('[GS4] Harus throw jika products null', async () => {
    formatResponse.mockReturnValue({ success: true, data: {} });
    apiClient.get.mockResolvedValue({ data: {} });

    await expect(getInventoryStatistics()).rejects.toBeDefined();
  });

  test('[GS5] Harus throw formatError jika API error', async () => {
    apiClient.get.mockRejectedValue(new Error('Server Error'));

    await expect(getInventoryStatistics()).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 3: getProductById()
// Jalur Logika:
//   [GB1] Sukses → return formatResponse
//   [GB2] API error → throw formatError
// ============================================================

describe('getProductById()', () => {

  test('[GB1] Harus memanggil endpoint yang benar dan return data', async () => {
    const mockProduct = { id: 1, brand: 'Adidas', model: 'Superstar' };
    apiClient.get.mockResolvedValue({ data: mockProduct });

    await getProductById(1);

    expect(apiClient.get).toHaveBeenCalledWith('/products/1');
  });

  test('[GB2] Harus throw formatError jika API gagal', async () => {
    apiClient.get.mockRejectedValue(new Error('Not Found'));

    await expect(getProductById(99)).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 4: createProduct()
// Jalur Logika:
//   [CP1] Data lengkap dengan discountPrice → payload lengkap
//   [CP2] discountPrice null → payload discount_price = null
//   [CP3] sellingPrice string → parsing ke float
//   [CP4] API error → throw formatError
// ============================================================

describe('createProduct()', () => {

  const baseProductData = {
    brand: 'Nike',
    model: 'Air Max',
    color: 'Putih',
    sizes: [{ size: '42', stock: 5 }],
    sellingPrice: '500000',
    discountPrice: '450000',
  };

  test('[CP1] Harus mengirim payload lengkap termasuk discount_price', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } });

    await createProduct(baseProductData);

    expect(apiClient.post).toHaveBeenCalledWith('/products', expect.objectContaining({
      brand: 'Nike',
      model: 'Air Max',
      color: 'Putih',
      selling_price: 500000,
      discount_price: 450000,
    }));
  });

  test('[CP2] Harus mengirim discount_price = null jika discountPrice kosong', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } });

    await createProduct({ ...baseProductData, discountPrice: null });

    expect(apiClient.post).toHaveBeenCalledWith('/products', expect.objectContaining({
      discount_price: null,
    }));
  });

  test('[CP3] Harus parse sellingPrice string ke float', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 1 } });

    await createProduct({ ...baseProductData, sellingPrice: '750000.50' });

    expect(apiClient.post).toHaveBeenCalledWith('/products', expect.objectContaining({
      selling_price: 750000.50,
    }));
  });

  test('[CP4] Harus throw formatError jika API gagal', async () => {
    apiClient.post.mockRejectedValue(new Error('Validation Error'));

    await expect(createProduct(baseProductData)).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 5: updateProduct()
// Jalur Logika:
//   [UP1] Update stok saja (≤3 keys dengan stock) → skip API, return success
//   [UP2] Update lengkap → panggil API PUT
//   [UP3] API error pada update lengkap → throw formatError
// ============================================================

describe('updateProduct()', () => {

  test('[UP1] Harus skip API jika hanya update stock (≤3 keys)', async () => {
    const result = await updateProduct(1, { stock: 10 });

    expect(apiClient.put).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toContain('skipped');
  });

  test('[UP1b] Harus skip API untuk update stock + size_id (≤3 keys)', async () => {
    const result = await updateProduct(1, { stock: 5, size_id: 2 });

    expect(apiClient.put).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test('[UP2] Harus memanggil PUT API untuk update produk lengkap', async () => {
    apiClient.put.mockResolvedValue({ data: { id: 1 } });

    await updateProduct(1, {
      brand: 'Nike', model: 'Air Force', color: 'Hitam',
      sizes: [], sellingPrice: '600000', discountPrice: null,
    });

    expect(apiClient.put).toHaveBeenCalledWith('/products/1', expect.objectContaining({
      brand: 'Nike',
      model: 'Air Force',
    }));
  });

  test('[UP3] Harus throw formatError jika update lengkap gagal', async () => {
    apiClient.put.mockRejectedValue(new Error('Server Error'));

    await expect(updateProduct(1, {
      brand: 'Nike', model: 'Air Force', color: 'Hitam',
      sizes: [], sellingPrice: '600000',
    })).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 6: deleteProduct()
// Jalur Logika:
//   [DP1] Sukses → return formatResponse
//   [DP2] API error → throw formatError
// ============================================================

describe('deleteProduct()', () => {

  test('[DP1] Harus memanggil DELETE endpoint yang benar', async () => {
    apiClient.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    await deleteProduct(5);

    expect(apiClient.delete).toHaveBeenCalledWith('/products/5');
  });

  test('[DP2] Harus throw formatError jika API gagal', async () => {
    apiClient.delete.mockRejectedValue(new Error('Not Found'));

    await expect(deleteProduct(99)).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 7: addProductByQR()
// Jalur Logika:
//   [QR1] unitCode kosong → throw 'Unit code tidak boleh kosong'
//   [QR2] unitCode string spasi → throw error
//   [QR3] unitCode valid → panggil API, return data
// ============================================================

describe('addProductByQR()', () => {

  test('[QR1] Harus throw jika unitCode null', async () => {
    await expect(addProductByQR(null)).rejects.toMatchObject({
      message: 'Unit code tidak boleh kosong',
    });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  test('[QR2] Harus throw jika unitCode string kosong', async () => {
    await expect(addProductByQR('')).rejects.toMatchObject({
      message: 'Unit code tidak boleh kosong',
    });
  });

  test('[QR2b] Harus throw jika unitCode hanya spasi', async () => {
    await expect(addProductByQR('   ')).rejects.toBeDefined();
  });

  test('[QR3] Harus memanggil endpoint yang benar dengan unitCode valid', async () => {
    apiClient.get.mockResolvedValue({ data: { product: { id: 1 } } });

    await addProductByQR('UNIT-ABC123');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/transactions/add-product/UNIT-ABC123'
    );
  });
});


// ============================================================
// TEST SUITE 8: searchProductByCode()
// Jalur Logika:
//   [SC1] code kosong → throw 'Kode produk tidak boleh kosong'
//   [SC2] code valid → panggil API GET dengan params search
//   [SC3] API error → throw formatError
// ============================================================

describe('searchProductByCode()', () => {

  test('[SC1] Harus throw jika code null', async () => {
    await expect(searchProductByCode(null)).rejects.toMatchObject({
      message: 'Kode produk tidak boleh kosong',
    });
  });

  test('[SC1b] Harus throw jika code string kosong', async () => {
    await expect(searchProductByCode('')).rejects.toMatchObject({
      message: 'Kode produk tidak boleh kosong',
    });
  });

  test('[SC2] Harus memanggil API dengan params search yang benar', async () => {
    apiClient.get.mockResolvedValue({ data: { products: [] } });

    await searchProductByCode('ADIDAS-001');

    expect(apiClient.get).toHaveBeenCalledWith('/products', {
      params: expect.objectContaining({ search: 'ADIDAS-001', per_page: 100 }),
    });
  });

  test('[SC3] Harus throw formatError jika API gagal', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));

    await expect(searchProductByCode('KODE-123')).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 9: updatePhysicalStock()
// Jalur Logika:
//   [PS1] Sukses → panggil POST endpoint yang benar dengan payload
//   [PS2] API error → throw formatError
// ============================================================

describe('updatePhysicalStock()', () => {

  test('[PS1] Harus memanggil POST endpoint dengan id dan physicalStock yang benar', async () => {
    apiClient.post.mockResolvedValue({ data: { message: 'Updated' } });

    await updatePhysicalStock(10, 25);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/products/10/physical-stock',
      { physical_stock: 25 }
    );
  });

  test('[PS2] Harus throw formatError jika API gagal', async () => {
    apiClient.post.mockRejectedValue(new Error('Server Error'));

    await expect(updatePhysicalStock(10, 25)).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 10: saveStockOpnameReport()
// Jalur Logika:
//   [SR1] Sukses → panggil POST dengan reports array
//   [SR2] API error → throw formatError
// ============================================================

describe('saveStockOpnameReport()', () => {

  const mockReports = [
    { product_id: 1, unit_code: 'UNIT-001', physical_stock: 5, system_stock: 8 },
    { product_id: 2, unit_code: 'UNIT-002', physical_stock: 3, system_stock: 3 },
  ];

  test('[SR1] Harus memanggil POST endpoint dengan reports yang benar', async () => {
    apiClient.post.mockResolvedValue({ data: { message: 'Saved' } });

    await saveStockOpnameReport(mockReports);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/stock-opname/save',
      { reports: mockReports }
    );
  });

  test('[SR2] Harus throw formatError jika API gagal', async () => {
    apiClient.post.mockRejectedValue(new Error('Server Error'));

    await expect(saveStockOpnameReport(mockReports)).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 11: deleteStockOpnameReport() & deleteAllStockOpnameReports()
// Jalur Logika:
//   [DR1] deleteStockOpnameReport → panggil DELETE /stock-opname/{index}
//   [DR2] deleteAllStockOpnameReports → panggil DELETE /stock-opname
// ============================================================

describe('deleteStockOpnameReport() & deleteAllStockOpnameReports()', () => {

  test('[DR1] deleteStockOpnameReport harus panggil endpoint dengan index yang benar', async () => {
    apiClient.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    await deleteStockOpnameReport(3);

    expect(apiClient.delete).toHaveBeenCalledWith('/stock-opname/3');
  });

  test('[DR2] deleteAllStockOpnameReports harus panggil DELETE /stock-opname', async () => {
    apiClient.delete.mockResolvedValue({ data: { message: 'All deleted' } });

    await deleteAllStockOpnameReports();

    expect(apiClient.delete).toHaveBeenCalledWith('/stock-opname');
  });

  test('[DR3] deleteStockOpnameReport harus throw jika API gagal', async () => {
    apiClient.delete.mockRejectedValue(new Error('Server Error'));

    await expect(deleteStockOpnameReport(1)).rejects.toBeDefined();
  });
});


// ============================================================
// TEST SUITE 12: getProductByQRCode()
// Jalur Logika:
//   [QC1] Produk ditemukan dengan matching unitCode → return data lengkap
//   [QC2] Produk ditemukan tanpa matching unit → fallback ke unit pertama
//   [QC3] Produk tidak ditemukan → throw 'Produk tidak ditemukan'
//   [QC4] API error → throw formatError
// ============================================================

describe('getProductByQRCode()', () => {

  test('[QC1] Harus return data produk dengan unit yang cocok', async () => {
    const mockProduct = {
      id: 1, brand: 'Adidas', model: 'Superstar', color: 'Putih',
      selling_price: '500000',
      units: [
        { unitCode: 'UNIT-001', size: '41', stock: 5 },
        { unitCode: 'UNIT-002', size: '42', stock: 3 },
      ],
    };

    formatResponse.mockReturnValue({
      success: true,
      data: { products: [mockProduct] },
    });
    apiClient.get.mockResolvedValue({ data: {} });

    const result = await getProductByQRCode('UNIT-001');

    expect(result.success).toBe(true);
    expect(result.data.unitCode).toBe('UNIT-001');
    expect(result.data.brand).toBe('Adidas');
  });

  test('[QC2] Harus fallback ke unit pertama jika tidak ada yang cocok', async () => {
    const mockProduct = {
      id: 1, brand: 'Nike', model: 'Air Max', color: 'Hitam',
      selling_price: '600000',
      units: [{ unitCode: 'UNIT-XYZ', size: '40', stock: 2 }],
    };

    formatResponse.mockReturnValue({
      success: true,
      data: { products: [mockProduct] },
    });
    apiClient.get.mockResolvedValue({ data: {} });

    const result = await getProductByQRCode('KODE-TIDAK-ADA');

    expect(result.success).toBe(true);
    expect(result.data.unitCode).toBe('UNIT-XYZ');
  });

  test('[QC3] Harus throw jika produk tidak ditemukan', async () => {
    formatResponse.mockReturnValue({
      success: true,
      data: { products: [] },
    });
    apiClient.get.mockResolvedValue({ data: {} });

    await expect(getProductByQRCode('KODE-TIDAK-ADA')).rejects.toBeDefined();
  });

  test('[QC4] Harus throw formatError jika API error', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));

    await expect(getProductByQRCode('UNIT-001')).rejects.toBeDefined();
  });
});