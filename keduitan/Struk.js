// keduitan/Struk.js
// Komponen Struk dengan expo-print (tanpa native module tambahan)

import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { translateErrorMessage } from './sold';

// ─── WARNA ───────────────────────────────────────────────────────────────────
const COLORS = {
  jet: '#292929', davysGray: '#585757', linen: '#F5ECE4',
  pumpkin: '#FC6A0A', goldenGate: '#E74504', white: '#FFFFFF',
  success: '#10B981', border: '#E0D8D0',
};

const RECEIPTS_STORAGE_KEY = 'sepatusovan_receipts';

// ─── HELPER: Format Rupiah ────────────────────────────────────────────────────
export const formatRupiah = (amount) => {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `Rp ${(amount || 0).toLocaleString('id-ID')}`;
  }
};

const getDatePrefix = (dateInput) => {
  const d = new Date(dateInput || Date.now());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const formatInvoiceNumber = (datePrefix, seq) => `${datePrefix}-${String(seq).padStart(3, '0')}`;

const getNextInvoiceSequence = async (datePrefix) => {
  const receipts = await getAllReceipts();
  const sequences = receipts
    .map((r) => String(r.invoice_number || ''))
    .map((invoiceNumber) => {
      const [prefix, suffix] = invoiceNumber.split('-');
      if (prefix === datePrefix && /^[0-9]{3}$/.test(suffix)) {
        return parseInt(suffix, 10);
      }
      return null;
    })
    .filter((value) => Number.isFinite(value));

  const maxSequence = sequences.length ? Math.max(...sequences) : 0;
  return maxSequence + 1;
};

export const saveReceiptToStorage = async (receiptData) => {
  try {
    const existing = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
    const receipts = existing ? JSON.parse(existing) : [];
    receipts.unshift({ ...receiptData, savedAt: new Date().toISOString() });
    await AsyncStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts.slice(0, 200)));
    return true;
  } catch (error) {
    console.error('❌ Save receipt failed:', error);
    return false;
  }
};

export const getAllReceipts = async () => {
  try {
    const data = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const getReceiptByInvoice = async (invoiceNumber) => {
  try {
    const receipts = await getAllReceipts();
    return receipts.find((r) => r.invoice_number === invoiceNumber) || null;
  } catch { return null; }
};

// ─── BUILD RECEIPT DATA ───────────────────────────────────────────────────────
export const buildReceiptData = async (
  transactionResponse, cartItems, customerData, calculatedTotal, discountAmount
) => {
  const now = new Date();
  const txData = transactionResponse?.data?.transaction || transactionResponse?.data || {};
  const datePrefix = getDatePrefix(txData.created_at || now);
  const invoiceNumber = txData.invoice_number || await formatInvoiceNumber(datePrefix, await getNextInvoiceSequence(datePrefix));

  return {
    store_name: 'Sepatu by Sovan',
    store_address: 'Jln Niti Semito No 43 Purwosari Kudus',
    store_phone: '08815671005',
    invoice_number: invoiceNumber,
    date: txData.created_at || now.toISOString(),
    cashier: txData.cashier_name || 'Kasir',
    customer_name: customerData?.customer_name || txData.customer_name || '-',
    customer_phone: customerData?.customer_phone || txData.customer_phone || null,
    payment_method: customerData?.payment_method || txData.payment_method || 'cash',
    card_type: customerData?.card_type || txData.card_type || null,
    notes: customerData?.notes || txData.notes || null,
    items: txData.items?.length > 0
      ? txData.items.map((item) => ({
          name: item.product_name || item.name,
          unit_code: item.unit_code || item.code,
          quantity: item.quantity,
          price: item.unit_price || item.price,
          subtotal: item.subtotal || item.quantity * (item.unit_price || item.price),
          color: item.color || null,
          size: item.size || null,
        }))
      : (cartItems || []).map((item) => ({
          name: item.name,
          unit_code: item.unit_code || item.code,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price,
          color: item.color || null,
          size: item.size || null,
        })),
    subtotal: txData.total_amount ||
      (cartItems || []).reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0) ||
      calculatedTotal || 0,
    discount_amount: txData.discount_amount || discountAmount || 0,
    final_total: txData.final_amount || calculatedTotal || 0,
    footer_message: 'Barang Tidak Sesuai Dapat Ditukarkan, Asalkan Belum Dipakai.',
    wa_group: 'Gabung grup WhatsApp kami untuk info diskon dan penawaran menarik!',
    wa_link: 'https://chat.whatsapp.com/CSX1DpfDfq928TaQMJ2a58?mode=ac_t',
  };
};

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
const formatReceiptDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return '-'; }
};

const formatPaymentMethod = (method, cardType) => {
  const m = (method || '').toLowerCase();
  if (m === 'cash') return 'Tunai';
  if (m === 'qris') return 'QRIS';
  if (m === 'transfer') return 'Transfer Bank';
  if (m === 'debit') return `Debit ${cardType || ''}`.trim();
  return method || '-';
};

// ─── GENERATE HTML STRUK ─────────────────────────────────────────────────────
const generateReceiptHTML = (receiptData) => {
  const totalQty = (receiptData.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
  const payLabel = formatPaymentMethod(receiptData.payment_method, receiptData.card_type);

  const itemsHTML = (receiptData.items || []).map((item) => {
    const detail = [item.color, item.size ? `Ukuran ${item.size}` : null].filter(Boolean).join(', ');
    return `
      <tr>
        <td colspan="2" class="item-name">
          ${item.name}${item.unit_code ? ` <span class="unit-code">(${item.unit_code})</span>` : ''}
          ${detail ? `<br/><span class="item-detail">${detail}</span>` : ''}
        </td>
      </tr>
      <tr>
        <td class="item-qty">${item.quantity} x ${formatRupiah(item.price)}</td>
        <td class="item-subtotal">${formatRupiah(item.subtotal)}</td>
      </tr>
    `;
  }).join('');

  const discountHTML = receiptData.discount_amount > 0 ? `
    <tr>
      <td class="summary-label">Diskon</td>
      <td class="summary-value discount">- ${formatRupiah(receiptData.discount_amount)}</td>
    </tr>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          width: 280px;
          margin: 0 auto;
          padding: 10px;
          color: #000;
        }
        .center { text-align: center; }
        .store-name { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
        .store-info { font-size: 10px; text-align: center; color: #444; margin-bottom: 2px; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .solid { border-top: 1px solid #000; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .info-table td { padding: 1px 0; font-size: 10px; vertical-align: top; }
        .info-label { width: 70px; color: #555; }
        .info-value { font-weight: 600; }
        .item-name { font-weight: 700; font-size: 11px; padding-top: 4px; }
        .unit-code { font-weight: normal; font-size: 10px; color: #555; }
        .item-detail { font-size: 10px; color: #666; font-weight: normal; }
        .item-qty { font-size: 10px; color: #555; padding-bottom: 4px; }
        .item-subtotal { text-align: right; font-weight: 700; font-size: 11px; padding-bottom: 4px; }
        .items-table { width: 100%; border-collapse: collapse; }
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .summary-label { font-size: 11px; color: #444; padding: 1px 0; }
        .summary-value { text-align: right; font-weight: 600; font-size: 11px; padding: 1px 0; }
        .discount { color: #10B981; }
        .total-row td { font-size: 14px; font-weight: 900; padding: 4px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
        .total-label { }
        .total-value { text-align: right; color: #FC6A0A; }
        .footer { text-align: center; font-size: 10px; color: #444; margin-top: 4px; line-height: 1.5; }
        .thank-you { font-size: 12px; font-weight: bold; text-align: center; margin: 6px 0 4px; }
        .wa-link { font-size: 9px; color: #FC6A0A; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="store-name">${receiptData.store_name}</div>
      <div class="store-info">${receiptData.store_address}</div>
      <div class="store-info">${receiptData.store_phone}</div>

      <div class="divider"></div>

      <table class="info-table">
        <tr><td class="info-label">Invoice:</td><td class="info-value">${receiptData.invoice_number}</td></tr>
        <tr><td class="info-label">Date:</td><td class="info-value">${formatReceiptDate(receiptData.date)}</td></tr>
        <tr><td class="info-label">Cashier:</td><td class="info-value">${receiptData.cashier}</td></tr>
        <tr><td class="info-label">Customer:</td><td class="info-value">${receiptData.customer_name || '-'}</td></tr>
      </table>

      <div class="divider"></div>

      <table class="items-table">
        ${itemsHTML}
      </table>

      <div class="divider"></div>

      <table class="info-table">
        <tr><td class="info-label">Total Qty:</td><td class="info-value">${totalQty}</td></tr>
      </table>

      <div class="divider"></div>

      <table class="summary-table">
        <tr>
          <td class="summary-label">Subtotal</td>
          <td class="summary-value">${formatRupiah(receiptData.subtotal)}</td>
        </tr>
        ${discountHTML}
        <tr class="total-row">
          <td class="total-label">TOTAL</td>
          <td class="total-value">${formatRupiah(receiptData.final_total)}</td>
        </tr>
        <tr>
          <td class="summary-label">Payment:</td>
          <td class="summary-value">${payLabel}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <div class="thank-you">Thank you for your purchase!</div>
      <div class="footer">${receiptData.footer_message || ''}</div>
      <div class="footer" style="margin-top:4px">${receiptData.wa_group || ''}</div>
      <div class="footer wa-link">${receiptData.wa_link || ''}</div>
    </body>
    </html>
  `;
};

// ─── PRINT via expo-print ─────────────────────────────────────────────────────
const printReceipt = async (receiptData, onStatus) => {
  try {
    onStatus?.('Membuka dialog cetak...');
    const html = generateReceiptHTML(receiptData);

    await Print.printAsync({
      html,
      // width: 204,  // 58mm printer (opsional, uncomment jika perlu)
    });

    onStatus?.('');
    return true;
  } catch (error) {
    onStatus?.('');
    if (error.message?.includes('cancelled') || error.message?.includes('cancel')) {
      // User cancel - tidak perlu alert
      return false;
    }
    Alert.alert('Gagal Mencetak', translateErrorMessage(error.message || error), [{ text: 'OK' }]);
    return false;
  }
};

// ─── SAVE AS PDF ──────────────────────────────────────────────────────────────
const saveAsPDF = async (receiptData, onStatus) => {
  try {
    onStatus?.('Membuat PDF...');
    const html = generateReceiptHTML(receiptData);
    const { uri } = await Print.printToFileAsync({ html });

    onStatus?.('Membuka share...');
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Struk ${receiptData.invoice_number}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Info', `PDF disimpan di:\n${uri}`);
    }

    onStatus?.('');
    return true;
  } catch (error) {
    onStatus?.('');
    Alert.alert('Gagal', translateErrorMessage(error.message || error), [{ text: 'OK' }]);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA: StrukModal
// ─────────────────────────────────────────────────────────────────────────────
export default function StrukModal({ visible, receiptData, onClose, showPrintBtn = true }) {
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState('');

  const handlePrint = useCallback(async () => {
    if (!receiptData) return;
    setPrinting(true);
    await printReceipt(receiptData, setPrintStatus);
    setPrinting(false);
    setPrintStatus('');
  }, [receiptData]);

  const handleSavePDF = useCallback(async () => {
    if (!receiptData) return;
    setPrinting(true);
    await saveAsPDF(receiptData, setPrintStatus);
    setPrinting(false);
    setPrintStatus('');
  }, [receiptData]);

  if (!receiptData) return null;

  const totalQty = (receiptData.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
  const payLabel = formatPaymentMethod(receiptData.payment_method, receiptData.card_type);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Struk Pembelian</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Konten Struk */}
          <ScrollView style={styles.receiptScroll} contentContainerStyle={styles.receiptContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.storeName}>{receiptData.store_name}</Text>
            <Text style={styles.storeAddress}>{receiptData.store_address}</Text>
            <Text style={styles.storePhone}>{receiptData.store_phone}</Text>

            <View style={styles.dashedLine} />

            <View style={styles.infoRow}><Text style={styles.infoLabel}>Invoice:</Text><Text style={styles.infoValue}>{receiptData.invoice_number}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Date:</Text><Text style={styles.infoValue}>{formatReceiptDate(receiptData.date)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Cashier:</Text><Text style={styles.infoValue}>{receiptData.cashier}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer:</Text><Text style={styles.infoValue}>{receiptData.customer_name || '-'}</Text></View>

            <View style={styles.dashedLine} />

            {(receiptData.items || []).map((item, idx) => (
              <View key={idx} style={styles.itemBlock}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}{item.unit_code ? ` (${item.unit_code})` : ''}
                </Text>
                <View style={styles.itemBottomRow}>
                  <Text style={styles.itemQtyPrice}>{item.quantity} x {formatRupiah(item.price)}</Text>
                  <Text style={styles.itemSubtotal}>{formatRupiah(item.subtotal)}</Text>
                </View>
                {(item.color || item.size) && (
                  <Text style={styles.itemDetail}>
                    {[item.color, item.size ? `Ukuran ${item.size}` : null].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            ))}

            <View style={styles.dashedLine} />
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Total Qty:</Text><Text style={styles.infoValue}>{totalQty}</Text></View>
            <View style={styles.dashedLine} />

            <View style={styles.infoRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{formatRupiah(receiptData.subtotal)}</Text></View>

            {receiptData.discount_amount > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.discountLabel}>Diskon</Text>
                <Text style={styles.discountValue}>- {formatRupiah(receiptData.discount_amount)}</Text>
              </View>
            )}

            <View style={[styles.infoRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatRupiah(receiptData.final_total)}</Text>
            </View>

            <View style={styles.infoRow}><Text style={styles.infoLabel}>Payment:</Text><Text style={styles.infoValue}>{payLabel}</Text></View>

            <View style={styles.dashedLine} />
            <Text style={styles.footerThankYou}>Thank you for your purchase!</Text>
            {receiptData.footer_message && <Text style={styles.footerNote}>{receiptData.footer_message}</Text>}
            {receiptData.wa_group && <Text style={styles.footerWa}>{receiptData.wa_group}</Text>}
            {receiptData.wa_link && <Text style={styles.footerLink}>{receiptData.wa_link}</Text>}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Tombol Aksi */}
          <View style={styles.actionArea}>
            {!!printStatus && (
              <View style={styles.printStatusRow}>
                <ActivityIndicator size="small" color={COLORS.pumpkin} />
                <Text style={styles.printStatusText}>{printStatus}</Text>
              </View>
            )}

            {showPrintBtn && (
              <View style={styles.btnRow}>
                {/* Tombol Print (buka dialog print Android/iOS) */}
                <TouchableOpacity
                  style={[styles.printBtn, printing && styles.printBtnDisabled]}
                  onPress={handlePrint}
                  disabled={printing}
                >
                  <Ionicons name="print-outline" size={18} color={COLORS.white} />
                  <Text style={styles.printBtnText}>
                    {printing ? 'Memproses...' : 'Cetak'}
                  </Text>
                </TouchableOpacity>

                {/* Tombol Simpan PDF */}
                <TouchableOpacity
                  style={[styles.pdfBtn, printing && styles.printBtnDisabled]}
                  onPress={handleSavePDF}
                  disabled={printing}
                >
                  <Ionicons name="document-outline" size={18} color={COLORS.pumpkin} />
                  <Text style={styles.pdfBtnText}>
                    {printing ? '...' : 'Simpan PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
              <Text style={styles.closeActionBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', overflow: 'hidden' },
  modalHeader: { backgroundColor: COLORS.jet, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  modalHeaderTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  receiptScroll: { flex: 1 },
  receiptContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  storeName: { fontSize: 18, fontWeight: '800', color: COLORS.jet, textAlign: 'center', letterSpacing: 0.5, marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  storeAddress: { fontSize: 12, color: COLORS.davysGray, textAlign: 'center', marginBottom: 2 },
  storePhone: { fontSize: 12, color: COLORS.davysGray, textAlign: 'center', marginBottom: 8 },
  dashedLine: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  infoLabel: { fontSize: 12, color: COLORS.davysGray, flex: 1 },
  infoValue: { fontSize: 12, color: COLORS.jet, fontWeight: '600', flex: 2, textAlign: 'right' },
  itemBlock: { marginBottom: 10 },
  itemName: { fontSize: 13, fontWeight: '700', color: COLORS.jet },
  itemBottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  itemQtyPrice: { fontSize: 12, color: COLORS.davysGray },
  itemSubtotal: { fontSize: 12, fontWeight: '700', color: COLORS.jet },
  itemDetail: { fontSize: 11, color: COLORS.davysGray, marginTop: 2 },
  summaryLabel: { fontSize: 13, color: COLORS.davysGray, flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '600', color: COLORS.jet },
  discountLabel: { fontSize: 13, color: COLORS.success, fontWeight: '600', flex: 1 },
  discountValue: { fontSize: 13, fontWeight: '700', color: COLORS.success },
  totalRow: { marginTop: 4, marginBottom: 4, paddingVertical: 6, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: COLORS.jet },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.jet, flex: 1 },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.pumpkin },
  footerThankYou: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: COLORS.jet, marginBottom: 8 },
  footerNote: { textAlign: 'center', fontSize: 11, color: COLORS.davysGray, lineHeight: 16, marginBottom: 6 },
  footerWa: { textAlign: 'center', fontSize: 11, color: COLORS.davysGray, marginBottom: 4 },
  footerLink: { textAlign: 'center', fontSize: 10, color: COLORS.pumpkin, textDecorationLine: 'underline' },
  actionArea: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 16, gap: 10 },
  printStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 4 },
  printStatusText: { fontSize: 13, color: COLORS.pumpkin, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10 },
  printBtn: { flex: 2, backgroundColor: COLORS.pumpkin, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 6 },
  printBtnDisabled: { opacity: 0.6 },
  printBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  pdfBtn: { flex: 1, backgroundColor: COLORS.linen, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: COLORS.pumpkin },
  pdfBtnText: { color: COLORS.pumpkin, fontSize: 13, fontWeight: '700' },
  closeActionBtn: { backgroundColor: COLORS.linen, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  closeActionBtnText: { color: COLORS.davysGray, fontSize: 14, fontWeight: '600' },
});