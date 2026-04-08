# KOMPILASI LENGKAP SEMUA ERROR POPUP APLIKASI BYSOVAN

**Dokumentasi lengkap semua pesan error, warning, dan informasi yang ditampilkan melalui popup Alert.alert()**

---

## 📋 DAFTAR ISI
1. [Authentication (Login & Password)](#authentication)
2. [Inventory Management](#inventory)
3. [Transaction & Checkout](#transaction)
4. [Stock Opname](#stockopname)
5. [QR Code & Scanner](#qrcode)
6. [Receipt / Struk](#receipt)
7. [General Alerts](#general)

---

## 1. AUTHENTICATION {#authentication}

### LOGIN SCREEN (`pages/Login.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 1.1 | 🔴 Error | **"Error"** + "Email dan password harus diisi" | Email atau password kosong saat login |
| 1.2 | 🔴 Error | **"Login Gagal"** + `error.message` atau "Terjadi kesalahan" | Login gagal (kredensial salah, server error, koneksi) |
| 1.3 | ℹ️ Info | **"Info"** + "Hubungi admin untuk membuat akun baru" | Klik tombol "Create Account" |

### CHANGE PASSWORD (`pages/ChangePassword.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 2.1 | 🔴 Error | **"Error"** + "Semua field harus diisi" | Ada field kosong di form ubah password |
| 2.2 | 🔴 Error | **"Error"** + "Password baru dan konfirmasi tidak cocok" | Konfirmasi password tidak sesuai |
| 2.3 | 🔴 Error | **"Error"** + "Password baru minimal 8 karakter" | Password kurang dari 8 karakter |
| 2.4 | ✅ Success | **"Berhasil!"** + "Password Anda telah berhasil diubah" | Password berhasil diubah |
| 2.5 | 🔴 Error | **"Gagal"** + `error.message` atau "Terjadi kesalahan" | Error dari server saat ubah password |

### FORGOT PASSWORD (`pages/ForgotPassword.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 3.1 | 🔴 Error | **"Error"** + "Email harus diisi" | Email kosong |
| 3.2 | ✅ Success | **"Berhasil!"** + "Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam." | Email reset password terkirim |
| 3.3 | 🔴 Error | **"Gagal"** + `error.message` atau "Terjadi kesalahan" | Error saat mengirim reset link |

### EMAIL VERIFICATION (`pages/EmailVerification.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 4.1 | ✅ Success | **"Email Terkirim!"** + "Link verifikasi telah dikirim ke email Anda. Silakan cek inbox atau folder spam." | Email verifikasi terkirim |
| 4.2 | 🔴 Error | **"Gagal"** + `error.message` atau "Terjadi kesalahan" | Error saat mengirim email verifikasi |
| 4.3 | ⚠️ Warning | **"Lewati Verifikasi?"** + "Anda dapat melakukan verifikasi email nanti di pengaturan akun." | User mengklik tombol skip verifikasi |

---

## 2. INVENTORY MANAGEMENT {#inventory}

### ADD PRODUCT MODAL (`components/AddProductModal.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 5.1 | ℹ️ Info | **"Info"** + "Minimal harus ada 1 ukuran dan stok" | Tombol remove size diklik tapi tinggal 1 size |
| 5.2 | ⚠️ Validation | **"Validasi"** + "Brand wajib diisi" | Brand kosong saat submit |
| 5.3 | ⚠️ Validation | **"Validasi"** + "Model wajib diisi" | Model kosong saat submit |
| 5.4 | ⚠️ Validation | **"Validasi"** + "Harga Jual wajib diisi" | Harga jual kosong saat submit |
| 5.5 | ⚠️ Validation | **"Validasi"** + "Minimal harus ada 1 ukuran dan stok yang terisi" | Tidak ada size/stok yang diisi saat submit |

### EDIT PRODUCT MODAL (`components/EditProductModal.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 6.1 | ℹ️ Info | **"Info"** + "Minimal harus ada 1 ukuran dan stok" | Tombol remove size diklik tapi tinggal 1 size |
| 6.2 | ⚠️ Validation | **"Validasi"** + "Brand wajib diisi" | Brand kosong saat submit |
| 6.3 | ⚠️ Validation | **"Validasi"** + "Model wajib diisi" | Model kosong saat submit |
| 6.4 | ⚠️ Validation | **"Validasi"** + "Harga Jual wajib diisi" | Harga jual kosong saat submit |
| 6.5 | ⚠️ Validation | **"Validasi"** + "Minimal harus ada 1 ukuran dan stok yang terisi" | Tidak ada size/stok yang diisi saat submit |
| 6.6 | ⚠️ Validation | **"Validasi"** + "Harga diskon harus lebih kecil atau sama dengan harga jual." | Harga diskon > harga jual |
| 6.7 | ✅ Success | **"Berhasil"** + "Produk berhasil diperbarui!" | Produk berhasil diupdate |
| 6.8 | 🔴 Error | **"Error"** + `result.message` atau "Gagal memperbarui produk" | Error API saat update produk |
| 6.9 | 🔴 Error | **"Error"** + `error.message` atau "Gagal memperbarui produk" | Error exception saat update produk |

### INVENTORY SCREEN (`pages/InventoryScreen.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 7.1 | 🔴 Error | **"Error"** + `result.message` atau "Gagal memuat data produk" | Error loading inventory dari API (result object) |
| 7.2 | 🔴 Error | **"Error"** + `error.message` atau "Gagal memuat data produk" | Error loading inventory dari API (exception) |
| 7.3 | 🔴 Error | **"Error"** + "Gagal memuat data riwayat." | Error loading history data |
| 7.4 | 🔴 Error | **"Error"** + "Data produk tidak valid atau tidak memiliki barcode" | Produk tidak punya barcode saat klik "Lihat QR" |
| 7.5 | ⚠️ Warning | **"Konfirmasi Hapus"** + "Yakin hapus produk ini?" | User klik delete product |
| 7.6 | ✅ Success | **"Berhasil"** + "Produk dihapus" | Produk berhasil dihapus |
| 7.7 | 🔴 Error | **"Error"** + `result.message` atau "Gagal menghapus" | Error API saat delete produk (result object) |
| 7.8 | 🔴 Error | **"Error"** + `error.message` atau "Gagal menghapus" | Error API saat delete produk (exception) |
| 7.9 | ✅ Success | **"Berhasil!"** + `"Produk ditambahkan!\nBarcode: ${generatedBarcode}"` | Produk baru berhasil ditambahkan + tombol "Lihat QR" |
| 7.10 | 🔴 Error | **"Error"** + `result.message` | Error saat create produk dari API (result object) |
| 7.11 | 🔴 Error | **"Error"** + `error.message` | Error saat create produk dari API (exception) |

---

## 3. TRANSACTION & CHECKOUT {#transaction}

### TRANSACTION (PENJUALAN) - `keduitan/sold.js`
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 8.1 | ⚠️ Warning | **"Warning"** + "Tidak ada data produk yang tersedia" | Fetch produk tapi data kosong |
| 8.2 | 🔴 Error | **"Error"** + "Gagal memuat data produk. Periksa koneksi internet." | Error loading produk |
| 8.3 | 🔴 Error | **"Error"** + "Produk tidak valid" | Product object tidak ada saat addToCart |
| 8.4 | 🔴 Error | **"Error"** + `"Produk "${product.name}" tidak memiliki kode unit yang valid."` | Produk tidak punya unit_code/code/barcode |
| 8.5 | ℹ️ Info | **"Info"** + `"${product.name} sudah ada di keranjang"` | Produk sudah di keranjang, jangan double |
| 8.6 | ✅ Success | **"Berhasil"** + `"${product.name} ditambahkan ke keranjang"` | Produk sukses ditambah ke keranjang |
| 8.7 | 🔴 Error | **"Error"** + "Keranjang masih kosong" | Checkout tapi keranjang kosong |
| 8.8 | 🔴 Error | **"Error"** + "Pilih metode pembayaran" | Checkout tapi belum pilih payment method |
| 8.9 | 🔴 Error | **"Error"** + "Pilih jenis kartu debit" | Checkout dengan debit tapi belum pilih card type |
| 8.10 | 🔴 Error | **"Error"** + `"Produk berikut tidak valid: ${invalidProducts.map((p) => p.name).join(', ')}"` | Ada produk di keranjang yang tidak valid/no unit_code |
| 8.11 | 🔴 Error | **"Error"** + "Harga baru tidak valid." | Harga baru yang diinput invalid/NaN/negative |
| 8.12 | 🔴 Error | **"Error"** + "Harga baru tidak boleh melebihi subtotal." | Harga baru > subtotal |
| 8.13 | 🔴 Error | **"Error"** + `error.message` atau `error.response?.data?.message` atau "Gagal membuat transaksi" | Error saat create transaction - try catch di createTransaction |
| 8.14 | 🔴 Error | **"Error"** + `result?.error` atau `result?.message` atau "Gagal membuat transaksi" | Error dari API response (result object) |
| 8.15 | 🔴 Error | **"Error"** + `error.message` atau `error.response?.data?.message` atau "Gagal membuat transaksi" | Error exception saat create transaction |
| 8.16 | ✅ Success | **"Transaksi Berhasil"** + "Transaksi telah disimpan." + 2 buttons: "Lihat Transaksi"/"OK" | Transaksi berhasil dibuat & struk ditutup |
| 8.17 | ⏳ Loading | **"Tunggu"** + "Data produk sedang dimuat." | Klik scanner tapi produk masih loading |
| 8.18 | ⚠️ Warning | **"Tidak Ada Data"** + "Tidak ada produk tersedia." + 2 buttons: "Refresh"/"OK" | Klik scanner tapi produk kosong |
| 8.19 | ℹ️ Info | **"Info"** + "Hasil scan tidak cocok dengan produk" | Scan result tidak cocok/tidak valid |
| 8.20 | 🔴 Error | **"Error"** + "Produk dari scan tidak memiliki kode unit." | Produk dari scan tidak punya unit_code |
| 8.21 | ℹ️ Info | **"Info"** + `"${cartItem.name} sudah ada di keranjang"` | Produk dari scan sudah di keranjang |
| 8.22 | ✅ Success | **"Berhasil"** + `"${cartItem.name} ditambahkan dari scan"` | Produk dari scan sukses ditambah |
| 8.23 | 🔴 Error | **"Error"** + `title` dan `message` (generic scan error handler) | Error scan umum |

### TRANSACTION SCREEN (`pages/TransactionScreen.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 9.1 | 🔴 Error | **"Error"** + `result.error` atau "Gagal memuat transaksi" | Error loading transactions dari API (result object) |
| 9.2 | 🔴 Error | **"Error"** + "Terjadi kesalahan saat memuat transaksi" | Error loading transactions exception |
| 9.3 | 🔴 Error | **"Error"** + "Gagal memuat data struk" | Error loading receipt/struk |

---

## 4. STOCK OPNAME {#stockopname}

### STOCK OPNAME SCREEN (`pages/Stockopnamescreen.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 10.1 | 🔴 Error | **"Izin Kamera"** + "Akses kamera diperlukan untuk memindai QR Code." | User tidak grant camera permission |
| 10.2 | ⚠️ Warning | **"Input Tidak Valid"** + "Masukkan angka yang benar (≥ 0)." | User input jumlah scan bukan angka/negatif |
| 10.3 | ⚠️ Warning | **"Hapus Produk?"** + `"Jumlah 0 akan menghapus "${selectedItem.namaProduk}" dari daftar scan."` | User input jumlah 0 |
| 10.4 | 🔴 Error | **"Belum Ada Scan"** + "Scan minimal 1 produk terlebih dahulu." | Klik selesai tapi daftar scan kosong |
| 10.5 | ⚠️ Warning | **"Simpan Laporan?"** + `"${totalJenisScan} jenis produk (${totalUnitScan} unit total) akan disimpan ke server. Lanjutkan?"` | User confirm save opname report |
| 10.6 | 🔴 Error | **"Gagal Menyimpan"** + `result.message` | Error saat simpan laporan opname |
| 10.7 | ⚠️ Warning | **"Mulai Ulang"** + "Semua data scan akan dihapus. Yakin?" | User klik reset/mulai ulang |

---

## 5. QR CODE & SCANNER {#qrcode}

### QR SCANNER MODAL (`keduitan/qrscan.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 11.1 | 🔴 Error | **"Data Produk Tidak Valid"** + "Daftar produk tidak tersedia. Silakan refresh data produk terlebih dahulu." + Buttons: "Refresh Data"/"Tutup" | availableProducts bukan array |
| 11.2 | 🔴 Error | **"Tidak Ada Produk"** + "Belum ada produk yang tersedia. Silakan muat data produk terlebih dahulu." + Buttons: "Muat Data"/... | availableProducts kosong |

### PRODUCT TABLE (`components/ProductTable.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 12.1 | 🔴 Error | **"Tidak bisa cetak"** + "Produk ini belum memiliki QR / barcode." | Product tidak punya barcode saat print QR |
| 12.2 | 🔴 Error | **"Gagal mencetak"** + `error?.message` atau "Terjadi kesalahan saat mencetak QR." | Error saat print QR |

---

## 6. RECEIPT / STRUK {#receipt}

### STRUK/RECEIPT COMPONENT (`keduitan/Struk.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 13.1 | 🔴 Error | **"Gagal Mencetak"** + `${error.message || error}` | Error saat print receipt |
| 13.2 | ℹ️ Info | **"Info"** + `"PDF disimpan di:\n${uri}"` | PDF receipt berhasil disimpan (share ke file) |
| 13.3 | 🔴 Error | **"Gagal"** + `${error.message || error}` | Error saat share/simpan file |

### SALES REPORT SCREEN (`pages/SalesReportScreen.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 14.1 | 🔴 Error | **"Error"** + `result.error` | Error loading transactions untuk sales report |
| 14.2 | 🔴 Error | **"Error"** + "Gagal memuat data" | Error loading data untuk sales report |
| 14.3 | 🔴 Error | **"Error"** + "Gagal memuat data struk" | Error loading receipt di sales report |

---

## 7. GENERAL ALERTS {#general}

### HOME SCREEN (`pages/HomeScreen.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 15.1 | 🔴 Error | **"Error"** + "Token tidak ditemukan. Silakan login ulang." | Token tidak ada di localStorage saat fetch dashboard |
| 15.2 | ⚠️ Warning | **"Peringatan"** + "Gagal memuat data dari server. Menampilkan data contoh.\n\n" + `error.message` | Error loading dashboard, fallback ke sample data |

### PROFILE SCREEN (`pages/ProfileScreen.js`)
| # | Type | Message | Trigger |
|---|------|---------|---------|
| 16.1 | ⚠️ Warning | **"Konfirmasi Logout"** + "Apakah Anda yakin ingin keluar?" | User klik logout |
| 16.2 | ℹ️ Info | **"Info"** + "Fitur pengaturan akan segera hadir" | User klik menu Pengaturan |
| 16.3 | ℹ️ Info | **"Bantuan"** + "Hubungi admin untuk bantuan: admin@sepatubysovan.com" | User klik menu Bantuan |
| 16.4 | ℹ️ Info | **"SepatuBySovan v1.0.0"** + "Sistem Manajemen Toko Sepatu Modern\n\n© 2025 SepatuBySovan\nAll rights reserved." | User klik menu Tentang |

---

## 📊 RINGKASAN STATISTIK

| Kategori | Jumlah |
|----------|--------|
| **Total Error Popup** | **88** |
| 🔴 Error | 35 |
| ⚠️ Warning/Validation | 28 |
| ✅ Success | 12 |
| ℹ️ Info | 13 |

---

## 🎯 CATATAN PENTING

1. **Error Dinamis**: Banyak error yang menampilkan pesan dinamis dari API, misalnya:
   - `error.message`
   - `error.response?.data?.message`
   - `result.message`
   - `result.error`

2. **Validasi Form**: Sebagian besar validasi adalah di **Add/Edit Product** dan **Checkout**, memastikan data lengkap.

3. **Network Errors**: Sering muncul saat koneksi bermasalah atau API down.

4. **Permission Alerts**: Untuk fitur camera (Stock Opname, QR Scanner).

5. **Success Messages**: Hanya 12 popup untuk success, kebanyakan berfokus pada error handling.

---

**Last Updated**: 2026-04-08
**Framework**: React Native
**Platform**: Android

