// pages/SalesReportScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, TouchableOpacity, Platform, Alert,
  Modal, FlatList, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTransactions } from '../data/services/transactionService';
import { getUsers } from '../data/services/userService';
import { getLocalUserData } from '../login auth/authService';
import StrukModal, { buildReceiptData, getReceiptByInvoice } from '../keduitan/Struk';

const C = {
  bg:        '#EBEBEB',
  card:      '#FFFFFF',
  cardAlt:   '#F8F8F8',
  headerBg:  '#292929',
  filterBg:  '#2E2E2E',
  accent:    '#FC6A0A',
  accentAlt: '#E74504',
  accentDim: '#FC6A0A18',
  davys:     '#585757',
  border:    '#E2E2E2',
  borderDark:'#CCCCCC',
  textPri:   '#1A1A1A',
  textSec:   '#666666',
  textMuted: '#999999',
  white:     '#FFFFFF',
};

const PAYMENT_CONFIG = {
  cash:     { icon: 'cash-outline',            label: 'Cash'     },
  qris:     { icon: 'qr-code-outline',         label: 'QRIS'     },
  transfer: { icon: 'swap-horizontal-outline', label: 'Transfer' },
  debit:    { icon: 'card-outline',            label: 'Debit'    },
  default:  { icon: 'wallet-outline',          label: 'Lainnya'  },
};

const getPaymentCfg = (method) => {
  const m = (method || '').toLowerCase();
  if (m === 'cash') return PAYMENT_CONFIG.cash;
  if (m === 'qris') return PAYMENT_CONFIG.qris;
  if (m.includes('transfer') || m === 'card') return PAYMENT_CONFIG.transfer;
  if (m.includes('debit') || m.includes('mandiri') || m.includes('bri') || m.includes('bni')) return PAYMENT_CONFIG.debit;
  return PAYMENT_CONFIG.default;
};

const fmtCurrency = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const fmtDate = (s) => {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', '');
};

// Ambil nama kasir dari 1 objek transaksi — coba semua kemungkinan field
const getKasirFromTx = (tx) =>
  tx.user_name         || // seperti di response Postman: "user_name": "Mas Sovan"
  tx.cashier_name      ||
  tx.user?.name        ||
  tx.user?.username    ||
  tx.kasir?.name       ||
  tx.kasir?.username   ||
  tx.kasir_name        ||
  tx.operator_name     ||
  tx.created_by_name   ||
  tx.teller_name       ||
  null;

// Lebar kolom tabel (px)
const COL = {
  no:        44,
  invoice:   155,
  tanggal:   140,
  kasir:     110,
  pelanggan: 120,
  total:     125,
  diskon:    105,
  catatan:   160,
  aksi:      72,
};

// ── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, color }) => (
  <View style={styles.sumCard}>
    <View style={[styles.sumIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={20} color={C.white} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
    </View>
  </View>
);

// ── Detail Row (label: value) ─────────────────────────────────────────────────
const DetailRow = ({ label, value, isAccent, bold }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={[
      styles.detailRowValue,
      isAccent && { color: C.accent },
      bold && { fontWeight: '700' },
    ]}>
      {value}
    </Text>
  </View>
);

// ── More Detail Panel ─────────────────────────────────────────────────────────
const MoreDetail = ({ tx }) => {
  const items = tx.items || [];
  if (items.length === 0) {
    return (
      <View style={styles.detailWrap}>
        <Text style={styles.detailEmpty}>Tidak ada data produk</Text>
      </View>
    );
  }
  return (
    <View style={styles.detailWrap}>
      {items.map((item, idx) => {
        const subtotal =
          item.subtotal ||
          (item.quantity || 1) * (item.unit_price || item.price || 0);
        return (
          <View
            key={idx}
            style={[styles.detailItem, idx < items.length - 1 && styles.detailItemBorder]}
          >
            {/* Nama produk */}
            <View style={styles.detailItemHeader}>
              <Ionicons name="pricetag-outline" size={13} color={C.accent} style={{ marginRight: 5 }} />
              <Text style={styles.detailItemName} numberOfLines={2}>
                {item.product_name || item.name || '-'}
              </Text>
              {items.length > 1 && (
                <View style={styles.detailItemBadge}>
                  <Text style={styles.detailItemBadgeText}>#{idx + 1}</Text>
                </View>
              )}
            </View>

            {/* Grid 2 kolom */}
            <View style={styles.detailGrid}>
              <View style={styles.detailGridCol}>
                <DetailRow
                  label="Ukuran"
                  value={item.size || item.ukuran || '-'}
                />
                <DetailRow
                  label="Warna"
                  value={item.color || '-'}
                />
                <DetailRow label="Kode Unit" value={item.unit_code || item.code || '-'} />
              </View>
              <View style={styles.detailGridCol}>
                <DetailRow label="Qty"   value={String(item.quantity || 1)} />
                <DetailRow label="Harga" value={fmtCurrency(item.unit_price || item.price || 0)} isAccent />
                <DetailRow label="Total" value={fmtCurrency(subtotal)} isAccent bold />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ── Baris transaksi + More Detail ─────────────────────────────────────────────
const TxRow = ({ tx, idx, onStruk, loadingId, currentUserName }) => {
  const [open, setOpen]   = useState(false);
  const isLoading         = loadingId === tx.id;
  const kasirName         = getKasirFromTx(tx) || currentUserName || '-';
  const rowBg             = idx % 2 === 0 ? C.card : C.cardAlt;
  const hasItems          = (tx.items || []).length > 0;

  return (
    <>
      {/* Baris utama */}
      <View style={[styles.tdRow, { backgroundColor: rowBg }]}>
        <Text style={[styles.tdCell, { width: COL.no, textAlign: 'center', color: C.textMuted }]}>
          {idx + 1}
        </Text>
        <Text style={[styles.tdInvoice, { width: COL.invoice }]} numberOfLines={1}>
          {tx.invoice_number || `#${idx + 1}`}
        </Text>
        <Text style={[styles.tdCell, { width: COL.tanggal }]}>
          {fmtDate(tx.created_at)}
        </Text>
        <Text style={[styles.tdCell, { width: COL.kasir }]} numberOfLines={1}>
          {kasirName}
        </Text>
        <Text style={[styles.tdCell, { width: COL.pelanggan, color: C.textSec }]} numberOfLines={1}>
          {tx.customer_name || '-'}
        </Text>
        <Text style={[styles.tdCell, { width: COL.total, textAlign: 'right', color: C.accent, fontWeight: '700' }]}>
          {fmtCurrency(tx.final_amount || tx.total_amount || 0)}
        </Text>
        <Text style={[styles.tdCell, {
          width: COL.diskon, textAlign: 'right',
          color: (tx.discount_amount || 0) > 0 ? C.accentAlt : C.textMuted,
        }]}>
          {(tx.discount_amount || 0) > 0 ? `-${fmtCurrency(tx.discount_amount)}` : '-'}
        </Text>
        <Text style={[styles.tdCell, { width: COL.catatan, color: C.textSec }]} numberOfLines={2}>
          {tx.notes || '-'}
        </Text>
        <View style={{ width: COL.aksi, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={styles.struktBtn} onPress={() => onStruk(tx)} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator size="small" color={C.accent} />
              : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="receipt-outline" size={12} color={C.accent} />
                  <Text style={styles.struktBtnText}>Struk</Text>
                </View>
              )
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* More Detail toggle + panel */}
      <View style={[styles.moreDetailContainer, { backgroundColor: rowBg }]}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
          <View style={styles.progressDot} />
        </View>
        <TouchableOpacity
          style={styles.moreDetailBtn}
          onPress={() => setOpen(!open)}
          activeOpacity={0.7}
          disabled={!hasItems}
        >
          <Ionicons
            name={open ? 'chevron-up-circle' : 'chevron-down-circle'}
            size={15}
            color={hasItems ? C.accent : C.textMuted}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.moreDetailBtnText, !hasItems && { color: C.textMuted }]}>
            {open ? 'Sembunyikan Detail' : `Produk${hasItems ? ` (${tx.items.length})` : ''}`}
          </Text>
        </TouchableOpacity>
        {open && <MoreDetail tx={tx} />}
      </View>
    </>
  );
};

// ── Payment Group ─────────────────────────────────────────────────────────────
const PaymentGroup = ({ method, transactions, onStruk, loadingId, currentUserName }) => {
  const cfg    = getPaymentCfg(method);
  const total  = transactions.reduce((s, t) => s + (t.final_amount || t.total_amount || 0), 0);
  const diskon = transactions.reduce((s, t) => s + (t.discount_amount || 0), 0);
  const produk = transactions.reduce((s, t) => s + (t.items?.reduce((a, i) => a + (i.quantity || 1), 0) || 0), 0);

  return (
    <View style={styles.pgWrap}>
      <View style={styles.pgTitleRow}>
        <Ionicons name={cfg.icon} size={16} color={C.accent} style={{ marginRight: 8 }} />
        <Text style={styles.pgTitle}>Metode Pembayaran: {cfg.label}</Text>
        <View style={styles.pgBadge}>
          <Text style={styles.pgBadgeText}>{transactions.length} transaksi</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
        <View>
          {/* Header */}
          <View style={styles.tableHeadRow}>
            <Text style={[styles.thCell, { width: COL.no, textAlign: 'center' }]}>No</Text>
            <Text style={[styles.thCell, { width: COL.invoice }]}>No. Invoice</Text>
            <Text style={[styles.thCell, { width: COL.tanggal }]}>Tanggal</Text>
            <Text style={[styles.thCell, { width: COL.kasir }]}>Kasir</Text>
            <Text style={[styles.thCell, { width: COL.pelanggan }]}>Pelanggan</Text>
            <Text style={[styles.thCell, { width: COL.total, textAlign: 'right' }]}>Total</Text>
            <Text style={[styles.thCell, { width: COL.diskon, textAlign: 'right' }]}>Diskon</Text>
            <Text style={[styles.thCell, { width: COL.catatan }]}>Catatan</Text>
            <Text style={[styles.thCell, { width: COL.aksi, textAlign: 'center' }]}>Aksi</Text>
          </View>

          {/* Baris data */}
          {transactions.map((tx, idx) => (
            <TxRow
              key={tx.id || idx}
              tx={tx}
              idx={idx}
              onStruk={onStruk}
              loadingId={loadingId}
              currentUserName={currentUserName}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.pgFooter}>
        <View style={styles.pgFooterItem}>
          <Ionicons name="cash-outline" size={13} color={C.accent} />
          <Text style={styles.pgFooterText}>
            Total Penjualan ({cfg.label}):{' '}
            <Text style={[styles.pgFooterVal, { color: C.accent }]}>{fmtCurrency(total)}</Text>
          </Text>
        </View>
        {diskon > 0 && (
          <View style={styles.pgFooterItem}>
            <Ionicons name="pricetag-outline" size={13} color={C.accentAlt} />
            <Text style={styles.pgFooterText}>
              Total Diskon ({cfg.label}):{' '}
              <Text style={[styles.pgFooterVal, { color: C.accentAlt }]}>{fmtCurrency(diskon)}</Text>
            </Text>
          </View>
        )}
        <View style={styles.pgFooterItem}>
          <Ionicons name="cube-outline" size={13} color={C.accent} />
          <Text style={styles.pgFooterText}>
            Total Produk Terjual ({cfg.label}):{' '}
            <Text style={[styles.pgFooterVal, { color: C.accent }]}>{produk}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function SalesReportScreen({ navigation, userData }) {
  const [transactions, setTransactions]         = useState([]);
  const [filtered, setFiltered]                 = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [filterOpen, setFilterOpen]             = useState(true);
  const [reportType, setReportType]             = useState('harian');
  const [selectedDate, setSelectedDate]         = useState(new Date());
  const [showDatePicker, setShowDatePicker]     = useState(false);
  const [selectedKasir, setSelectedKasir]       = useState('');
  const [searchProduct, setSearchProduct]       = useState('');
  const [showKasirPicker, setShowKasirPicker]   = useState(false);
  // Daftar kasir: dari API users (jika ada) + dari transaksi, digabung & dedupe
  const [kasirList, setKasirList]               = useState([]);
  const [currentUser, setCurrentUser]           = useState(null);
  const [showStruk, setShowStruk]               = useState(false);
  const [selectedReceipt, setSelectedReceipt]   = useState(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState(null);

  useEffect(() => {
    if (userData) {
      setCurrentUser(userData);
    } else {
      getLocalUserData().then(setCurrentUser).catch(() => {});
    }
  }, [userData]);

  const currentUserName =
    currentUser?.name ||
    currentUser?.username ||
    currentUser?.email?.split('@')[0] ||
    '';

  // ── Fetch transaksi & bangun kasir list (users API + transaksi) ──
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);

      // 1) Fetch daftar user/kasir dari API (jika tersedia) — agar filter tampil semua akun
      /** @type {{ id: string|number, name: string }[]} */
      let usersFromApi = [];
      try {
        const usersResult = await getUsers();
        if (usersResult.success && Array.isArray(usersResult.data)) {
          usersFromApi = usersResult.data;
        }
      } catch (_) {
        // Abaikan jika endpoint /users tidak ada atau gagal
      }

      // 2) Fetch transaksi (tanpa per_page khusus; backend yang atur pagination)
      const result = await getTransactions();
      if (result.success) {
        const data =
          result.data?.data?.transactions ||
          result.data?.transactions        ||
          result.data?.data                ||
          (Array.isArray(result.data) ? result.data : []);

        setTransactions(data);

        // 3) Bangun daftar kasir: gabung users API + kasir dari transaksi, lalu dedupe
        // Bangun { id, name } dari transaksi, meniru konsep user_id di website
        const fromTxRaw = data
          .map((t) => {
            const name = getKasirFromTx(t);
            const id =
              t.user_id ||
              t.user?.id ||
              t.kasir?.id ||
              t.created_by ||
              null;
            if (!id || !name) return null;
            return { id, name };
          })
          .filter(Boolean);

        // 3) Gabungkan users API + kasir dari transaksi, dedupe per id
        const map = new Map();
        usersFromApi.forEach((u) => {
          map.set(String(u.id), u);
        });
        fromTxRaw.forEach((u) => {
          const key = String(u.id);
          if (!map.has(key)) map.set(key, u);
        });

        setKasirList(Array.from(map.values()));
      } else {
        Alert.alert('Error', result.error);
        setTransactions([]);
        // Tetap set kasir dari users API jika transaksi gagal
        if (usersFromApi.length) {
          setKasirList(usersFromApi);
        }
      }
    } catch {
      Alert.alert('Error', 'Gagal memuat data');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchTransactions);
    return unsub;
  }, [navigation]);

  // ── Filter transaksi ──
  useEffect(() => {
    if (!Array.isArray(transactions)) { setFiltered([]); return; }
    let f = [...transactions];

    if (searchProduct.trim()) {
      const q = searchProduct.toLowerCase();
      f = f.filter((t) =>
        t.invoice_number?.toLowerCase().includes(q) ||
        t.customer_name?.toLowerCase().includes(q)  ||
        t.items?.some((it) => (it.product_name || '').toLowerCase().includes(q))
      );
    }

    if (selectedKasir) {
      f = f.filter((t) => {
        // Utamakan filter berdasarkan user_id seperti di website
        const idFromTx =
          t.user_id ||
          t.user?.id ||
          t.kasir?.id ||
          t.created_by ||
          null;

        if (idFromTx != null) {
          return String(idFromTx) === String(selectedKasir);
        }

        // Fallback: cocokan nama jika id tidak tersedia di data transaksi
        const namaTx = (getKasirFromTx(t) || '').toLowerCase().trim();
        const selectedKasirObj = allKasirForPicker.find((k) => String(k.id) === String(selectedKasir));
        const namaKasir = selectedKasirObj?.name?.toLowerCase().trim();
        return !!namaKasir && namaTx === namaKasir;
      });
    }

    f = f.filter((t) => {
      if (!t.created_at) return false;
      const td = new Date(t.created_at);
      const sy = selectedDate.getFullYear();
      const sm = selectedDate.getMonth();
      const sd = selectedDate.getDate();
      if (reportType === 'harian')
        return td.getFullYear() === sy && td.getMonth() === sm && td.getDate() === sd;
      if (reportType === 'mingguan') {
        const ws = new Date(selectedDate);
        ws.setDate(selectedDate.getDate() - selectedDate.getDay());
        ws.setHours(0, 0, 0, 0);
        const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999);
        return td >= ws && td <= we;
      }
      if (reportType === 'bulanan') return td.getFullYear() === sy && td.getMonth() === sm;
      if (reportType === 'tahunan') return td.getFullYear() === sy;
      return true;
    });

    setFiltered(f);
  }, [transactions, reportType, selectedDate, selectedKasir, searchProduct]);

  const totalPendapatan = filtered.reduce((s, t) => s + (t.final_amount || t.total_amount || 0), 0);
  const totalDiskon     = filtered.reduce((s, t) => s + (t.discount_amount || 0), 0);
  const totalProduk     = filtered.reduce((s, t) => s + (t.items?.reduce((a, i) => a + (i.quantity || 1), 0) || 0), 0);

  const grouped = filtered.reduce((acc, t) => {
    const key = (t.payment_method || 'cash').toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const REPORT_TYPES = [
    { key: 'harian',   label: 'Harian'   },
    { key: 'mingguan', label: 'Mingguan' },
    { key: 'bulanan',  label: 'Bulanan'  },
    { key: 'tahunan',  label: 'Tahunan'  },
  ];

  const getDateLabel = () => {
    if (reportType === 'harian')
      return selectedDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (reportType === 'mingguan') {
      const ws = new Date(selectedDate);
      ws.setDate(selectedDate.getDate() - selectedDate.getDay());
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return `${ws.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} - ${we.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
    if (reportType === 'bulanan')
      return selectedDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return String(selectedDate.getFullYear());
  };

  const shiftDate = (dir) => {
    const d     = new Date(selectedDate);
    const delta = { harian:[0,0,dir], mingguan:[0,0,dir*7], bulanan:[0,dir,0], tahunan:[dir,0,0] }[reportType];
    d.setFullYear(d.getFullYear() + delta[0], d.getMonth() + delta[1], d.getDate() + delta[2]);
    if (d <= new Date()) setSelectedDate(d);
  };

  const handleShowStruk = async (transaction) => {
    setLoadingReceiptId(transaction.id);
    try {
      const stored = await getReceiptByInvoice(transaction.invoice_number);
      if (stored) { setSelectedReceipt(stored); setShowStruk(true); return; }
          const receiptData = buildReceiptData(
        { data: transaction },
        (transaction.items || []).map((item) => ({
          name:      item.product_name || item.name,
          unit_code: item.unit_code || item.code,
          quantity:  item.quantity,
          price:     item.unit_price || item.price,
          subtotal:  item.subtotal || item.quantity * (item.unit_price || item.price),
          color:     item.color || null,
              size:      item.size || item.ukuran || null,
        })),
        {
          customer_name:  transaction.customer_name,
          customer_phone: transaction.customer_phone,
          payment_method: transaction.payment_method,
          card_type:      transaction.card_type,
          notes:          transaction.notes,
        },
        transaction.final_amount || transaction.total_amount || 0,
        transaction.discount_amount || 0
      );
      setSelectedReceipt(receiptData);
      setShowStruk(true);
    } catch {
      Alert.alert('Error', 'Gagal memuat data struk');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  // ── Picker kasir: dari kasirList (data transaksi/API) + akun login di atas ──
  const allKasirForPicker = (() => {
    if (!Array.isArray(kasirList) || kasirList.length === 0) return [];

    const seen    = new Set();
    const deduped = kasirList.filter((k) => {
      const key = String(k.id ?? k.name).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Akun login naik ke urutan pertama (cocokkan berdasarkan nama)
    const loginIdx = deduped.findIndex(
      (k) => (k.name || '').toLowerCase().trim() === currentUserName.toLowerCase().trim()
    );
    if (loginIdx > 0) {
      const [item] = deduped.splice(loginIdx, 1);
      deduped.unshift(item);
    } else if (loginIdx === -1 && currentUserName) {
      deduped.unshift({ id: 'me', name: currentUserName });
    }
    return deduped;
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Laporan Transaksi</Text>
          <Text style={styles.headerSub}>
            {REPORT_TYPES.find((r) => r.key === reportType)?.label}
            {currentUserName ? `  •  ${currentUserName}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTransactions}>
          <Ionicons name="refresh" size={18} color={C.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* Filter Box */}
        <View style={styles.filterBox}>
          <TouchableOpacity
            style={styles.filterToggleBar}
            onPress={() => setFilterOpen(!filterOpen)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="filter" size={15} color={C.white} style={{ marginRight: 8 }} />
              <Text style={styles.filterToggleLabel}>Filter Laporan</Text>
            </View>
            <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.white} />
          </TouchableOpacity>

          {filterOpen && (
            <View style={styles.filterBody}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Tipe Laporan</Text>
                <View style={styles.rtWrap}>
                  {REPORT_TYPES.map((rt) => (
                    <TouchableOpacity
                      key={rt.key}
                      style={[styles.rtOption, reportType === rt.key && styles.rtOptionActive]}
                      onPress={() => setReportType(rt.key)}
                    >
                      <Text style={[styles.rtOptionText, reportType === rt.key && styles.rtOptionTextActive]}>
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Tanggal</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity style={styles.dateNavBtn} onPress={() => shiftDate(-1)}>
                    <Ionicons name="chevron-back" size={18} color={C.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={14} color={C.accent} style={{ marginRight: 6 }} />
                    <Text style={styles.dateInputText}>{getDateLabel()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateNavBtn} onPress={() => shiftDate(1)}>
                    <Ionicons name="chevron-forward" size={18} color={C.white} />
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate} mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setSelectedDate(d); }}
                    maximumDate={new Date()} minimumDate={new Date(2024, 0, 1)}
                  />
                )}
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Kasir</Text>
                <TouchableOpacity style={styles.kasirSelectBtn} onPress={() => setShowKasirPicker(true)}>
                  <Ionicons name="person-circle-outline" size={16} color={C.accent} style={{ marginRight: 8 }} />
                  <Text style={styles.kasirSelectText} numberOfLines={1}>
                    {(selectedKasir && allKasirForPicker.find((k) => String(k.id) === String(selectedKasir))?.name) || 'Semua Kasir'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Cari Produk / Invoice / Pelanggan</Text>
                <View style={styles.searchWrap}>
                  <Ionicons name="search-outline" size={15} color={C.textMuted} style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Ketik untuk mencari..."
                    placeholderTextColor="#888888"
                    value={searchProduct}
                    onChangeText={setSearchProduct}
                  />
                  {searchProduct
                    ? <TouchableOpacity onPress={() => setSearchProduct('')}>
                        <Ionicons name="close-circle" size={15} color={C.textMuted} />
                      </TouchableOpacity>
                    : null
                  }
                </View>
              </View>

              <TouchableOpacity style={styles.filterBtn} onPress={fetchTransactions}>
                <Ionicons name="filter" size={14} color={C.white} style={{ marginRight: 6 }} />
                <Text style={styles.filterBtnText}>Terapkan Filter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard icon="logo-usd"        label="Total Penjualan"      value={fmtCurrency(totalPendapatan)} color={C.accent}    />
          <SummaryCard icon="receipt-outline"  label="Jumlah Transaksi"     value={String(filtered.length)}      color={C.accent}    />
          <SummaryCard icon="pricetag-outline" label="Total Diskon"         value={fmtCurrency(totalDiskon)}     color={C.accentAlt} />
          <SummaryCard icon="cube-outline"     label="Total Produk Terjual" value={String(totalProduk)}          color={C.accent}    />
        </View>

        {/* Transaksi */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-outline" size={40} color={C.textMuted} />
            </View>
            <Text style={styles.emptyText}>Tidak ada data transaksi</Text>
            <Text style={styles.emptySubText}>untuk periode yang dipilih</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([method, txList]) => (
            <PaymentGroup
              key={method}
              method={method}
              transactions={txList}
              onStruk={handleShowStruk}
              loadingId={loadingReceiptId}
              currentUserName={currentUserName}
            />
          ))
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modal Pilih Kasir */}
      <Modal visible={showKasirPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowKasirPicker(false)}
        />
        <View style={styles.kasirModal}>
          <View style={styles.kasirModalHandle} />
          <View style={styles.kasirModalHeader}>
            <Text style={styles.kasirModalTitle}>Pilih Kasir</Text>
            <TouchableOpacity onPress={() => setShowKasirPicker(false)}>
              <Ionicons name="close" size={22} color={C.textSec} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: '__all__', name: 'Semua Kasir' }, ...allKasirForPicker]}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const isAll    = item.id === '__all__';
              const isActive = isAll
                ? selectedKasir === ''
                : String(selectedKasir) === String(item.id);
              const isMe     = !isAll && item.name.toLowerCase().trim() === currentUserName.toLowerCase().trim();
              return (
                <TouchableOpacity
                  style={[styles.kasirItem, isActive && styles.kasirItemActive]}
                  onPress={() => { setSelectedKasir(isAll ? '' : String(item.id)); setShowKasirPicker(false); }}
                >
                  <View style={styles.kasirItemLeft}>
                    <View style={[styles.kasirAvatar, { backgroundColor: isActive ? C.accentDim : '#F0F0F0' }]}>
                      <Ionicons
                        name={isAll ? 'people-outline' : 'person-outline'}
                        size={16}
                        color={isActive ? C.accent : C.davys}
                      />
                    </View>
                    <View>
                      <Text style={[styles.kasirItemName, isActive && { color: C.accent, fontWeight: '700' }]}>
                        {item.name}
                      </Text>
                      {isMe && <Text style={styles.kasirItemSub}>Akun Anda</Text>}
                    </View>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <StrukModal
        visible={showStruk}
        receiptData={selectedReceipt}
        onClose={() => { setShowStruk(false); setSelectedReceipt(null); }}
        showPrintBtn={true}
      />
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.headerBg,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 16, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: '700' },
  headerSub:   { color: '#AAAAAA', fontSize: 11, marginTop: 2 },
  refreshBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#FFFFFF15',
    justifyContent: 'center', alignItems: 'center',
  },

  filterBox: {
    backgroundColor: C.filterBg,
    margin: 14, borderRadius: 12, overflow: 'hidden',
  },
  filterToggleBar: {
    backgroundColor: C.accent,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  filterToggleLabel: { color: C.white, fontSize: 14, fontWeight: '600' },
  filterBody:        { padding: 16, gap: 12 },
  filterGroup:       { gap: 7 },
  filterLabel:       { color: '#BBBBBB', fontSize: 12, fontWeight: '500' },

  rtWrap: { flexDirection: 'row', gap: 8 },
  rtOption: {
    flex: 1, paddingVertical: 9, borderRadius: 8,
    backgroundColor: '#444444', borderWidth: 1, borderColor: '#555555', alignItems: 'center',
  },
  rtOptionActive:     { backgroundColor: C.accent, borderColor: C.accent },
  rtOptionText:       { color: '#AAAAAA', fontSize: 12, fontWeight: '500' },
  rtOptionTextActive: { color: C.white, fontWeight: '700' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateNavBtn: {
    width: 42, height: 46, borderRadius: 8,
    backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center',
  },
  dateInput: {
    flex: 1, height: 46, borderRadius: 8,
    backgroundColor: '#444444', borderWidth: 1, borderColor: '#555555',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },
  dateInputText: { color: C.white, fontSize: 13, flex: 1 },

  kasirSelectBtn: {
    height: 46, borderRadius: 8,
    backgroundColor: '#444444', borderWidth: 1, borderColor: '#555555',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },
  kasirSelectText: { color: C.white, fontSize: 13, flex: 1 },

  searchWrap: {
    height: 46, borderRadius: 8,
    backgroundColor: '#3A3A3A', borderWidth: 1, borderColor: '#555555',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: C.white, fontSize: 13, padding: 0 },

  filterBtn: {
    height: 46, borderRadius: 8, backgroundColor: C.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  filterBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },

  summaryRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 14, gap: 10, marginBottom: 10,
  },
  sumCard: {
    width: '47%', backgroundColor: C.card,
    borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border, elevation: 2,
  },
  sumIcon: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  sumLabel: { color: C.textSec, fontSize: 10, marginBottom: 3 },
  sumValue: { fontSize: 13, fontWeight: '700' },

  pgWrap: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', elevation: 2,
  },
  pgTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },
  pgTitle:    { fontSize: 14, fontWeight: '700', color: C.textPri, flex: 1 },
  pgBadge: {
    backgroundColor: C.accentDim,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  pgBadgeText: { fontSize: 11, fontWeight: '600', color: C.accent },

  tableScroll: { borderTopWidth: 1, borderTopColor: C.border },
  tableHeadRow: {
    flexDirection: 'row', backgroundColor: '#F0F0F0',
    borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 9,
  },
  thCell: { fontSize: 11, fontWeight: '700', color: C.textSec, paddingHorizontal: 10 },

  tdRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingVertical: 11, alignItems: 'center',
  },
  tdCell:    { fontSize: 12, color: C.textPri, paddingHorizontal: 10 },
  tdInvoice: { fontSize: 12, fontWeight: '700', color: C.textPri, paddingHorizontal: 10 },

  struktBtn: {
    paddingVertical: 5, paddingHorizontal: 8,
    borderRadius: 6, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.accentDim,
  },
  struktBtnText: { color: C.accent, fontSize: 11, fontWeight: '600' },

  // More Detail
  moreDetailContainer: {
    borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 2,
  },
  progressBar: {
    height: 4, backgroundColor: '#EEEEEE',
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, borderRadius: 2, marginVertical: 6,
  },
  progressFill: { height: 4, width: '90%', backgroundColor: C.accent, borderRadius: 2 },
  progressDot:  { width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent, marginLeft: -1 },
  moreDetailBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  moreDetailBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },

  detailWrap: {
    marginHorizontal: 12, marginBottom: 10,
    borderRadius: 10, borderWidth: 1,
    borderColor: '#FFD9BC', backgroundColor: '#FFF8F4', overflow: 'hidden',
  },
  detailEmpty: { padding: 14, color: C.textMuted, fontSize: 12, textAlign: 'center' },
  detailItem:  { padding: 12 },
  detailItemBorder: { borderBottomWidth: 1, borderBottomColor: '#FFD9BC' },
  detailItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailItemName:   { fontSize: 13, fontWeight: '700', color: C.textPri, flex: 1 },
  detailItemBadge:  {
    backgroundColor: C.accentDim, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6,
  },
  detailItemBadgeText: { fontSize: 10, color: C.accent, fontWeight: '700' },
  detailGrid:    { flexDirection: 'row', gap: 8 },
  detailGridCol: { flex: 1, gap: 4 },
  detailRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  detailRowLabel: { fontSize: 11, color: C.textMuted, width: 70, fontWeight: '500' },
  detailRowValue: { fontSize: 12, color: C.textPri, fontWeight: '500', flex: 1 },

  pgFooter: {
    padding: 14, borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: '#FAFAFA', gap: 5,
  },
  pgFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pgFooterText: { color: C.textSec, fontSize: 12 },
  pgFooterVal:  { fontWeight: '700' },

  loadingWrap: { padding: 60, alignItems: 'center', gap: 12 },
  loadingText: { color: C.textSec, fontSize: 14 },
  emptyWrap:   { padding: 60, alignItems: 'center', gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyText:    { color: C.textPri, fontSize: 15, fontWeight: '600' },
  emptySubText: { color: C.textMuted, fontSize: 12 },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000055' },
  kasirModal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: 30, elevation: 10,
  },
  kasirModalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.borderDark, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  kasirModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 18, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  kasirModalTitle: { color: C.textPri, fontSize: 16, fontWeight: '700' },
  kasirItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  kasirItemActive: { backgroundColor: C.accentDim },
  kasirItemLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kasirAvatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  kasirItemName: { color: C.textPri, fontSize: 14 },
  kasirItemSub:  { color: C.accent, fontSize: 11, marginTop: 1 },
});