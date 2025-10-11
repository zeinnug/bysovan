import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const HistoryModal = ({ 
  visible, 
  onClose, 
  historyData 
}) => {
  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyItemProduct}>{item.produk}</Text>
        <Text style={[
          styles.historyItemAction,
          item.aksi === 'Tambah' ? styles.actionTambah : styles.actionKurang
        ]}>
          {item.aksi}
        </Text>
      </View>
      <View style={styles.historyItemDetails}>
        <Text style={styles.historyItemText}>
          Jumlah: {item.jumlah} unit
        </Text>
        <Text style={styles.historyItemText}>
          User: {item.user}
        </Text>
      </View>
      <Text style={styles.historyItemDate}>{item.tanggal}</Text>
    </View>
  );

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
            <Text style={styles.modalTitle}>Riwayat Inventory</Text>
            <TouchableOpacity onPress={onClose}>
              <Octicons name="x" size={24} color="#292929" />
            </TouchableOpacity>
          </View>

          {/* History List */}
          <FlatList
            data={historyData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderHistoryItem}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Octicons name="inbox" size={48} color="#585757" />
                <Text style={styles.emptyText}>Belum ada riwayat</Text>
              </View>
            }
          />

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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F5ECE4',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#292929',
  },
  historyItem: {
    backgroundColor: '#F5ECE4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#585757',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemProduct: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#292929',
    flex: 1,
  },
  historyItemAction: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionTambah: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
  },
  actionKurang: {
    backgroundColor: '#E74504',
    color: '#FFFFFF',
  },
  historyItemDetails: {
    marginBottom: 8,
  },
  historyItemText: {
    fontSize: 12,
    color: '#585757',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#585757',
  },
  closeModalButton: {
    backgroundColor: '#FC6A0A',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  closeModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default HistoryModal;