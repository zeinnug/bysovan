// data/services/opname/stockOpnameService.js
// Stock Opname Service - Toko Sepatu By Sovan
// Hanya mengirim produk yang terscan ke server
// Scan model baru: tiap scan QR = +1 unit (jumlahScan), tidak ada preload produk

import apiClient, { formatError, formatResponse } from '../../api';
import { API_ENDPOINTS, PAGINATION } from '../../constants';
import { saveStockOpnameReport } from '../inventoryService';
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

// ==================== FETCH PRODUK DARI API (SAAT SCAN) ====================
// Dipanggil setiap kali QR discan — tidak ada preload daftar produk

export const getProdukByQRDariAPI = async (rawQR) => {
  try {
    const { productId, unitCode } = parseQRCode(rawQR);
    const kode = unitCode || rawQR.trim();

    console.log(`[stockOpnameService] Scan QR → productId: ${productId}, unitCode: ${kode}`);

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

    const raw     = result.data;
    const product = raw.product ?? raw;
    const unit    = raw.unit ?? raw;

    return {
      success: true,
      data: {
        id:         product.id ?? raw.product_id ?? productId,
        unitCode:   unit.unit_code ?? raw.unit_code ?? kode,
        namaProduk: product.name ?? product.model ?? raw.name ?? '-',
        merek:      product.brand ?? raw.brand ?? '-',
        ukuran:     unit.size ?? product.size ?? raw.size ?? '-',
        warna:      product.color ?? raw.color ?? '-',
        stokSistem: parseInt(unit.stock ?? product.stock ?? raw.stock) || 0,
        harga:      parseFloat(product.selling_price ?? raw.selling_price) || 0,
      },
    };
  } catch (error) {
    console.error('[stockOpnameService] getProdukByQRDariAPI error:', error);
    return { success: false, message: formatError(error).message };
  }
};

// ==================== SIMPAN LAPORAN ====================
// daftarScan: array of { id, unitCode, namaProduk, merek, ukuran, warna, stokSistem, harga, jumlahScan }
// Hanya produk terscan yang masuk — tidak ada konsep "belum scan"

export const simpanLaporanOpname = async (daftarScan) => {
  try {
    if (!Array.isArray(daftarScan) || daftarScan.length === 0) {
      return { success: false, message: 'Tidak ada produk yang discan.' };
    }

    // ── 1. HITUNG RINGKASAN
    const totalJenis   = daftarScan.length;
    const totalUnit    = daftarScan.reduce((acc, i) => acc + i.jumlahScan, 0);
    const sesuaiArr    = daftarScan.filter((i) => i.jumlahScan === i.stokSistem);
    const selisihArr   = daftarScan.filter((i) => i.jumlahScan !== i.stokSistem);

    const ringkasan = {
      totalJenis,
      totalUnit,
      totalSesuai:  sesuaiArr.length,
      totalSelisih: selisihArr.length,
    };

    // ── 2. BUILD REPORTS (format kompatibel dengan server)
    //    physical_stock = jumlahScan, system_stock = stokSistem, difference = delta
    const reports = daftarScan.map((item) => ({
      product_id:     item.id,
      group_key:      item.groupKey,
      name:           item.namaProduk,
      size:           item.ukuran,
      color:          item.warna,
      system_stock:   item.stokSistem,
      physical_stock: item.jumlahScan,
      difference:     item.jumlahScan - item.stokSistem,
      scanned_units:  item.scannedUnitCodes?.length ?? item.jumlahScan,
    }));

    console.log('[stockOpnameService] Reports dikirim:', reports.length, 'item');

    // ── 3. OBJEK CACHE
    const laporanCache = {
      id:      `opname_${Date.now()}`,
      tanggal: new Date().toISOString(),
      ringkasan,
      reports,
      detailSelisih: selisihArr.map((i) => ({
        groupKey:   i.groupKey,
        namaProduk: i.namaProduk,
        ukuran:     i.ukuran,
        warna:      i.warna,
        stokSistem: i.stokSistem,
        jumlahScan: i.jumlahScan,
        delta:      i.jumlahScan - i.stokSistem,
      })),
      disimpanServer: false,
    };

    // ── 4. KIRIM KE SERVER
    let serverSuccess = false;
    let serverMessage = '';

    try {
      const result = await saveStockOpnameReport(reports);

      if (result.serverEndpointMissing) {
        serverSuccess = false;
        serverMessage = 'Server belum mendukung penyimpanan stock opname.';
        console.warn('[stockOpnameService] Server endpoint tidak tersedia.');
      } else {
        serverSuccess = !!result.success;
        serverMessage = result.message || 'Laporan berhasil disimpan ke server.';
        if (serverSuccess) {
          laporanCache.disimpanServer = true;
        }
      }

      console.log('[stockOpnameService] Hasil simpan:', serverMessage);
    } catch (serverErr) {
      const errMsg = serverErr?.message || String(serverErr);
      serverMessage = errMsg || 'Tidak dapat terhubung ke server.';
      console.warn('[stockOpnameService] Gagal kirim ke server:', serverMessage);
    }

    // ── 5. SIMPAN CACHE LOKAL (selalu simpan)
    const cacheSaved = await saveLaporanToCache(laporanCache);

    if (!cacheSaved && !serverSuccess) {
      return {
        success: false,
        message: 'Gagal menyimpan laporan ke server maupun perangkat.',
      };
    }

    return {
      success: true,
      serverSuccess,
      message: serverSuccess
        ? serverMessage
        : `Laporan tersimpan di perangkat.${serverMessage ? ' (' + serverMessage + ')' : ''}`,
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
    sumber: 'cache',
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

// ==================== DEFAULT EXPORT ====================

const stockOpnameService = {
  getProdukByQRDariAPI,
  simpanLaporanOpname,
  getLaporanOpname,
  hapusSemuaLaporan,
  hapusLaporanByIndex,
  getLaporanDariCache,
  hapusSemuaLaporanDariCache,
  hapusLaporanCacheByIndex,
};

export default stockOpnameService;