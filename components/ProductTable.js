// BYSOVAN/components/ProductTable.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const ProductTable = ({ 
  products, 
  onShowQR, 
  onEdit, 
  onDelete 
}) => {
  const formatCurrency = (amount) => {
    const numeric =
      typeof amount === 'number'
        ? amount
        : Number.isFinite(parseFloat(amount))
        ? parseFloat(amount)
        : 0;
    return numeric.toLocaleString('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  return (
    <View style={styles.tableSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>Barcode</Text>
            <Text style={[styles.tableHeaderCell, { width: 150 }]}>Produk</Text>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>Kategori</Text>
            <Text style={[styles.tableHeaderCell, { width: 80 }]}>Ukuran</Text>
            <Text style={[styles.tableHeaderCell, { width: 80 }]}>Stok</Text>
            <Text style={[styles.tableHeaderCell, { width: 120 }]}>Harga Beli</Text>
            <Text style={[styles.tableHeaderCell, { width: 120 }]}>Harga Jual</Text>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>Action</Text>
          </View>

          {/* Table Body */}
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Octicons name="inbox" size={48} color="#585757" />
              <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
            </View>
          ) : (
            products.map((product, index) => (
              <View 
                key={product.id} 
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                ]}
              >
                <Text style={[styles.tableCell, { width: 100 }]}>
                  {product.barcode}
                </Text>
                <Text style={[styles.tableCell, { width: 150 }]} numberOfLines={2}>
                  {product.nama}
                </Text>
                <Text style={[styles.tableCell, { width: 100 }]}>
                  {product.kategori}
                </Text>
                <Text style={[styles.tableCell, { width: 80 }]}>
                  {product.ukuran}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  { width: 80 },
                  product.stok < 5 && styles.lowStock
                ]}>
                  {product.stok}
                </Text>
                <Text style={[styles.tableCell, { width: 120 }]}>
                  {formatCurrency(product.hargaBeli ?? 0)}
                </Text>
                <Text style={[styles.tableCell, { width: 120 }]}>
                  {formatCurrency(product.hargaJual ?? 0)}
                </Text>
                
                {/* Action Buttons */}
                <View style={[styles.tableCell, { 
                  width: 100, 
                  flexDirection: 'row', 
                  justifyContent: 'center' 
                }]}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => onShowQR(product)}
                  >
                    <Octicons name="device-camera" size={16} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => onEdit(product)}
                  >
                    <Octicons name="pencil" size={16} color="#FC6A0A" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => onDelete(product.id)}
                  >
                    <Octicons name="trash" size={16} color="#E74504" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tableSection: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#585757',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FC6A0A',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowEven: {
    backgroundColor: '#F9FAFB',
  },
  tableRowOdd: {
    backgroundColor: '#FFFFFF',
  },
  tableCell: {
    fontSize: 12,
    color: '#292929',
    textAlign: 'center',
  },
  lowStock: {
    color: '#E74504',
    fontWeight: 'bold',
  },
  actionButton: {
    padding: 8,
    marginHorizontal: 4,
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
});

export default ProductTable;