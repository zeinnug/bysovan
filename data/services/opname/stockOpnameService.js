// data/services/opname/stockOpnameService.js
// Stock Opname Service - Toko Sepatu By Sovan
// Hanya mengirim produk yang terscan (QR / input manual) ke server

import apiClient, { formatError, formatResponse } from '../../api';
import { API_ENDPOINTS, PAGINATION } from '../../constants';
import { updatePhysicalStock, saveStockOpnameReport } from '../inventoryService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== CACHE KEY ====================

const CACHE_KEY_LAPORAN = 'stockOpname:laporan';

// ==================== HELPER: PARSE QR CODE ====================

const parseQRCode = (raw) => {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const inventoryIdx = parts.indexOf('inventory');
    if (inventoryIdx !== -1 && parts[inventoryIdx + 2] === 'unit') {
      return {
        productId: parts[inventoryIdx + 1],
        unitCode: parts[inventoryIdx + 3],
      };
    }
    return { productId: null, unitCode: parts[parts.length - 1] };
  } catch {
    return { productId: null, unitCode: raw.trim() };
  }
};

// ==================== CACHE HELPERS ====================

export const getLaporanDariCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_LAPORAN);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[stockOpnameService] Gagal membaca cache:', err);
    return [];
  }
};

const saveLaporanToCache = async (laporanBaru) => {
  const MAX_CACHE_ENTRIES = 30;
  try {
    const existing = await getLaporanDariCache();
    const updated = [laporanBaru, ...existing].slice(0, MAX_CACHE_ENTRIES);

    try {
      await AsyncStorage.setItem(CACHE_KEY_LAPORAN, JSON.stringify(updated));
    } catch (storageErr) {
      // Fallback: simpan versi ringkas saja jika payload terlalu besar
      console.warn('[stockOpnameService] Cache terlalu besar, simpan ringkasan saja:', storageErr);
      const compact = updated.map((u) => ({
        id: u.id,
        tanggal: u.tanggal,
        ringkasan: u.ringkasan,
        disimpanServer: u.disimpanServer,
      }));
      await AsyncStorage.setItem(CACHE_KEY_LAPORAN, JSON.stringify(compact));
    }

    return true;
  } catch (err) {
    console.warn('[stockOpnameService] Gagal menulis cache:', err);
    return false;
  }
};

export const hapusSemuaLaporanDariCache = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY_LAPORAN);
    return true;
  } catch (err) {
    console.warn('[stockOpnameService] Gagal menghapus cache:', err);
    return false;
  }
};

export const hapusLaporanCacheByIndex = async (index) => {
  try {
    const existing = await getLaporanDariCache();
    if (index < 0 || index >= existing.length) return false;
    existing.splice(index, 1);
    await AsyncStorage.setItem(CACHE_KEY_LAPORAN, JSON.stringify(existing));
    return true;
  } catch (err) {
    console.warn('[stockOpnameService] Gagal menghapus laporan dari cache:', err);
    return false;
  }
};

// ==================== LOAD SEMUA PRODUK ====================

export const loadSemuaProduk = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS, {
      params: {
        page: PAGINATION.DEFAULT_PAGE,
        per_page: 9999,
        no_cache: true,
      },
    });

    const result = formatResponse(response);

    if (!result.success || !result.data?.products) {
      return { success: false, data: [], message: 'Gagal memuat data produk.' };
    }

    const flatItems = [];

    // Struktur API:
    // - Stok & ukuran ada di level PRODUK (p.stock, p.size)
    // - Units hanya berisi daftar QR code: { unit_code, qr_code, is_active }
    // → Tiap unit = 1 item scan, stok & ukuran diambil dari produk induknya

    for (const product of result.data.products) {
      const stokSistem = parseInt(product.stock) || 0;
      const namaProduk = product.name ?? product.model ?? '-';
      const merek      = product.brand ?? '-';
      const ukuran     = product.size ?? '-';
      const warna      = product.color ?? '-';
      const harga      = parseFloat(product.selling_price) || 0;

      if (Array.isArray(product.units) && product.units.length > 0) {
        for (const unit of product.units) {
          // skip unit nonaktif jika field is_active ada
          if (unit.is_active === false) continue;
          flatItems.push({
            id:         product.id,
            unitCode:   unit.unit_code ?? `${product.id}-unknown`,
            qrCode:     unit.qr_code ?? unit.unit_code,
            namaProduk,
            merek,
            ukuran,
            warna,
            stokSistem,
            harga,
            statusScan: 'belum',
            stokFisik:  null,
          });
        }
      } else {
        // Produk tanpa units → gunakan product.id sebagai unitCode
        flatItems.push({
          id:         product.id,
          unitCode:   String(product.id),
          qrCode:     null,
          namaProduk,
          merek,
          ukuran,
          warna,
          stokSistem,
          harga,
          statusScan: 'belum',
          stokFisik:  null,
        });
      }
    }

    return { success: true, data: flatItems, total: flatItems.length };
  } catch (error) {
    console.error('[stockOpnameService] loadSemuaProduk error:', error);
    return { success: false, data: [], message: formatError(error).message };
  }
};

// ==================== QR SCAN ====================

export const cocokkanQRDenganDaftar = (rawQR, daftarProduk) => {
  if (!rawQR || rawQR.trim() === '') {
    return { success: false, message: 'Kode QR tidak valid.' };
  }

  const { productId, unitCode } = parseQRCode(rawQR);
  const kode = unitCode || rawQR.trim();

  const found = daftarProduk.find(
    (p) => p.unitCode === kode || String(p.id) === String(productId)
  );

  if (!found) {
    return {
      success: false,
      unitCode: kode,
      message: `Produk dengan kode "${kode}" tidak ditemukan.`,
    };
  }

  if (found.statusScan === 'terscan') {
    return {
      success: false,
      unitCode: kode,
      sudahScan: true,
      item: found,
      message: `"${found.namaProduk}" (${found.ukuran}) sudah dipindai sebelumnya.`,
    };
  }

  return { success: true, unitCode: kode, item: found };
};

// ==================== FALLBACK: FETCH DARI API ====================

export const getProdukByQRDariAPI = async (rawQR) => {
  try {
    const { productId, unitCode } = parseQRCode(rawQR);
    const kode = unitCode || rawQR.trim();

    console.log(`[stockOpnameService] Fallback API → productId: ${productId}, unitCode: ${kode}`);

    let response;
    if (productId) {
      response = await apiClient.get(API_ENDPOINTS.PRODUCT_UNIT(productId, kode));
    } else {
      response = await apiClient.get(API_ENDPOINTS.ADD_PRODUCT_BY_QR(kode));
    }

    const result = formatResponse(response);
    if (!result.success) {
      return { success: false, message: 'Produk tidak ditemukan di database.' };
    }

    const raw = result.data;
    const product = raw.product ?? raw;
    const unit = raw.unit ?? raw;

    return {
      success: true,
      data: {
        id: product.id ?? raw.product_id ?? productId,
        unitCode: unit.unit_code ?? raw.unit_code ?? kode,
        namaProduk: product.name ?? product.model ?? raw.name ?? '-',
        merek: product.brand ?? raw.brand ?? '-',
        ukuran: unit.size ?? product.size ?? raw.size ?? '-',
        warna: product.color ?? raw.color ?? '-',
        stokSistem: parseInt(unit.stock ?? product.stock ?? raw.stock) || 0,
        harga: parseFloat(product.selling_price ?? raw.selling_price) || 0,
        statusScan: 'belum',
        stokFisik: null,
        dariAPI: true,
      },
    };
  } catch (error) {
    console.error('[stockOpnameService] getProdukByQRDariAPI error:', error);
    return { success: false, message: formatError(error).message };
  }
};

// ==================== SIMPAN LAPORAN ====================

export const simpanLaporanOpname = async (semuaProduk) => {
  try {
    // ── 1. PISAHKAN terscan vs belum
    const terscanArr = semuaProduk.filter((i) => i.statusScan === 'terscan');
    const belumArr   = semuaProduk.filter((i) => i.statusScan === 'belum');
    const sesuaiArr  = terscanArr.filter((i) => i.stokFisik === i.stokSistem);
    const selisihArr = terscanArr.filter((i) => i.stokFisik !== i.stokSistem);

    // ── 2. RINGKASAN
    const ringkasan = {
      total:          semuaProduk.length,
      totalTerscan:   terscanArr.length,
      totalBelumScan: belumArr.length,
      totalSesuai:    sesuaiArr.length,
      totalSelisih:   selisihArr.length,
    };

    // ── 3. BUILD REPORTS
    const reports = terscanArr.map((item) => ({
      product_id:     item.id,
      unit_code:      item.unitCode,
      name:           item.namaProduk,
      size:           item.ukuran,
      color:          item.warna,
      system_stock:   item.stokSistem,
      physical_stock: item.stokFisik ?? 0,
      difference:     (item.stokFisik ?? 0) - item.stokSistem,
    }));

    console.log('[stockOpnameService] Reports yang akan dikirim:', reports.length, 'item (hanya terscan)');

    // ── 4. OBJEK CACHE
    const laporanCache = {
      id:      `opname_${Date.now()}`,
      tanggal: new Date().toISOString(),
      ringkasan,
      reports,
      detailSelisih: selisihArr.map((i) => ({
        unitCode:   i.unitCode,
        namaProduk: i.namaProduk,
        ukuran:     i.ukuran,
        warna:      i.warna,
        stokSistem: i.stokSistem,
        stokFisik:  i.stokFisik,
        delta:      (i.stokFisik ?? 0) - i.stokSistem,
      })),
      detailBelumScan: belumArr.map((i) => ({
        unitCode:   i.unitCode,
        namaProduk: i.namaProduk,
        ukuran:     i.ukuran,
        warna:      i.warna,
        stokSistem: i.stokSistem,
      })),
      disimpanServer: false,
    };

    // ── 5. KIRIM KE SERVER (selaras dengan flow web: update stok fisik + simpan laporan)
    let serverSuccess = false;
    let serverMessage = '';

    if (terscanArr.length === 0) {
      serverMessage = 'Tidak ada produk yang discan — laporan disimpan di perangkat.';
      console.warn('[stockOpnameService] Tidak ada item terscan, skip kirim server.');
    } else {
      try {
        // 5a. Update stok fisik per produk (best-effort, meniru /inventory/{id}/physical-stock di web)
        for (const item of terscanArr) {
          try {
            await updatePhysicalStock(item.id, item.stokFisik ?? 0);
          } catch (err) {
            const detail = formatError(err);
            console.warn(
              `[stockOpnameService] Gagal update stok fisik produk ${item.id}:`,
              detail.message || err.message
            );
          }
        }

        // 5b. Simpan laporan opname (meniru /inventory/inventory/save-report di web)
        const result = await saveStockOpnameReport(reports);

        serverSuccess = !!result.success;
        serverMessage = result.message || 'Laporan berhasil disimpan ke server.';
        if (serverSuccess) {
          laporanCache.disimpanServer = true;
        }

        console.log('[stockOpnameService] Laporan Stock Opname disimpan ke server:', serverMessage);
      } catch (serverErr) {
        const errDetail = formatError(serverErr);
        serverMessage   = errDetail.statusCode
          ? `Server error ${errDetail.statusCode}: ${errDetail.message}`
          : errDetail.message || 'Tidak dapat terhubung ke server.';
        console.warn('[stockOpnameService] Gagal kirim ke server:', serverMessage);
      }
    }

    // ── 6. SIMPAN CACHE LOKAL
    const cacheSaved = await saveLaporanToCache(laporanCache);

    if (!cacheSaved && !serverSuccess) {
      return {
        success: false,
        message: 'Gagal menyimpan laporan ke server maupun perangkat.',
      };
    }

    return {
      success:       true,
      serverSuccess,
      message:       serverSuccess
        ? serverMessage
        : `${serverMessage} Laporan tetap tersimpan di perangkat.`,
      ringkasan,
      laporanId: laporanCache.id,
    };
  } catch (error) {
    console.error('[stockOpnameService] simpanLaporanOpname error:', error);
    return { success: false, message: formatError(error).message };
  }
};

// ==================== AMBIL RIWAYAT LAPORAN ====================

export const getLaporanOpname = async () => {
  const cacheData = await getLaporanDariCache();
  return {
    success: true,
    sumber:  'cache',
    data: {
      reports:    cacheData,
      totalStock: 0,
    },
  };
};

// ==================== HAPUS LAPORAN ====================

export const hapusSemuaLaporan = async () => {
  await hapusSemuaLaporanDariCache();
  try {
    const response = await apiClient.delete(API_ENDPOINTS.DELETE_ALL_REPORTS);
    return formatResponse(response);
  } catch (error) {
    return { success: true, message: 'Cache lokal dihapus (server tidak terjangkau).' };
  }
};

export const hapusLaporanByIndex = async (index) => {
  await hapusLaporanCacheByIndex(index);
  try {
    const response = await apiClient.delete(API_ENDPOINTS.DELETE_STOCK_REPORT(index));
    return formatResponse(response);
  } catch (error) {
    return { success: true, message: 'Cache lokal dihapus (server tidak terjangkau).' };
  }
};

// ==================== DEBUG: TEST ENDPOINT ====================

export const testEndpoint = async () => {
  const endpoints = [
    { method: 'PUT', url: '/products/stock-opname' },
    { method: 'POST', url: '/products/stock-opname' },
    { method: 'PUT', url: '/stock-opname' },
    { method: 'POST', url: '/stock-opname' },
    { method: 'PUT', url: '/products/opname' },
    { method: 'POST', url: '/products/opname' },
  ];

  // Gunakan data dummy statis untuk test
  const payload = {
    reports: [{
      product_id: 2136,
      unit_code: 'UNIT-2MDSIDJZ',
      name: 'TEST',
      size: '-',
      color: '-',
      system_stock: 9,
      physical_stock: 9,
      difference: 0,
    }]
  };

  console.log('=== MULAI TEST ENDPOINT ===');
  
  for (const ep of endpoints) {
    try {
      const fn = ep.method === 'PUT' ? apiClient.put : apiClient.post;
      // Perhatikan: endpoint + payload
      const res = await fn(ep.url, payload);
      
      console.log(`[TEST] ✅ ${ep.method} ${ep.url} → Status: ${res.status}`);
      if (res.data) console.log('       Response:', JSON.stringify(res.data));

    } catch (e) {
      const status = e.response?.status ?? 'NO_RESPONSE';
      const msg = e.response?.data?.message ?? e.message;
      console.log(`[TEST] ❌ ${ep.method} ${ep.url} → ${status}: ${msg}`);
    }
  }
  
  console.log('=== SELESAI TEST ENDPOINT ===');
};

// ==================== DEFAULT EXPORT ====================

const stockOpnameService = {
  loadSemuaProduk,
  cocokkanQRDenganDaftar,
  getProdukByQRDariAPI,
  simpanLaporanOpname,
  getLaporanOpname,
  hapusSemuaLaporan,
  hapusLaporanByIndex,
  getLaporanDariCache,
  hapusSemuaLaporanDariCache,
  hapusLaporanCacheByIndex,
  testEndpoint, // <--- Ditambahkan ke sini
};

export default stockOpnameService;