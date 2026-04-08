// BYSOVAN/components/HistoryModal.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const HistoryModal = ({ 
  visible, 
  onClose, 
  historyData 
}) => {
  // Render sizes dalam format yang mudah dibaca
  const renderSizes = (sizes) => {
    if (!sizes || sizes.length === 0) return '-';
    return sizes.map(s => `${s.size} (${s.stock} unit)`).join(', ');
  };

  // Format harga ke Rupiah
  const formatPrice = (price) => {
    if (!price) return 'Rp 0';
    return `Rp ${parseInt(price).toLocaleString('id-ID')}`;
  };

  const renderHistoryItem = ({ item }) => {
    // Icon berdasarkan aksi
    const getActionIcon = () => {
      switch(item.action?.toLowerCase()) {
        case 'create':
        case 'tambah':
          return 'plus-circle';
        case 'update':
        case 'edit':
          return 'pencil';
        case 'delete':
        case 'hapus':
          return 'trash';
        default:
          return 'info';
      }
    };

    // Style berdasarkan aksi
    const getActionStyle = () => {
      switch(item.action?.toLowerCase()) {
        case 'create':
        case 'tambah':
          return styles.actionCreate;
        case 'update':
        case 'edit':
          return styles.actionUpdate;
        case 'delete':
        case 'hapus':
          return styles.actionDelete;
        default:
          return styles.actionDefault;
      }
    };

    // Label aksi
    const getActionLabel = () => {
      switch(item.action?.toLowerCase()) {
        case 'create':
          return 'TAMBAH PRODUK';
        case 'update':
          return 'UPDATE PRODUK';
        case 'delete':
          return 'HAPUS PRODUK';
        default:
          return item.action?.toUpperCase() || 'AKSI';
      }
    };

    return (
      <View style={styles.historyItem}>
        {/* Header dengan Timestamp */}
        <View style={styles.historyItemHeader}>
          <View style={styles.timestampContainer}>
            <Octicons name="clock" size={14} color="#585757" />
            <Text style={styles.historyItemDate}>{item.timestamp}</Text>
          </View>
          <View style={[styles.actionBadge, getActionStyle()]}>
            <Octicons name={getActionIcon()} size={14} color="#FFFFFF" />
            <Text style={styles.actionBadgeText}>{getActionLabel()}</Text>
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.productDetailsCard}>
          <View style={styles.productRow}>
            <Text style={styles.productLabel}>Brand:</Text>
            <Text style={styles.productValue}>{item.productData?.brand || '-'}</Text>
          </View>
          
          <View style={styles.productRow}>
            <Text style={styles.productLabel}>Model:</Text>
            <Text style={styles.productValue}>{item.productData?.model || '-'}</Text>
          </View>

          {item.productData?.color && (
            <View style={styles.productRow}>
              <Text style={styles.productLabel}>Warna:</Text>
              <Text style={styles.productValue}>{item.productData.color}</Text>
            </View>
          )}

          <View style={styles.productRow}>
            <Text style={styles.productLabel}>Harga Jual:</Text>
            <Text style={[styles.productValue, styles.priceText]}>
              {formatPrice(item.productData?.sellingPrice)}
            </Text>
          </View>

          {item.productData?.discountPrice && (
            <View style={styles.productRow}>
              <Text style={styles.productLabel}>Harga Diskon:</Text>
              <Text style={[styles.productValue, styles.discountText]}>
                {formatPrice(item.productData.discountPrice)}
              </Text>
            </View>
          )}

          {/* Sizes */}
          {item.productData?.sizes && item.productData.sizes.length > 0 && (
            <View style={styles.sizesContainer}>
              <Text style={styles.sizesLabel}>Ukuran & Stok:</Text>
              {item.productData.sizes.map((size, idx) => (
                <View key={idx} style={styles.sizeItem}>
                  <Octicons name="package" size={12} color="#FC6A0A" />
                  <Text style={styles.sizeText}>
                    Ukuran {size.size}: {size.stock} unit
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Barcode jika ada */}
          {item.productData?.barcode && (
            <View style={styles.barcodeContainer}>
              <Octicons name="code" size={14} color="#FC6A0A" />
              <Text style={styles.barcodeText}>
                Barcode: {item.productData.barcode}
              </Text>
            </View>
          )}
        </View>

        {/* User info jika ada */}
        {item.user && (
          <View style={styles.userInfo}>
            <Octicons name="person" size={12} color="#999" />
            <Text style={styles.userText}>Oleh: {item.user}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Octicons name="history" size={24} color="#F5ECE4" />
              <Text style={styles.modalTitle}>Riwayat Inventory</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
              <Octicons name="x" size={24} color="#F5ECE4" />
            </TouchableOpacity>
          </View>

          {/* History List */}
          <FlatList
            data={historyData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderHistoryItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Octicons name="inbox" size={64} color="#585757" />
                <Text style={styles.emptyText}>Belum ada riwayat</Text>
                <Text style={styles.emptySubText}>
                  Riwayat produk yang ditambahkan akan muncul di sini
                </Text>
              </View>
            }
          />

          {/* Footer dengan info */}
          {historyData.length > 0 && (
            <View style={styles.footerInfo}>
              <Text style={styles.footerInfoText}>
                Total {historyData.length} riwayat
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeModalButton}
            onPress={onClose}
          >
            <Text style={styles.closeModalText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxHeight: '85%',
    backgroundColor: '#F5ECE4',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#292929',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5ECE4',
  },
  closeIconButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  historyItem: {
    backgroundColor: '#292929',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#585757',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#585757',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#F5ECE4',
    fontWeight: '500',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionCreate: {
    backgroundColor: '#28a745',
  },
  actionUpdate: {
    backgroundColor: '#ffc107',
  },
  actionDelete: {
    backgroundColor: '#E74504',
  },
  actionDefault: {
    backgroundColor: '#585757',
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productDetailsCard: {
    backgroundColor: '#F5ECE4',
    borderRadius: 8,
    padding: 12,
  },
  productRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productLabel: {
    fontSize: 13,
    color: '#585757',
    fontWeight: '600',
    width: 110,
  },
  productValue: {
    fontSize: 13,
    color: '#292929',
    fontWeight: '500',
    flex: 1,
  },
  priceText: {
    color: '#FC6A0A',
    fontWeight: '700',
  },
  discountText: {
    color: '#28a745',
    fontWeight: '700',
  },
  sizesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#585757',
  },
  sizesLabel: {
    fontSize: 13,
    color: '#585757',
    fontWeight: '600',
    marginBottom: 6,
  },
  sizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingVertical: 2,
  },
  sizeText: {
    fontSize: 12,
    color: '#292929',
    fontWeight: '500',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#585757',
  },
  barcodeText: {
    fontSize: 12,
    color: '#FC6A0A',
    fontWeight: '600',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  userText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#585757',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerInfo: {
    backgroundColor: '#292929',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#585757',
  },
  footerInfoText: {
    fontSize: 12,
    color: '#F5ECE4',
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#FC6A0A',
    paddingVertical: 14,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E74504',
  },
  closeModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default HistoryModal;