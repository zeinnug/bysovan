# ⚠️ DAFTAR ERROR MESSAGE YANG BELUM USER-FRIENDLY

**Dokumen ini mencatat semua tempat yang masih menampilkan error.message RAW dari API dalam bentuk technical/English yang belum diterjemahkan ke Bahasa Indonesia yang user-friendly.**

---

## 📍 ERROR YANG MASIH RAW (Belum User-Friendly)

### 1️⃣ **Struk.js - Error Print Receipt** ❌
**File**: `keduitan/Struk.js` **Line**: 302

**Kode Saat Ini:**
```javascript
Alert.alert('Gagal Mencetak', `${error.message || error}`, [{ text: 'OK' }]);
```

**Contoh Error yang Muncul:**
- `"Print cancelled by user"` (Bahasa Inggris)
- `"Printer not found"` (Bahasa Inggris)
- `"Permission denied: camera and print"` (Technical)

**Solusi**: Perlu function translator seperti `translateErrorMessage()`

---

### 2️⃣ **Struk.js - Error Save PDF** ❌
**File**: `keduitan/Struk.js` **Line**: 330

**Kode Saat Ini:**
```javascript
Alert.alert('Gagal', `${error.message || error}`, [{ text: 'OK' }]);
```

**Contoh Error yang Muncul:**
- `"Permission denied: write to external storage"` (Technical)
- `"File path invalid"` (Bahasa Inggris)
- `"Storage quota exceeded"` (Bahasa Inggris)

**Solusi**: Perlu function translator

---

### 3️⃣ **InventoryScreen.js - Error Load Inventory** ❌
**File**: `pages/InventoryScreen.js` **Line**: 271

**Kode Saat Ini:**
```javascript
Alert.alert('Error', error.message || 'Gagal memuat data produk');
```

**Contoh Error yang Muncul:**
- `"Network timeout"` (Bahasa Inggris)
- `"404 Not Found"` (HTTP Technical)
- `"ECONNREFUSED"` (Network Technical)

**Solusi**: Perlu function translator

---

### 4️⃣ **InventoryScreen.js - Error Delete Product** ❌
**File**: `pages/InventoryScreen.js` **Line**: 343

**Kode Saat Ini:**
```javascript
Alert.alert('Error', error.message || 'Gagal menghapus');
```

**Contoh Error yang Mungkin**:
- `"Product has active transactions"` (Bahasa Inggris)
- `"Cannot delete: foreign key constraint"` (Technical)
- `"Permission denied: only admin can delete"` (Technical)

**Solusi**: Perlu function translator

---

### 5️⃣ **InventoryScreen.js - Error Create Product** ❌
**File**: `pages/InventoryScreen.js` **Line**: 399

**Kode Saat Ini:**
```javascript
Alert.alert('Error', error.message);
```

**Contoh Error yang Mungkin**:
- `"Duplicate product code"` (Bahasa Inggris)
- `"Invalid SKU format"` (Technical)
- `"Brand not found in system"` (Bahasa Inggris)

**Solusi**: Perlu function translator

---

### 6️⃣ **EditProductModal.js - Error Update Product** ❌
**File**: `components/EditProductModal.js` **Line**: 105

**Kode Saat Ini:**
```javascript
Alert.alert('Error', error.message || 'Gagal memperbarui produk');
```

**Contoh Error yang Mungkin**:
- `"Product locked: another user is editing"` (Bahasa Inggris)
- `"Cannot update: stock has pending transactions"` (Bahasa Inggris)
- `"Invalid price change: exceeds limit"` (Technical)

**Solusi**: Perlu function translator

---

### 7️⃣ **HomeScreen.js - Error Load Dashboard Data** ❌
**File**: `pages/HomeScreen.js` **Line**: 514

**Kode Saat Ini:**
```javascript
Alert.alert('Peringatan', 'Gagal memuat data dari server. Menampilkan data contoh.\n\n' + error.message);
```

**Contoh Error yang Mungul**:
- `"Cannot read property 'transactions' of undefined"` (Technical)
- `"ECONNREFUSED: Connection refused"` (Network Technical)
- `"Request timeout after 30s"` (Technical)

**Solusi**: Perlu function translator

---

### 8️⃣ **QRScan.js - Error Scan QR Code** ❌
**File**: `keduitan/qrscan.js` **Line**: 341

**Kode Saat Ini:**
```javascript
let errorMessage = error.message || 'Terjadi kesalahan saat memindai QR Code';
```

**Contoh Error yang Mungkin**:
- `"Camera permission denied"` (Bahasa Inggris)
- `"Invalid QR format"` (Bahasa Inggris)
- `"Barcode not recognized"` (Bahasa Inggris)

**Solusi**: Ada validasi tapi bisa ditambah translator untuk fallback

---

## 📊 RINGKASAN

| # | File | Line | Status | Priority |
|---|------|------|--------|----------|
| 1 | Struk.js | 302 | ❌ RAW ERROR | 🔴 HIGH |
| 2 | Struk.js | 330 | ❌ RAW ERROR | 🔴 HIGH |
| 3 | InventoryScreen.js | 271 | ❌ RAW ERROR | 🟠 MEDIUM |
| 4 | InventoryScreen.js | 343 | ❌ RAW ERROR | 🟠 MEDIUM |
| 5 | InventoryScreen.js | 399 | ❌ RAW ERROR | 🟠 MEDIUM |
| 6 | EditProductModal.js | 105 | ❌ RAW ERROR | 🟠 MEDIUM |
| 7 | HomeScreen.js | 514 | ❌ RAW ERROR | 🟠 MEDIUM |
| 8 | qrscan.js | 341 | ⚡ PARTIAL | 🟡 LOW |

---

## 🎯 REKOMENDASI SOLUSI

### **Opsi 1: Extend `translateErrorMessage` Function** ✅ (RECOMMENDED)
Karena sudah ada function translator di `sold.js`, cita-cita export dan gunakan di semua file:

```javascript
// Di sold.js
export const translateErrorMessage = (errorMsg) => {
  // ... already implemented
};

// Di file lain, import dan gunakan:
import { translateErrorMessage } from '../keduitan/sold';

// Kemudian gunakan di error handler:
Alert.alert('Error', translateErrorMessage(error.message));
```

---

### **Opsi 2: Buat Utility File Baru** ✅
Buat file terpisah untuk error translator:

```
data/
└── constants/
    └── errorTranslations.js  ← FILE BARU
```

---

## ⏱️ ACTION ITEMS

### URGENT (🔴 HIGH PRIORITY)
- [ ] Fix Struk.js baris 302 - Error print receipt
- [ ] Fix Struk.js baris 330 - Error save PDF

### SOON (🟠 MEDIUM PRIORITY)
- [ ] Fix InventoryScreen.js baris 271, 343, 399
- [ ] Fix EditProductModal.js baris 105
- [ ] Fix HomeScreen.js baris 514

### NICE-TO-HAVE (🟡 LOW PRIORITY)
- [ ] Enhance qrscan.js baris 341 error handling

---

**Total Error Messages to Fix: 8**  
**Status**: ⏳ Pending (Ready for implementation)

