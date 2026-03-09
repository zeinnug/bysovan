// __tests__/transactionService.test.js
// White Box Testing — Sistem Penjualan (transactionService.js)
// Total: 42 test cases

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTransactions,
  createTransaction,
  getTransactionById,
  filterTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  addProductByQR,
} from '../data/services/transactionService';

// ─── Mock Setup ───────────────────────────────────────────────────────────────
jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const BASE_URL = 'https://testingaplikasi.tokosepatusovan.com/api';

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue('mock-token-123');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. getTransactions
// ═══════════════════════════════════════════════════════════════════════════════
describe('getTransactions', () => {
  test('TC-TS-01: berhasil mengambil semua transaksi', async () => {
    const mockData = { data: [{ id: 1, invoice_number: 'INV-001' }] };
    axios.get.mockResolvedValueOnce({ data: mockData });

    const result = await getTransactions();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(axios.get).toHaveBeenCalledWith(
      `${BASE_URL}/transactions`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mock-token-123' }),
      })
    );
  });

  test('TC-TS-02: gagal karena network error', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    const result = await getTransactions();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch transactions');
  });

  test('TC-TS-03: gagal karena response 401 Unauthorized', async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { message: 'Unauthenticated' } },
    });

    const result = await getTransactions();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthenticated');
  });

  test('TC-TS-04: token null tetap melanjutkan request', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    axios.get.mockResolvedValueOnce({ data: [] });

    const result = await getTransactions();

    expect(result.success).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      `${BASE_URL}/transactions`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer null' }),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. createTransaction — Validasi (Branch Coverage)
// ═══════════════════════════════════════════════════════════════════════════════
describe('createTransaction — validasi input', () => {
  test('TC-TS-05: gagal jika data null', async () => {
    const result = await createTransaction(null);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Produk tidak boleh kosong');
  });

  test('TC-TS-06: gagal jika products array kosong', async () => {
    const result = await createTransaction({ products: [] });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Produk tidak boleh kosong');
  });

  test('TC-TS-07: gagal jika tidak ada payment method', async () => {
    const result = await createTransaction({
      products: [{ product_id: 1, unit_code: 'BYS001' }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Metode pembayaran harus dipilih');
  });

  test('TC-TS-08: gagal jika payment method debit tapi tidak ada card_type', async () => {
    const result = await createTransaction({
      products: [{ product_id: 1, unit_code: 'BYS001' }],
      paymentMethod: 'debit',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Jenis kartu debit harus dipilih');
  });

  test('TC-TS-09: gagal jika produk tidak memiliki unit_code', async () => {
    const result = await createTransaction({
      products: [{ product_id: 1, unit_code: '' }],
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('produk tidak memiliki unit_code');
  });

  test('TC-TS-10: gagal jika produk tidak memiliki product_id', async () => {
    const result = await createTransaction({
      products: [{ unit_code: 'BYS001' }],
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('produk tidak memiliki unit_code');
  });

  test('TC-TS-11: gagal jika banyak produk invalid (2 produk invalid)', async () => {
    const result = await createTransaction({
      products: [
        { unit_code: '' },
        { unit_code: '  ' },
      ],
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('2 produk');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. createTransaction — Sukses
// ═══════════════════════════════════════════════════════════════════════════════
describe('createTransaction — sukses', () => {
  const validData = {
    products: [{ product_id: 1, unit_code: 'BYS001', quantity: 2 }],
    paymentMethod: 'cash',
    customerName: 'Budi',
    customerPhone: '081234567890',
    discountAmount: 0,
  };

  test('TC-TS-12: berhasil membuat transaksi tunai', async () => {
    axios.post.mockResolvedValueOnce({
      data: { id: 1, invoice_number: 'INV-001', status: 'success' },
      status: 200,
    });

    const result = await createTransaction(validData);

    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      `${BASE_URL}/transactions`,
      expect.objectContaining({
        payment_method: 'cash',
        customer_name: 'Budi',
      }),
      expect.any(Object)
    );
  });

  test('TC-TS-13: berhasil membuat transaksi debit dengan card_type', async () => {
    axios.post.mockResolvedValueOnce({
      data: { id: 2, invoice_number: 'INV-002' },
      status: 200,
    });

    const result = await createTransaction({
      ...validData,
      paymentMethod: 'debit',
      cardType: 'BCA',
    });

    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      `${BASE_URL}/transactions`,
      expect.objectContaining({
        payment_method: 'debit',
        card_type: 'BCA',
      }),
      expect.any(Object)
    );
  });

  test('TC-TS-14: card_type null jika payment method bukan debit', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 3 }, status: 200 });

    await createTransaction({
      ...validData,
      paymentMethod: 'qris',
      cardType: 'BCA', // harus diabaikan
    });

    const callPayload = axios.post.mock.calls[0][1];
    expect(callPayload.card_type).toBeNull();
  });

  test('TC-TS-15: overall_new_price diformat ke float jika ada', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 4 }, status: 200 });

    await createTransaction({
      ...validData,
      overallNewPrice: '150000',
    });

    const callPayload = axios.post.mock.calls[0][1];
    expect(callPayload.overall_new_price).toBe(150000);
  });

  test('TC-TS-16: overall_new_price null jika tidak diisi', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 5 }, status: 200 });

    await createTransaction(validData);

    const callPayload = axios.post.mock.calls[0][1];
    expect(callPayload.overall_new_price).toBeNull();
  });

  test('TC-TS-17: unit_code di-uppercase saat dikirim ke API', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 6 }, status: 200 });

    await createTransaction({
      products: [{ product_id: 1, unit_code: 'bys001', quantity: 1 }],
      paymentMethod: 'cash',
    });

    const callPayload = axios.post.mock.calls[0][1];
    expect(callPayload.products[0].unit_code).toBe('BYS001');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. createTransaction — Error Handling
// ═══════════════════════════════════════════════════════════════════════════════
describe('createTransaction — error handling', () => {
  const validData = {
    products: [{ product_id: 1, unit_code: 'BYS001', quantity: 1 }],
    paymentMethod: 'cash',
  };

  test('TC-TS-18: menangani error dengan response.data.message', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Stok tidak cukup' } },
    });

    const result = await createTransaction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Stok tidak cukup');
  });

  test('TC-TS-19: menangani error dengan response.data.error', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: 'Server Error' } },
    });

    const result = await createTransaction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Server Error');
  });

  test('TC-TS-20: menangani Laravel validation errors (errors object)', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          errors: { products: ['The products field is required.'] },
        },
      },
    });

    const result = await createTransaction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('The products field is required.');
  });

  test('TC-TS-21: menangani error tanpa response (network error)', async () => {
    axios.post.mockRejectedValueOnce({ message: 'timeout' });

    const result = await createTransaction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('timeout');
  });

  test('TC-TS-22: default error message jika tidak ada detail', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: {} } });

    const result = await createTransaction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Gagal membuat transaksi');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. getTransactionById
// ═══════════════════════════════════════════════════════════════════════════════
describe('getTransactionById', () => {
  test('TC-TS-23: berhasil mengambil transaksi by ID', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 1, invoice_number: 'INV-001' } });

    const result = await getTransactionById(1);

    expect(result.success).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      `${BASE_URL}/transactions/1`,
      expect.any(Object)
    );
  });

  test('TC-TS-24: gagal jika ID tidak ditemukan (404)', async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { message: 'Transaction not found' } },
    });

    const result = await getTransactionById(999);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transaction not found');
  });

  test('TC-TS-25: gagal karena network error', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    const result = await getTransactionById(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch transaction');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. filterTransactions
// ═══════════════════════════════════════════════════════════════════════════════
describe('filterTransactions', () => {
  test('TC-TS-26: filter berdasarkan tanggal', async () => {
    axios.get.mockResolvedValueOnce({ data: { transactions: [] } });

    await filterTransactions({ date: '2025-01-01' });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('date=2025-01-01'),
      expect.any(Object)
    );
  });

  test('TC-TS-27: filter berdasarkan payment_method', async () => {
    axios.get.mockResolvedValueOnce({ data: { transactions: [] } });

    await filterTransactions({ payment_method: 'cash' });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('payment_method=cash'),
      expect.any(Object)
    );
  });

  test('TC-TS-28: filter berdasarkan range tanggal (startDate & endDate)', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    await filterTransactions({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });

    const calledUrl = axios.get.mock.calls[0][0];
    expect(calledUrl).toContain('start_date=2025-01-01');
    expect(calledUrl).toContain('end_date=2025-01-31');
  });

  test('TC-TS-29: filter berdasarkan keyword', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    await filterTransactions({ keyword: 'Budi' });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('keyword=Budi'),
      expect.any(Object)
    );
  });

  test('TC-TS-30: filter berhasil mengembalikan data', async () => {
    const mockData = { transactions: [{ id: 1 }, { id: 2 }] };
    axios.get.mockResolvedValueOnce({ data: mockData });

    const result = await filterTransactions({ date: '2025-01-01' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });

  test('TC-TS-31: gagal filter mengembalikan data array kosong', async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { message: 'Server Error' } },
    });

    const result = await filterTransactions({ date: '2025-01-01' });

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. updateTransaction
// ═══════════════════════════════════════════════════════════════════════════════
describe('updateTransaction', () => {
  test('TC-TS-32: berhasil update transaksi', async () => {
    axios.put.mockResolvedValueOnce({ data: { id: 1, status: 'updated' } });

    const result = await updateTransaction(1, { notes: 'Updated notes' });

    expect(result.success).toBe(true);
    expect(axios.put).toHaveBeenCalledWith(
      `${BASE_URL}/transactions/1`,
      { notes: 'Updated notes' },
      expect.any(Object)
    );
  });

  test('TC-TS-33: gagal update karena 404', async () => {
    axios.put.mockRejectedValueOnce({
      response: { data: { message: 'Transaction not found' } },
    });

    const result = await updateTransaction(999, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transaction not found');
  });

  test('TC-TS-34: gagal update default error message', async () => {
    axios.put.mockRejectedValueOnce(new Error('Network Error'));

    const result = await updateTransaction(1, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update transaction');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. deleteTransaction
// ═══════════════════════════════════════════════════════════════════════════════
describe('deleteTransaction', () => {
  test('TC-TS-35: berhasil menghapus transaksi', async () => {
    axios.delete.mockResolvedValueOnce({ data: { message: 'Deleted' } });

    const result = await deleteTransaction(1);

    expect(result.success).toBe(true);
    expect(axios.delete).toHaveBeenCalledWith(
      `${BASE_URL}/transactions/1`,
      expect.any(Object)
    );
  });

  test('TC-TS-36: gagal hapus karena 403 Forbidden', async () => {
    axios.delete.mockRejectedValueOnce({
      response: { data: { message: 'Access denied' } },
    });

    const result = await deleteTransaction(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
  });

  test('TC-TS-37: gagal hapus default error message', async () => {
    axios.delete.mockRejectedValueOnce(new Error());

    const result = await deleteTransaction(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete transaction');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. getTransactionStats
// ═══════════════════════════════════════════════════════════════════════════════
describe('getTransactionStats', () => {
  test('TC-TS-38: berhasil mengambil statistik tanpa params', async () => {
    axios.get.mockResolvedValueOnce({ data: { total: 5000000, count: 10 } });

    const result = await getTransactionStats();

    expect(result.success).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      `${BASE_URL}/transactions/stats?`,
      expect.any(Object)
    );
  });

  test('TC-TS-39: berhasil mengambil statistik dengan filter tanggal', async () => {
    axios.get.mockResolvedValueOnce({ data: { total: 1000000 } });

    await getTransactionStats({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });

    const calledUrl = axios.get.mock.calls[0][0];
    expect(calledUrl).toContain('start_date=2025-01-01');
    expect(calledUrl).toContain('end_date=2025-01-31');
  });

  test('TC-TS-40: gagal mengambil statistik', async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { message: 'Server Error' } },
    });

    const result = await getTransactionStats();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Server Error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. addProductByQR
// ═══════════════════════════════════════════════════════════════════════════════
describe('addProductByQR', () => {
  test('TC-TS-41: berhasil menemukan produk via QR code', async () => {
    const mockProduct = { id: 1, name: 'Sepatu A', unit_code: 'BYS001' };
    axios.get.mockResolvedValueOnce({ data: mockProduct });

    const result = await addProductByQR('BYS001');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProduct);
    expect(axios.get).toHaveBeenCalledWith(
      `${BASE_URL}/products/qr/BYS001`,
      expect.any(Object)
    );
  });

  test('TC-TS-42: gagal jika QR code tidak ditemukan', async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { message: 'Product not found' } },
    });

    const result = await addProductByQR('INVALID_CODE');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Product not found');
  });
});