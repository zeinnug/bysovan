// BYSOVAN/components/ProductTable.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Octicons } from '@expo/vector-icons';

const ProductTable = ({ 
  products, 
  onShowQR, 
  onEdit, 
  onDelete 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to page 1 when products change
  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  // Calculate pagination
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = products.slice(startIndex, endIndex);

  // Group products by brand/model for category headers
  const groupedProducts = currentProducts.reduce((acc, product) => {
    const key = `${product.merek} ${product.model}`.trim() || product.nama;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(product);
    return acc;
  }, {});

  const formatCurrency = (amount) => {
    const numeric =
      typeof amount === 'number'
        ? amount
        : Number.isFinite(parseFloat(amount))
        ? parseFloat(amount)
        : 0;
    return `Rp ${numeric.toLocaleString('id-ID')}`;
  };

  // Generate QR Code URL
  const generateQRCodeURL = (barcode) => {
    if (!barcode) return null;
    const encodedData = encodeURIComponent(barcode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodedData}`;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (products.length === 0) {
    return (
      <View style={styles.tableSection}>
        <View style={styles.emptyState}>
          <Octicons name="inbox" size={48} color="#585757" />
          <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tableSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colNo]}>No</Text>
            <Text style={[styles.headerCell, styles.colProduk]}>Produk</Text>
            <Text style={[styles.headerCell, styles.colUkuran]}>Ukuran</Text>
            <Text style={[styles.headerCell, styles.colWarna]}>Warna</Text>
            <Text style={[styles.headerCell, styles.colStok]}>Stok Sistem</Text>
            <Text style={[styles.headerCell, styles.colStok]}>Stok Fisik</Text>
            <Text style={[styles.headerCell, styles.colHarga]}>Harga Jual</Text>
            <Text style={[styles.headerCell, styles.colHarga]}>Harga Diskon</Text>
            <Text style={[styles.headerCell, styles.colQR]}>QR Code</Text>
            <Text style={[styles.headerCell, styles.colActions]}>Actions</Text>
          </View>

          {/* Table Body */}
          {Object.entries(groupedProducts).map(([categoryName, items], groupIndex) => (
            <View key={`group-${groupIndex}`}>
              {/* Category Header Row */}
              <View style={styles.categoryRow}>
                <Text style={styles.categoryText}>{categoryName.toUpperCase()}</Text>
              </View>

              {/* Product Rows */}
              {items.map((product, index) => {
                const rowNumber = startIndex + (groupIndex > 0 
                  ? Object.values(groupedProducts)
                      .slice(0, groupIndex)
                      .reduce((sum, arr) => sum + arr.length, 0) 
                  : 0) + index + 1;

                return (
                  <View key={product.id} style={styles.productRow}>
                    {/* No */}
                    <View style={[styles.cell, styles.colNo]}>
                      <Text style={styles.cellText}>{rowNumber}</Text>
                    </View>

                    {/* Produk */}
                    <View style={[styles.cell, styles.colProduk]}>
                      <Text style={styles.cellText} numberOfLines={2}>
                        {product.nama}
                      </Text>
                    </View>

                    {/* Ukuran */}
                    <View style={[styles.cell, styles.colUkuran]}>
                      <Text style={styles.cellText}>{product.ukuran}</Text>
                    </View>

                    {/* Warna */}
                    <View style={[styles.cell, styles.colWarna]}>
                      <Text style={styles.cellText}>{product.warna}</Text>
                    </View>

                    {/* Stok Sistem */}
                    <View style={[styles.cell, styles.colStok]}>
                      <Text 
                        style={[
                          styles.cellText, 
                          styles.stokText,
                          product.stok <= 5 && styles.lowStockText
                        ]}
                      >
                        {product.stok}
                      </Text>
                    </View>

                    {/* Stok Fisik */}
                    <View style={[styles.cell, styles.colStok]}>
                      <Text 
                        style={[
                          styles.cellText, 
                          styles.stokText,
                          product.stok <= 5 && styles.lowStockText
                        ]}
                      >
                        {product.stok}
                      </Text>
                    </View>

                    {/* Harga Jual */}
                    <View style={[styles.cell, styles.colHarga]}>
                      <Text style={styles.cellText}>
                        {formatCurrency(product.hargaJual)}
                      </Text>
                    </View>

                    {/* Harga Diskon */}
                    <View style={[styles.cell, styles.colHarga]}>
                      <Text style={styles.cellText}>
                        {product.hargaDiskon > 0 
                          ? formatCurrency(product.hargaDiskon)
                          : '-'
                        }
                      </Text>
                    </View>

                    {/* QR Code */}
                    <View style={[styles.cell, styles.colQR]}>
                      {product.barcode ? (
                        <Image
                          source={{ uri: generateQRCodeURL(product.barcode) }}
                          style={styles.qrImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.noQRText}>-</Text>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={[styles.cell, styles.colActions]}>
                      <View style={styles.actionButtons}>
                        {/* Edit Button */}
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.editBtn]}
                          onPress={() => onEdit(product)}
                        >
                          <Octicons name="pencil" size={16} color="#FFFFFF" />
                        </TouchableOpacity>

                        {/* Print/QR Button */}
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.printBtn]}
                          onPress={() => onShowQR(product)}
                        >
                          <Octicons name="device-camera" size={16} color="#FFFFFF" />
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={() => onDelete(product.id)}
                        >
                          <Octicons name="trash" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationControls}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === 1 && styles.paginationButtonDisabled
              ]}
              onPress={handlePrevious}
              disabled={currentPage === 1}
            >
              <Octicons 
                name="chevron-left" 
                size={20} 
                color={currentPage === 1 ? '#999' : '#FFFFFF'} 
              />
              <Text 
                style={[
                  styles.paginationButtonText,
                  currentPage === 1 && styles.paginationButtonTextDisabled
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.pageNumberContainer}>
              <Text style={styles.pageNumber}>{currentPage}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === totalPages && styles.paginationButtonDisabled
              ]}
              onPress={handleNext}
              disabled={currentPage === totalPages}
            >
              <Text 
                style={[
                  styles.paginationButtonText,
                  currentPage === totalPages && styles.paginationButtonTextDisabled
                ]}
              >
                Next
              </Text>
              <Octicons 
                name="chevron-right" 
                size={20} 
                color={currentPage === totalPages ? '#999' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  tableContainer: {
    minWidth: 1200,
  },
  
  // ========== HEADER ==========
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FC6A0A',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  // ========== COLUMN WIDTHS ==========
  colNo: { width: 50 },
  colProduk: { width: 180 },
  colUkuran: { width: 80 },
  colWarna: { width: 120 },
  colStok: { width: 90 },
  colHarga: { width: 120 },
  colQR: { width: 100 },
  colActions: { width: 140 },

  // ========== CATEGORY ROW ==========
  categoryRow: {
    backgroundColor: '#FC6A0A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#E74504',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ========== PRODUCT ROW ==========
  productRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 70,
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cellText: {
    fontSize: 12,
    color: '#292929',
    textAlign: 'center',
  },
  stokText: {
    fontWeight: '600',
    fontSize: 14,
  },
  lowStockText: {
    color: '#E74504',
    fontWeight: 'bold',
  },

  // ========== QR CODE ==========
  qrImage: {
    width: 70,
    height: 70,
  },
  noQRText: {
    fontSize: 14,
    color: '#999',
  },

  // ========== ACTION BUTTONS ==========
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#3B82F6', // Blue
  },
  printBtn: {
    backgroundColor: '#10B981', // Green
  },
  deleteBtn: {
    backgroundColor: '#EF4444', // Red
  },

  // ========== PAGINATION ==========
  paginationContainer: {
    backgroundColor: '#292929',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: '#585757',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FC6A0A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: '#585757',
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  pageNumberContainer: {
    backgroundColor: '#F5ECE4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#292929',
  },

  // ========== EMPTY STATE ==========
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#585757',
  },
});

export default ProductTable;