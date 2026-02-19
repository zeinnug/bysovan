// pages/Stockopnamescreen.js
// Stock Opname Screen - Toko Sepatu By Sovan
// Alur: Load semua produk → Scan fisik satu per satu → Lihat progress → Simpan laporan
// Color Palette: Jet #292929 | Davy's Gray #585757 | Linen #F5ECE4 | Pumpkin #FC6A0A | Golden Gate #E74504

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, ScrollView, Modal, TextInput,
  SafeAreaView, StatusBar, Animated, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Octicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import {
  loadSemuaProduk,
  cocokkanQRDenganDaftar,
  getProdukByQRDariAPI,
  simpanLaporanOpname,
} from '../data/services/opname/stockOpnameService';

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const C = {
  jet: '#292929',
  davyGray: '#585757',
  linen: '#F5ECE4',
  pumpkin: '#FC6A0A',
  goldenGate: '#E74504',
  white: '#FFFFFF',
  divider: '#E0D5C9',
  successGreen: '#1A7F4B',
  successBg: '#EBF8F1',
  warnBg: '#FFF5F0',
  warnYellow: '#F59E0B',
  belumBg: '#F3F4F6',
};

// ─── Mode: 'idle' | 'loading' | 'scanning' | 'review' | 'laporan' ────────────
export default function StockOpnameScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState('idle');

  // Daftar SEMUA produk dari server (acuan)
  const [daftarProduk, setDaftarProduk] = useState([]);
  const [loadingProduk, setLoadingProduk] = useState(false);

  // State scan
  const [isScanning, setIsScanning] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastScanItem, setLastScanItem] = useState(null); // item terakhir yang berhasil discan

  // Filter tabel review
  const [filterStatus, setFilterStatus] = useState('semua'); // 'semua'|'terscan'|'belum'|'selisih'

  // Simpan laporan
  const [savingLaporan, setSavingLaporan] = useState(false);
  const [laporanRingkasan, setLaporanRingkasan] = useState(null);

  // Modal input stok fisik
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inputStok, setInputStok] = useState('');

  // Animasi scan line
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (mode === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [mode]);

  // ── Hitung progress ──────────────────────────────────────────────────────────
  const totalProduk = daftarProduk.length;
  const terscan = daftarProduk.filter((p) => p.statusScan === 'terscan').length;
  const belumScan = totalProduk - terscan;
  const persenProgress = totalProduk > 0 ? Math.round((terscan / totalProduk) * 100) : 0;

  // ── STEP 1: Load semua produk dari server ────────────────────────────────────
  const handleMulaiOpname = async () => {
    setLoadingProduk(true);
    setMode('loading');

    const result = await loadSemuaProduk();
    setLoadingProduk(false);

    if (!result.success || result.data.length === 0) {
      Alert.alert('Gagal Memuat Data', result.message || 'Tidak ada produk ditemukan.');
      setMode('idle');
      return;
    }

    setDaftarProduk(result.data);
    setMode('scanning');
  };

  // ── STEP 2: Izin kamera ──────────────────────────────────────────────────────
  const handleMulaiScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Izin Kamera', 'Akses kamera diperlukan untuk memindai QR Code.');
        return;
      }
    }
    setIsScanning(false);
    setErrorMsg('');
    setLastScanItem(null);
  };

  // ── STEP 3: Handle QR dipindai ───────────────────────────────────────────────
  const handleBarcodeScanned = async ({ data: rawQR }) => {
    if (isScanning || loadingItem) return;
    setIsScanning(true);
    setErrorMsg('');
    setLastScanItem(null);

    // Coba cocokkan dengan daftar lokal dulu
    const cocok = cocokkanQRDenganDaftar(rawQR, daftarProduk);

    if (cocok.sudahScan) {
      setErrorMsg(`"${cocok.item.namaProduk}" (${cocok.item.ukuran}) sudah dipindai.`);
      setTimeout(() => { setErrorMsg(''); setIsScanning(false); }, 2500);
      return;
    }

    if (!cocok.success) {
      // Tidak ada di daftar lokal → coba API fallback
      setLoadingItem(true);
      const apiResult = await getProdukByQRDariAPI(rawQR);
      setLoadingItem(false);

      if (!apiResult.success) {
        setErrorMsg(apiResult.message || 'Produk tidak ditemukan.');
        setTimeout(() => { setErrorMsg(''); setIsScanning(false); }, 2500);
        return;
      }

      // Produk ditemukan dari API → tambahkan ke daftar
      const newItem = { ...apiResult.data };
      setDaftarProduk((prev) => [...prev, newItem]);
      setSelectedItem(newItem);
      setInputStok('');
      setModalVisible(true);
      return;
    }

    // Ditemukan di daftar lokal → buka modal input stok fisik
    setSelectedItem(cocok.item);
    setInputStok('');
    setModalVisible(true);
  };

  // ── Simpan stok fisik dari modal ─────────────────────────────────────────────
  const handleSimpanStok = () => {
    const angka = parseInt(inputStok, 10);
    if (isNaN(angka) || angka < 0) {
      Alert.alert('Input Tidak Valid', 'Masukkan angka stok fisik yang benar (≥ 0).');
      return;
    }

    setDaftarProduk((prev) =>
      prev.map((item) =>
        item.unitCode === selectedItem.unitCode
          ? { ...item, statusScan: 'terscan', stokFisik: angka }
          : item
      )
    );

    setLastScanItem({ ...selectedItem, stokFisik: angka });
    setModalVisible(false);
    setSelectedItem(null);
    setIsScanning(false);
  };

  const handleBatalModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setIsScanning(false);
  };

  // ── Edit stok dari tabel review ──────────────────────────────────────────────
  const handleEditStok = (item) => {
    setSelectedItem(item);
    setInputStok(item.stokFisik !== null ? String(item.stokFisik) : '');
    setModalVisible(true);
  };

  // ── Selesai scan → review tabel ──────────────────────────────────────────────
  const handleSelesaiScan = () => {
    if (terscan === 0) {
      Alert.alert('Belum Ada Scan', 'Scan minimal 1 produk terlebih dahulu.');
      return;
    }

    if (belumScan > 0) {
      Alert.alert(
        `Masih Ada ${belumScan} Produk Belum Discan`,
        'Produk yang belum dipindai akan dianggap stok fisik = 0. Lanjutkan ke laporan?',
        [
          { text: 'Scan Lagi', style: 'cancel' },
          { text: 'Lanjutkan', onPress: () => setMode('review') },
        ]
      );
    } else {
      setMode('review');
    }
  };

  // ── Filter daftar produk untuk tabel review ──────────────────────────────────
  const produkFiltered = daftarProduk.filter((p) => {
    if (filterStatus === 'terscan') return p.statusScan === 'terscan';
    if (filterStatus === 'belum') return p.statusScan === 'belum';
    if (filterStatus === 'selisih')
      return p.statusScan === 'terscan' && p.stokFisik !== p.stokSistem;
    return true;
  });

  // ── Simpan laporan ke server ─────────────────────────────────────────────────
  const handleSimpanLaporan = () => {
    Alert.alert(
      'Simpan Laporan?',
      `${belumScan > 0 ? `${belumScan} produk belum dipindai akan dianggap stok fisik = 0.\n\n` : ''}Laporan akan disimpan ke server. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Simpan',
          onPress: async () => {
            setSavingLaporan(true);
            const result = await simpanLaporanOpname(daftarProduk);
            setSavingLaporan(false);

            if (!result.success) {
              Alert.alert('Gagal Menyimpan', result.message);
              return;
            }

            setLaporanRingkasan(result.ringkasan);
            setMode('laporan');
          },
        },
      ]
    );
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    Alert.alert('Mulai Ulang', 'Semua data scan akan dihapus. Yakin?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Mulai Ulang',
        style: 'destructive',
        onPress: () => {
          setDaftarProduk([]);
          setMode('idle');
          setLaporanRingkasan(null);
          setErrorMsg('');
          setIsScanning(false);
          setLastScanItem(null);
          setFilterStatus('semua');
        },
      },
    ]);
  };

  const handleKembaliInventory = () => {
    navigation.navigate('MainApp', { screen: 'Inventory' });
  };

  // ─── Stepper index ───────────────────────────────────────────────────────────
  const stepIndex = { idle: -1, loading: 0, scanning: 0, review: 1, laporan: 2 }[mode] ?? 0;

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar backgroundColor={C.jet} barStyle="light-content" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={mode === 'idle' || mode === 'loading' ? handleKembaliInventory : handleReset}
          style={s.headerBtn}
        >
          <Octicons
            name={mode === 'idle' || mode === 'loading' ? 'arrow-left' : 'sync'}
            size={18}
            color={mode === 'idle' || mode === 'loading' ? C.pumpkin : C.goldenGate}
          />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Stock Opname</Text>
          {mode === 'scanning' && totalProduk > 0 && (
            <Text style={s.headerSub}>{terscan} / {totalProduk} dipindai</Text>
          )}
          {(mode === 'idle' || mode === 'loading') && (
            <Text style={s.headerSub}>Toko Sepatu By Sovan</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={mode === 'scanning' ? handleSelesaiScan : handleKembaliInventory}
          style={s.headerBtn}
        >
          <Text style={[
            s.headerRightText,
            { color: mode === 'scanning' ? C.pumpkin : C.davyGray }
          ]}>
            {mode === 'scanning' ? 'Selesai' : 'Inventory'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* STEPPER */}
      {mode !== 'idle' && mode !== 'loading' && (
        <View style={s.stepper}>
          {['Scan Produk', 'Review', 'Laporan'].map((label, i) => (
            <React.Fragment key={label}>
              <View style={s.stepItem}>
                <View style={[s.stepDot, i <= stepIndex && s.stepDotActive]}>
                  {i < stepIndex
                    ? <Octicons name="check" size={12} color={C.white} />
                    : <Text style={[s.stepNum, i <= stepIndex && s.stepNumActive]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[s.stepLabel, i <= stepIndex && s.stepLabelActive]}>{label}</Text>
              </View>
              {i < 2 && (
                <View style={[s.stepLine, i < stepIndex && s.stepLineActive]} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* PROGRESS BAR (mode scanning) */}
      {mode === 'scanning' && totalProduk > 0 && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${persenProgress}%` }]} />
        </View>
      )}

      {/* ── KONTEN UTAMA ── */}
      {mode === 'idle' && (
        <IdleView onMulaiOpname={handleMulaiOpname} onKembali={handleKembaliInventory} />
      )}

      {mode === 'loading' && (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={C.pumpkin} />
          <Text style={s.loadingText}>Memuat data produk dari server...</Text>
          <Text style={s.loadingSubText}>Harap tunggu sebentar</Text>
        </View>
      )}

      {mode === 'scanning' && (
        <ScanningView
          loadingItem={loadingItem}
          errorMsg={errorMsg}
          lastScanItem={lastScanItem}
          terscan={terscan}
          totalProduk={totalProduk}
          persenProgress={persenProgress}
          scanLineAnim={scanLineAnim}
          onBarcodeScanned={handleBarcodeScanned}
          onSelesaiScan={handleSelesaiScan}
          onLihatDaftar={() => { setMode('review'); }}
          onPermissionReady={handleMulaiScan}
        />
      )}

      {mode === 'review' && (
        <ReviewView
          daftarProduk={daftarProduk}
          produkFiltered={produkFiltered}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          terscan={terscan}
          totalProduk={totalProduk}
          belumScan={belumScan}
          onEditStok={handleEditStok}
          onLanjutScan={() => setMode('scanning')}
          onSimpanLaporan={handleSimpanLaporan}
          savingLaporan={savingLaporan}
        />
      )}

      {mode === 'laporan' && (
        <LaporanView
          daftarProduk={daftarProduk}
          ringkasan={laporanRingkasan}
          onKembaliInventory={handleKembaliInventory}
          onScanBaru={handleReset}
        />
      )}

      {/* ── MODAL INPUT STOK FISIK ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Input Stok Fisik</Text>
            {selectedItem && (
              <>
                <Text style={s.modalProductName} numberOfLines={2}>
                  {selectedItem.namaProduk}
                </Text>
                <Text style={s.modalProductMeta}>
                  {selectedItem.merek}  ·  Ukuran {selectedItem.ukuran}  ·  {selectedItem.warna}
                </Text>

                <View style={s.modalStokRow}>
                  <View style={s.modalStokBox}>
                    <Text style={s.modalStokLabel}>Stok Sistem</Text>
                    <Text style={s.modalStokValue}>{selectedItem.stokSistem}</Text>
                  </View>
                  <View style={[s.modalStokBox, { backgroundColor: C.linen }]}>
                    <Text style={s.modalStokLabel}>Stok Fisik</Text>
                    <TextInput
                      style={s.modalStokInput}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={C.davyGray}
                      value={inputStok}
                      onChangeText={setInputStok}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Preview selisih real-time */}
                {inputStok !== '' && !isNaN(parseInt(inputStok)) && (() => {
                  const fisik = parseInt(inputStok);
                  const delta = fisik - selectedItem.stokSistem;
                  const sesuai = delta === 0;
                  return (
                    <View style={[s.modalDiffBox, { backgroundColor: sesuai ? C.successBg : C.warnBg }]}>
                      <Text style={[s.modalDiffText, { color: sesuai ? C.successGreen : C.goldenGate }]}>
                        {sesuai ? '✓ Stok sesuai dengan sistem'
                          : `Selisih: ${delta > 0 ? '+' : ''}${delta} dari stok sistem (${selectedItem.stokSistem})`}
                      </Text>
                    </View>
                  );
                })()}

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.btnOutline} onPress={handleBatalModal}>
                    <Text style={s.btnOutlineText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btnPrimary, { flex: 2 }]} onPress={handleSimpanStok}>
                    <Text style={s.btnPrimaryText}>Simpan & Lanjut Scan</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IDLE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function IdleView({ onMulaiOpname, onKembali }) {
  return (
    <ScrollView contentContainerStyle={s.idleContainer}>
      <View style={s.idleIconWrap}>
        <Octicons name="package" size={44} color={C.white} />
      </View>
      <Text style={s.idleTitle}>Stock Opname</Text>
      <Text style={s.idleDesc}>
        Sistem akan memuat seluruh data produk dari database sebagai acuan,
        lalu Anda memindai setiap produk fisik di toko untuk dicocokkan.
      </Text>

      {/* Alur proses */}
      <View style={s.idleFlow}>
        {[
          { icon: 'database', label: 'Load Data', desc: 'Sistem memuat semua produk dari database sebagai acuan' },
          { icon: 'broadcast', label: 'Scan QR', desc: 'Pindai QR Code setiap produk fisik yang ada di toko' },
          { icon: 'diff', label: 'Review', desc: 'Cek produk terscan, belum terscan, dan selisih stok' },
          { icon: 'checklist', label: 'Laporan', desc: 'Simpan laporan lengkap ke server' },
        ].map((step, i) => (
          <View key={i} style={s.idleFlowRow}>
            <View style={s.idleFlowLeft}>
              <View style={s.idleFlowBadge}>
                <Octicons name={step.icon} size={16} color={C.pumpkin} />
              </View>
              {i < 3 && <View style={s.idleFlowLine} />}
            </View>
            <View style={s.idleFlowRight}>
              <Text style={s.idleFlowLabel}>{step.label}</Text>
              <Text style={s.idleFlowDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[s.btnPrimary, { width: '100%' }]} onPress={onMulaiOpname}>
        <Octicons name="play" size={16} color={C.white} style={{ marginRight: 8 }} />
        <Text style={s.btnPrimaryText}>Mulai Stock Opname</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnGhost} onPress={onKembali}>
        <Text style={s.btnGhostText}>Kembali ke Inventory</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCANNING VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ScanningView({
  loadingItem, errorMsg, lastScanItem, terscan, totalProduk,
  persenProgress, scanLineAnim, onBarcodeScanned, onSelesaiScan,
  onLihatDaftar, onPermissionReady,
}) {
  const translateY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 190] });

  return (
    <View style={{ flex: 1, backgroundColor: C.jet }}>
      {/* Kamera */}
      <View style={s.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
          onCameraReady={onPermissionReady}
        />

        {/* Frame scan */}
        <View style={s.scanOverlay}>
          <View style={s.scanFrame}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
            <Animated.View style={[s.scanLine, { transform: [{ translateY }] }]} />
          </View>
          <Text style={s.scanHint}>Arahkan ke QR Code pada kotak sepatu</Text>
        </View>

        {loadingItem && (
          <View style={s.scanLoadingOverlay}>
            <ActivityIndicator color={C.pumpkin} size="large" />
            <Text style={s.scanLoadingText}>Mencari data produk...</Text>
          </View>
        )}
      </View>

      {/* Error banner */}
      {!!errorMsg && (
        <View style={s.errorBanner}>
          <Octicons name="alert" size={14} color={C.white} />
          <Text style={s.errorBannerText}>{errorMsg}</Text>
        </View>
      )}

      {/* Feedback produk terakhir berhasil discan */}
      {!errorMsg && lastScanItem && (
        <View style={s.successBanner}>
          <Octicons name="check-circle-fill" size={14} color={C.successGreen} />
          <Text style={s.successBannerText}>
            {lastScanItem.namaProduk} ({lastScanItem.ukuran}) — Fisik: {lastScanItem.stokFisik} | Sistem: {lastScanItem.stokSistem}
          </Text>
        </View>
      )}

      {/* Bottom info bar */}
      <View style={s.scanBottomBar}>
        <View>
          <Text style={s.scanCountText}>{terscan} / {totalProduk} produk</Text>
          <Text style={s.scanCountSub}>{persenProgress}% selesai</Text>
        </View>
        <TouchableOpacity onPress={onLihatDaftar} style={s.scanDaftarBtn}>
          <Octicons name="list-unordered" size={14} color={C.pumpkin} />
          <Text style={s.scanDaftarText}>Lihat Daftar</Text>
        </TouchableOpacity>
      </View>

      <View style={s.scanActionArea}>
        <TouchableOpacity style={[s.btnPrimary, { width: '100%' }]} onPress={onSelesaiScan}>
          <Octicons name="check" size={16} color={C.white} style={{ marginRight: 8 }} />
          <Text style={s.btnPrimaryText}>Selesai Scan — Ke Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ReviewView({
  daftarProduk, produkFiltered, filterStatus, onFilterChange,
  terscan, totalProduk, belumScan, onEditStok,
  onLanjutScan, onSimpanLaporan, savingLaporan,
}) {
  const totalSelisih = daftarProduk.filter(
    (p) => p.statusScan === 'terscan' && p.stokFisik !== p.stokSistem
  ).length;
  const totalSesuai = daftarProduk.filter(
    (p) => p.statusScan === 'terscan' && p.stokFisik === p.stokSistem
  ).length;

  const filters = [
    { key: 'semua', label: `Semua (${totalProduk})` },
    { key: 'terscan', label: `Terscan (${terscan})` },
    { key: 'belum', label: `Belum (${belumScan})` },
    { key: 'selisih', label: `Selisih (${totalSelisih})` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.linen }}>
      {/* Summary chips */}
      <View style={s.chips}>
        <ChipItem label="Total" value={totalProduk} color={C.jet} />
        <ChipItem label="Terscan" value={terscan} color={C.pumpkin} />
        <ChipItem label="Sesuai" value={totalSesuai} color={C.successGreen} />
        <ChipItem label="Selisih" value={totalSelisih} color={C.goldenGate} />
        {belumScan > 0 && <ChipItem label="Belum" value={belumScan} color={C.warnYellow} />}
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterScrollContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filterStatus === f.key && s.filterTabActive]}
            onPress={() => onFilterChange(f.key)}
          >
            <Text style={[s.filterTabText, filterStatus === f.key && s.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabel header */}
      <View style={s.tblHeader}>
        <Text style={[s.tblHead, { flex: 0.4 }]}>Status</Text>
        <Text style={[s.tblHead, { flex: 2.2 }]}>Produk</Text>
        <Text style={[s.tblHead, { flex: 0.65, textAlign: 'center' }]}>Sis.</Text>
        <Text style={[s.tblHead, { flex: 0.65, textAlign: 'center' }]}>Fisik</Text>
        <Text style={[s.tblHead, { flex: 0.55, textAlign: 'center' }]}>Δ</Text>
      </View>

      <FlatList
        data={produkFiltered}
        keyExtractor={(item, idx) => item.unitCode ?? String(idx)}
        style={{ flex: 1 }}
        renderItem={({ item }) => {
          const selisih = item.stokFisik !== null ? item.stokFisik - item.stokSistem : null;
          const isTerscan = item.statusScan === 'terscan';
          const isSelisih = selisih !== null && selisih !== 0;

          return (
            <TouchableOpacity
              style={[
                s.tblRow,
                !isTerscan && s.tblRowBelum,
                isSelisih && s.tblRowSelisih,
              ]}
              onPress={() => onEditStok(item)}
              activeOpacity={0.7}
            >
              {/* Status dot */}
              <View style={{ flex: 0.4, alignItems: 'center' }}>
                <View style={[
                  s.statusDot,
                  isTerscan
                    ? isSelisih ? { backgroundColor: C.goldenGate } : { backgroundColor: C.successGreen }
                    : { backgroundColor: C.davyGray },
                ]} />
              </View>

              <View style={{ flex: 2.2 }}>
                <Text style={s.tblProductName} numberOfLines={1}>{item.namaProduk}</Text>
                <Text style={s.tblProductMeta}>{item.ukuran} · {item.warna}</Text>
              </View>

              <Text style={[s.tblCell, { flex: 0.65 }]}>{item.stokSistem}</Text>

              <View style={{ flex: 0.65, alignItems: 'center' }}>
                {isTerscan ? (
                  <Text style={[s.tblCell, isSelisih ? s.tblCellBad : s.tblCellOk]}>
                    {item.stokFisik}
                  </Text>
                ) : (
                  <Text style={s.tblCellEmpty}>—</Text>
                )}
              </View>

              <Text style={[
                s.tblCell, { flex: 0.55 },
                selisih === null ? {} : selisih === 0 ? s.tblCellOk : s.tblCellBad,
              ]}>
                {selisih === null ? '—' : selisih > 0 ? `+${selisih}` : `${selisih}`}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyList}>
            <Octicons name="inbox" size={32} color={C.davyGray} />
            <Text style={s.emptyText}>Tidak ada produk untuk filter ini</Text>
          </View>
        }
      />

      {/* Action Buttons */}
      <View style={s.tblActions}>
        <TouchableOpacity style={s.btnOutline} onPress={onLanjutScan}>
          <Octicons name="arrow-left" size={14} color={C.pumpkin} />
          <Text style={[s.btnOutlineText, { marginLeft: 6 }]}>Scan Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnPrimary, { flex: 1 }]}
          onPress={onSimpanLaporan}
          disabled={savingLaporan}
        >
          {savingLaporan
            ? <ActivityIndicator color={C.white} size="small" />
            : <>
                <Octicons name="check-circle" size={15} color={C.white} style={{ marginRight: 8 }} />
                <Text style={s.btnPrimaryText}>Simpan Laporan</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAPORAN VIEW
// ─────────────────────────────────────────────────────────────────────────────
function LaporanView({ daftarProduk, ringkasan, onKembaliInventory, onScanBaru }) {
  const selisihItems = daftarProduk.filter(
    (p) => p.statusScan === 'terscan' && p.stokFisik !== p.stokSistem
  );
  const tidakTerscanItems = daftarProduk.filter((p) => p.statusScan === 'belum');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.linen }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.laporanHeader}>
        <View style={s.laporanSavedBadge}>
          <Octicons name="check-circle-fill" size={13} color={C.white} />
          <Text style={s.laporanSavedText}>Laporan Tersimpan</Text>
        </View>
        <Text style={s.laporanTitle}>Laporan Stock Opname</Text>
        <Text style={s.laporanDate}>
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
      </View>

      {/* Ringkasan */}
      {ringkasan && (
        <View style={s.laporanRingkasan}>
          <RingkasanBox label="Total Produk" value={ringkasan.total} color={C.jet} />
          <RingkasanBox label="Terscan" value={ringkasan.totalTerscan} color={C.pumpkin} />
          <RingkasanBox label="Sesuai" value={ringkasan.totalSesuai} color={C.successGreen} />
          <RingkasanBox label="Selisih" value={ringkasan.totalSelisih} color={C.goldenGate} />
        </View>
      )}

      {/* Belum discan */}
      {tidakTerscanItems.length > 0 && (
        <View style={[s.detailCard, { marginBottom: 12 }]}>
          <View style={s.detailCardHeader}>
            <Octicons name="circle-slash" size={14} color={C.davyGray} />
            <Text style={[s.detailCardTitle, { color: C.davyGray }]}>
              Tidak Dipindai ({tidakTerscanItems.length})
            </Text>
          </View>
          {tidakTerscanItems.map((item, idx) => (
            <View
              key={item.unitCode ?? idx}
              style={[s.detailRow, idx < tidakTerscanItems.length - 1 && s.detailRowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.detailName}>{item.namaProduk}</Text>
                <Text style={s.detailMeta}>{item.ukuran} · {item.warna}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: C.davyGray }}>Stok sistem: {item.stokSistem}</Text>
                <Text style={{ fontSize: 12, color: C.goldenGate, fontWeight: '700' }}>Tidak terscan</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Selisih stok */}
      {selisihItems.length > 0 && (
        <View style={s.detailCard}>
          <View style={s.detailCardHeader}>
            <Octicons name="alert" size={14} color={C.goldenGate} />
            <Text style={[s.detailCardTitle, { color: C.goldenGate }]}>
              Selisih Stok ({selisihItems.length})
            </Text>
          </View>
          {selisihItems.map((item, idx) => {
            const delta = item.stokFisik - item.stokSistem;
            return (
              <View
                key={item.unitCode ?? idx}
                style={[s.detailRow, idx < selisihItems.length - 1 && s.detailRowBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.detailName}>{item.namaProduk}</Text>
                  <Text style={s.detailMeta}>{item.ukuran} · {item.warna}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: C.davyGray }}>Sistem: {item.stokSistem} | Fisik: {item.stokFisik}</Text>
                  <Text style={[s.detailDelta, { color: delta < 0 ? C.goldenGate : C.pumpkin }]}>
                    {delta > 0 ? `+${delta}` : delta}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Semua OK */}
      {selisihItems.length === 0 && tidakTerscanItems.length === 0 && (
        <View style={s.allOkBox}>
          <Octicons name="check-circle-fill" size={36} color={C.successGreen} />
          <Text style={s.allOkText}>Semua produk sesuai!{'\n'}Tidak ada selisih maupun produk yang terlewat.</Text>
        </View>
      )}

      <View style={[s.tblActions, { marginTop: 16 }]}>
        <TouchableOpacity style={s.btnOutline} onPress={onScanBaru}>
          <Octicons name="sync" size={14} color={C.pumpkin} />
          <Text style={[s.btnOutlineText, { marginLeft: 6 }]}>Ulang</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={onKembaliInventory}>
          <Octicons name="arrow-left" size={14} color={C.white} style={{ marginRight: 8 }} />
          <Text style={s.btnPrimaryText}>Kembali ke Inventory</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function ChipItem({ label, value, color }) {
  return (
    <View style={s.chip}>
      <Text style={[s.chipValue, { color }]}>{value}</Text>
      <Text style={s.chipLabel}>{label}</Text>
    </View>
  );
}

function RingkasanBox({ label, value, color }) {
  return (
    <View style={s.ringkasanBox}>
      <Text style={[s.ringkasanValue, { color }]}>{value}</Text>
      <Text style={s.ringkasanLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.jet },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.jet, paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#3a3a3a',
  },
  headerBtn: { padding: 4, minWidth: 60 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: C.linen, fontSize: 17, fontWeight: '700' },
  headerSub: { color: C.davyGray, fontSize: 11, marginTop: 1 },
  headerRightText: { fontSize: 13, fontWeight: '600', textAlign: 'right' },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.jet, paddingBottom: 12, paddingHorizontal: 24,
  },
  stepItem: { alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#3a3a3a',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: C.pumpkin },
  stepNum: { color: C.davyGray, fontSize: 12, fontWeight: '700' },
  stepNumActive: { color: C.white },
  stepLabel: { color: C.davyGray, fontSize: 10, marginTop: 4 },
  stepLabelActive: { color: C.linen, fontWeight: '600' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#3a3a3a', marginBottom: 14, marginHorizontal: 8 },
  stepLineActive: { backgroundColor: C.pumpkin },

  // Progress bar
  progressBar: { height: 3, backgroundColor: '#3a3a3a' },
  progressFill: { height: 3, backgroundColor: C.pumpkin },

  // Buttons
  btnPrimary: {
    flexDirection: 'row', backgroundColor: C.pumpkin, paddingVertical: 14,
    paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.goldenGate, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  btnPrimaryText: { color: C.white, fontSize: 15, fontWeight: '700' },
  btnOutline: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: C.pumpkin, backgroundColor: C.white,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  btnOutlineText: { color: C.pumpkin, fontSize: 14, fontWeight: '700' },
  btnGhost: { marginTop: 14, paddingVertical: 10 },
  btnGhostText: { color: C.davyGray, fontSize: 14, textAlign: 'center', textDecorationLine: 'underline' },

  // Loading
  centerContainer: {
    flex: 1, backgroundColor: C.linen, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  loadingText: { fontSize: 16, fontWeight: '600', color: C.jet, marginTop: 20, textAlign: 'center' },
  loadingSubText: { fontSize: 13, color: C.davyGray, marginTop: 6 },

  // Idle
  idleContainer: {
    backgroundColor: C.linen, alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 32,
  },
  idleIconWrap: {
    width: 90, height: 90, borderRadius: 24, backgroundColor: C.pumpkin,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: C.goldenGate, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  idleTitle: { fontSize: 26, fontWeight: '800', color: C.jet, marginBottom: 8 },
  idleDesc: { fontSize: 14, color: C.davyGray, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  idleFlow: { width: '100%', marginBottom: 32 },
  idleFlowRow: { flexDirection: 'row', marginBottom: 0 },
  idleFlowLeft: { alignItems: 'center', width: 44 },
  idleFlowBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.pumpkin,
  },
  idleFlowLine: { width: 2, flex: 1, backgroundColor: C.divider, marginVertical: 4, minHeight: 20 },
  idleFlowRight: { flex: 1, paddingLeft: 14, paddingBottom: 20 },
  idleFlowLabel: { fontSize: 14, fontWeight: '700', color: C.jet, marginBottom: 2 },
  idleFlowDesc: { fontSize: 12, color: C.davyGray, lineHeight: 18 },

  // Camera
  cameraContainer: { flex: 1, position: 'relative' },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(41,41,41,0.42)',
  },
  scanFrame: { width: 240, height: 240, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: C.pumpkin, borderWidth: 3.5 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanLine: {
    position: 'absolute', top: 24, left: 4, right: 4, height: 2.5,
    backgroundColor: C.pumpkin, borderRadius: 2,
    shadowColor: C.pumpkin, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  scanHint: { color: C.linen, fontSize: 13, marginTop: 20, fontWeight: '500' },
  scanLoadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(41,41,41,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanLoadingText: { color: C.linen, marginTop: 12, fontSize: 14 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.goldenGate, paddingVertical: 10, paddingHorizontal: 16,
  },
  errorBannerText: { color: C.white, fontWeight: '700', fontSize: 13, flex: 1 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, paddingVertical: 10, paddingHorizontal: 16,
  },
  successBannerText: { color: C.successGreen, fontWeight: '600', fontSize: 12, flex: 1 },
  scanBottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.jet, paddingHorizontal: 16, paddingVertical: 12,
  },
  scanCountText: { color: C.linen, fontSize: 15, fontWeight: '700' },
  scanCountSub: { color: C.davyGray, fontSize: 11, marginTop: 2 },
  scanDaftarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scanDaftarText: { color: C.pumpkin, fontSize: 13, fontWeight: '700' },
  scanActionArea: { backgroundColor: C.jet, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },

  // Chips
  chips: {
    flexDirection: 'row', backgroundColor: C.jet,
    paddingHorizontal: 10, paddingVertical: 10, gap: 6,
  },
  chip: {
    flex: 1, backgroundColor: C.white, borderRadius: 12,
    paddingVertical: 8, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2,
  },
  chipValue: { fontSize: 18, fontWeight: '800' },
  chipLabel: { fontSize: 9, color: C.davyGray, marginTop: 2 },

  // Filter tabs
  filterScroll: { backgroundColor: C.white, maxHeight: 44 },
  filterScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: C.divider, backgroundColor: C.linen,
  },
  filterTabActive: { backgroundColor: C.pumpkin, borderColor: C.pumpkin },
  filterTabText: { fontSize: 12, color: C.davyGray, fontWeight: '600' },
  filterTabTextActive: { color: C.white },

  // Table
  tblHeader: {
    flexDirection: 'row', backgroundColor: C.davyGray,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  tblHead: { color: C.linen, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tblRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  tblRowBelum: { backgroundColor: C.belumBg },
  tblRowSelisih: { backgroundColor: C.warnBg },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  tblProductName: { fontSize: 13, fontWeight: '600', color: C.jet },
  tblProductMeta: { fontSize: 11, color: C.davyGray, marginTop: 1 },
  tblCell: { fontSize: 13, color: C.jet, textAlign: 'center', fontWeight: '500' },
  tblCellOk: { color: C.successGreen, fontWeight: '700' },
  tblCellBad: { color: C.goldenGate, fontWeight: '700' },
  tblCellEmpty: { fontSize: 13, color: C.davyGray, textAlign: 'center' },
  tblActions: {
    flexDirection: 'row', padding: 14, backgroundColor: C.linen,
    borderTopWidth: 1, borderTopColor: C.divider,
  },
  emptyList: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: C.davyGray, fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(41,41,41,0.72)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 38 : 28,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: C.divider, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.jet, marginBottom: 4 },
  modalProductName: { fontSize: 15, fontWeight: '700', color: C.jet },
  modalProductMeta: { fontSize: 12, color: C.davyGray, marginBottom: 20 },
  modalStokRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  modalStokBox: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
  },
  modalStokLabel: { fontSize: 11, color: C.davyGray, fontWeight: '600', marginBottom: 6 },
  modalStokValue: { fontSize: 28, fontWeight: '900', color: C.jet },
  modalStokInput: {
    fontSize: 28, fontWeight: '900', color: C.jet, textAlign: 'center',
    minWidth: 60, borderBottomWidth: 2, borderBottomColor: C.pumpkin, paddingBottom: 2,
  },
  modalDiffBox: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 20 },
  modalDiffText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10 },

  // Laporan
  laporanHeader: {
    backgroundColor: C.jet, borderRadius: 18, padding: 22,
    marginBottom: 14, alignItems: 'center',
  },
  laporanSavedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.pumpkin, paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginBottom: 12,
  },
  laporanSavedText: { color: C.white, fontSize: 12, fontWeight: '700' },
  laporanTitle: { color: C.linen, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  laporanDate: { color: C.davyGray, fontSize: 12 },
  laporanRingkasan: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  ringkasanBox: {
    flex: 1, minWidth: '22%', backgroundColor: C.white, borderRadius: 14,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
  },
  ringkasanValue: { fontSize: 24, fontWeight: '900' },
  ringkasanLabel: { fontSize: 10, color: C.davyGray, marginTop: 3, textAlign: 'center' },
  detailCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
  },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  detailCardTitle: { fontSize: 14, fontWeight: '700' },
  detailRow: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center' },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  detailName: { fontSize: 13, fontWeight: '600', color: C.jet },
  detailMeta: { fontSize: 11, color: C.davyGray, marginTop: 2 },
  detailDelta: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  allOkBox: {
    backgroundColor: C.successBg, borderRadius: 16, padding: 28,
    alignItems: 'center', marginBottom: 16,
  },
  allOkText: {
    color: C.successGreen, fontSize: 15, fontWeight: '700',
    textAlign: 'center', marginTop: 12, lineHeight: 22,
  },
});