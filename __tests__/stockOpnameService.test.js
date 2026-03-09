// ============================================================
// WHITE BOX TESTING - stockOpnameService.js
// Aplikasi: Toko Sepatu By Sovan
// File yang diuji: data/services/opname/stockOpnameService.js
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../data/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  formatError: jest.fn((e) => ({ success: false, message: e?.message || 'Error' })),
  formatResponse: jest.fn((r) => ({ success: true, data: r.data?.data || r.data })),
}));

jest.mock('../data/constants', () => ({
  API_ENDPOINTS: {
    PRODUCTS: '/products',
    PRODUCT_UNIT: (pid, uc) => `/products/${pid}/units/${uc}`,
    STOCK_OPNAME: '/stock-opname',
    SAVE_STOCK_REPORT: '/stock-opname/save',
    DELETE_STOCK_REPORT: (i) => `/stock-opname/${i}`,
    DELETE_ALL_REPORTS: '/stock-opname',
    ADD_PRODUCT_BY_QR: (uc) => `/transactions/add-product/${uc}`,
  },
  PAGINATION: { DEFAULT_PAGE: 1, DEFAULT_PER_PAGE: 9999 },
}));

jest.mock('../data/services/inventoryService', () => ({
  updatePhysicalStock: jest.fn(),
  saveStockOpnameReport: jest.fn(),
}));

import {
  getLaporanDariCache,
  hapusSemuaLaporanDariCache,
  hapusLaporanCacheByIndex,
  cocokkanQRDenganDaftar,
  simpanLaporanOpname,
  getLaporanOpname,
  hapusSemuaLaporan,
  hapusLaporanByIndex,
} from '../data/services/opname/stockOpnameService';

import { saveStockOpnameReport } from '../data/services/inventoryService';
import apiClient from '../data/api';

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue(null);
  AsyncStorage.removeItem.mockResolvedValue(null);
});

// ============================================================
// TEST SUITE 1: getLaporanDariCache()
// Jalur Logika:
//   [LC1] Ada data di cache → parse dan return array
//   [LC2] Cache kosong (null) → return []
//   [LC3] AsyncStorage error → return []
// ============================================================

describe('getLaporanDariCache()', () => {

  test('[LC1] Harus return array laporan jika ada data di cache', async () => {
    const mockData = [{ id: 'opname_1', tanggal: '2025-01-01' }];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

    const result = await getLaporanDariCache();

    expect(result).toEqual(mockData);
    expect(result).toHaveLength(1);
  });

  test('[LC2] Harus return array kosong jika cache null', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const result = await getLaporanDariCache();

    expect(result).toEqual([]);
  });

  test('[LC3] Harus return array kosong jika AsyncStorage error', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    const result = await getLaporanDariCache();

    expect(result).toEqual([]);
  });
});


// ============================================================
// TEST SUITE 2: hapusSemuaLaporanDariCache()
// Jalur Logika:
//   [HC1] Sukses → panggil removeItem dengan key yang benar
//   [HC2] Error → return false
// ============================================================

describe('hapusSemuaLaporanDariCache()', () => {

  test('[HC1] Harus memanggil removeItem dan return true', async () => {
    const result = await hapusSemuaLaporanDariCache();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('stockOpname:laporan');
    expect(result).toBe(true);
  });

  test('[HC2] Harus return false jika AsyncStorage error', async () => {
    AsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

    const result = await hapusSemuaLaporanDariCache();

    expect(result).toBe(false);
  });
});


// ============================================================
// TEST SUITE 3: hapusLaporanCacheByIndex()
// Jalur Logika:
//   [HI1] Index valid → hapus item, simpan ulang cache
//   [HI2] Index < 0 → return false
//   [HI3] Index ≥ panjang array → return false
//   [HI4] AsyncStorage error → return false
// ============================================================

describe('hapusLaporanCacheByIndex()', () => {

  const mockCache = [
    { id: 'opname_1' },
    { id: 'opname_2' },
    { id: 'opname_3' },
  ];

  test('[HI1] Harus menghapus item pada index yang benar', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCache));

    const result = await hapusLaporanCacheByIndex(1);

    expect(result).toBe(true);
    const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
    expect(savedData).toHaveLength(2);
    expect(savedData.find(i => i.id === 'opname_2')).toBeUndefined();
  });

  test('[HI2] Harus return false jika index < 0', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCache));

    const result = await hapusLaporanCacheByIndex(-1);

    expect(result).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('[HI3] Harus return false jika index ≥ panjang array', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCache));

    const result = await hapusLaporanCacheByIndex(5);

    expect(result).toBe(false);
  });

  test('[HI4] Harus return false jika AsyncStorage error', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    const result = await hapusLaporanCacheByIndex(0);

    expect(result).toBe(false);
  });
});


// ============================================================
// TEST SUITE 4: cocokkanQRDenganDaftar()
// Jalur Logika:
//   [CQ1] QR kosong → return success: false
//   [CQ2] Cocok berdasarkan unitCode → return item
//   [CQ3] Tidak cocok unitCode tapi cocok productId (belum scan) → return item
//   [CQ4] Item sudah scan → return success: false dengan sudahScan: true
//   [CQ5] Tidak ditemukan sama sekali → return success: false
//   [CQ6] QR berformat URL → parse productId dan unitCode
// ============================================================

describe('cocokkanQRDenganDaftar()', () => {

  const daftarProduk = [
    { id: 1, unitCode: 'UNIT-001', namaProduk: 'Nike Air', ukuran: '41', statusScan: 'belum' },
    { id: 2, unitCode: 'UNIT-002', namaProduk: 'Adidas Neo', ukuran: '42', statusScan: 'terscan', stokFisik: 3 },
    { id: 3, unitCode: 'UNIT-003', namaProduk: 'Skechers', ukuran: '40', statusScan: 'belum' },
  ];

  test('[CQ1] Harus return success: false jika QR kosong', () => {
    const result = cocokkanQRDenganDaftar('', daftarProduk);
    expect(result.success).toBe(false);
    expect(result.message).toContain('tidak valid');
  });

  test('[CQ1b] Harus return success: false jika QR null', () => {
    const result = cocokkanQRDenganDaftar(null, daftarProduk);
    expect(result.success).toBe(false);
  });

  test('[CQ2] Harus return item jika unitCode cocok', () => {
    const result = cocokkanQRDenganDaftar('UNIT-001', daftarProduk);
    expect(result.success).toBe(true);
    expect(result.item.namaProduk).toBe('Nike Air');
    expect(result.unitCode).toBe('UNIT-001');
  });

  test('[CQ4] Harus return sudahScan: true jika item sudah terscan', () => {
    const result = cocokkanQRDenganDaftar('UNIT-002', daftarProduk);
    expect(result.success).toBe(false);
    expect(result.sudahScan).toBe(true);
    expect(result.item.namaProduk).toBe('Adidas Neo');
  });

  test('[CQ5] Harus return success: false jika tidak ditemukan', () => {
    const result = cocokkanQRDenganDaftar('UNIT-TIDAK-ADA', daftarProduk);
    expect(result.success).toBe(false);
    expect(result.message).toContain('tidak ditemukan');
  });

  test('[CQ6] Harus parse URL QR dan cocokkan berdasarkan unitCode', () => {
    const urlQR = 'https://app.com/inventory/1/unit/UNIT-001';
    const result = cocokkanQRDenganDaftar(urlQR, daftarProduk);
    expect(result.success).toBe(true);
    expect(result.item.namaProduk).toBe('Nike Air');
  });

  test('[CQ6b] Harus cocokkan productId dari URL jika unitCode tidak ditemukan', () => {
    const urlQR = 'https://app.com/inventory/3/unit/UNIT-XYZ';
    const result = cocokkanQRDenganDaftar(urlQR, daftarProduk);
    // productId=3, unitCode=UNIT-XYZ tidak ada, fallback ke productId match
    expect(result.success).toBe(true);
    expect(result.item.namaProduk).toBe('Skechers');
  });
});


// ============================================================
// TEST SUITE 5: simpanLaporanOpname()
// Jalur Logika:
//   [SL1] Tidak ada item terscan → skip server, simpan cache lokal
//   [SL2] Ada terscan, server sukses → disimpanServer: true
//   [SL3] Ada terscan, server gagal → simpan cache saja
//   [SL4] Hitung ringkasan dengan benar
//   [SL5] Cache gagal DAN server gagal → return success: false
// ============================================================

describe('simpanLaporanOpname()', () => {

  const produkTerscan = [
    { id: 1, unitCode: 'U-001', namaProduk: 'Nike', ukuran: '41', warna: 'Hitam', stokSistem: 5, stokFisik: 5, statusScan: 'terscan' },
    { id: 2, unitCode: 'U-002', namaProduk: 'Adidas', ukuran: '42', warna: 'Putih', stokSistem: 3, stokFisik: 2, statusScan: 'terscan' },
  ];

  const produkBelumScan = [
    { id: 3, unitCode: 'U-003', namaProduk: 'Skechers', ukuran: '40', warna: 'Abu', stokSistem: 8, stokFisik: null, statusScan: 'belum' },
  ];

  const semuaProduk = [...produkTerscan, ...produkBelumScan];

  test('[SL1] Harus skip kirim server jika tidak ada item terscan', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const result = await simpanLaporanOpname(produkBelumScan);

    expect(saveStockOpnameReport).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.serverSuccess).toBe(false);
  });

  test('[SL2] Harus set serverSuccess: true jika server berhasil', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    saveStockOpnameReport.mockResolvedValue({ success: true, message: 'Tersimpan' });

    const result = await simpanLaporanOpname(semuaProduk);

    expect(saveStockOpnameReport).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.serverSuccess).toBe(true);
  });

  test('[SL3] Harus tetap sukses (dari cache) jika server gagal', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    saveStockOpnameReport.mockRejectedValue(new Error('Server Error'));

    const result = await simpanLaporanOpname(semuaProduk);

    expect(result.success).toBe(true);
    expect(result.serverSuccess).toBe(false);
    expect(result.message).toContain('perangkat');
  });

  test('[SL4] Harus menghitung ringkasan dengan benar', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    saveStockOpnameReport.mockResolvedValue({ success: true });

    const result = await simpanLaporanOpname(semuaProduk);

    expect(result.ringkasan.total).toBe(3);
    expect(result.ringkasan.totalTerscan).toBe(2);
    expect(result.ringkasan.totalBelumScan).toBe(1);
    expect(result.ringkasan.totalSesuai).toBe(1);   // stokFisik === stokSistem
    expect(result.ringkasan.totalSelisih).toBe(1);  // stokFisik !== stokSistem
  });

  test('[SL5] Harus return success: false jika cache dan server keduanya gagal', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
    AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
    saveStockOpnameReport.mockRejectedValue(new Error('Server error'));

    const result = await simpanLaporanOpname(semuaProduk);

    expect(result.success).toBe(false);
  });
});


// ============================================================
// TEST SUITE 6: getLaporanOpname()
// Jalur Logika:
//   [GL1] Ada data di cache → return data
//   [GL2] Cache kosong → return array kosong
// ============================================================

describe('getLaporanOpname()', () => {

  test('[GL1] Harus return data dari cache', async () => {
    const mockCache = [{ id: 'opname_1', tanggal: '2025-01-01' }];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCache));

    const result = await getLaporanOpname();

    expect(result.success).toBe(true);
    expect(result.sumber).toBe('cache');
    expect(result.data.reports).toEqual(mockCache);
  });

  test('[GL2] Harus return array kosong jika tidak ada cache', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const result = await getLaporanOpname();

    expect(result.success).toBe(true);
    expect(result.data.reports).toEqual([]);
  });
});


// ============================================================
// TEST SUITE 7: hapusSemuaLaporan() & hapusLaporanByIndex()
// Jalur Logika:
//   [HL1] hapusSemuaLaporan: hapus cache + panggil DELETE API
//   [HL2] hapusSemuaLaporan: API gagal → tetap return success (cache terhapus)
//   [HL3] hapusLaporanByIndex: hapus cache by index + panggil DELETE API
// ============================================================

describe('hapusSemuaLaporan() & hapusLaporanByIndex()', () => {

  test('[HL1] hapusSemuaLaporan harus hapus cache dan panggil DELETE API', async () => {
    apiClient.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    await hapusSemuaLaporan();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('stockOpname:laporan');
    expect(apiClient.delete).toHaveBeenCalledWith('/stock-opname');
  });

  test('[HL2] hapusSemuaLaporan harus tetap sukses jika API tidak terjangkau', async () => {
    apiClient.delete.mockRejectedValue(new Error('Server Error'));

    const result = await hapusSemuaLaporan();

    expect(result.success).toBe(true);
    expect(result.message).toContain('Cache lokal dihapus');
  });

  test('[HL3] hapusLaporanByIndex harus hapus cache dan panggil DELETE API dengan index', async () => {
    const mockCache = [{ id: 'opname_1' }, { id: 'opname_2' }];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCache));
    apiClient.delete.mockResolvedValue({ data: { message: 'Deleted' } });

    await hapusLaporanByIndex(0);

    expect(apiClient.delete).toHaveBeenCalledWith('/stock-opname/0');
  });

  test('[HL4] hapusLaporanByIndex harus return success jika API gagal', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([{ id: 'opname_1' }]));
    apiClient.delete.mockRejectedValue(new Error('Server Error'));

    const result = await hapusLaporanByIndex(0);

    expect(result.success).toBe(true);
  });
});