// ============================================================
// WHITE BOX TESTING - data/api.js
// Menguji: formatError(), formatResponse(), interceptors
// Framework: Jest
// ============================================================

import { formatError, formatResponse } from '../data/api';

// ============================================================
// TEST SUITE 1: formatError()
// Jalur Logika:
//   [FE1] error.response ada → return server error info
//   [FE2] error.request ada (tanpa response) → koneksi gagal
//   [FE3] error biasa (message saja) → return error.message
// ============================================================

describe('formatError()', () => {

  // ── [FE1] Server response dengan error ───────────────────
  describe('[FE1] Server merespon dengan error', () => {

    test('Harus return success: false dengan message dari server', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };

      const result = formatError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal Server Error');
      expect(result.statusCode).toBe(500);
    });

    test('Harus return fallback message jika data.message tidak ada', () => {
      const error = {
        response: {
          status: 500,
          data: {},
        },
      };

      const result = formatError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Terjadi kesalahan pada server');
    });

    test('Harus menyertakan errors jika ada di response data', () => {
      const mockErrors = { email: ['Email tidak valid'] };
      const error = {
        response: {
          status: 422,
          data: { message: 'Validasi gagal', errors: mockErrors },
        },
      };

      const result = formatError(error);

      expect(result.errors).toEqual(mockErrors);
      expect(result.statusCode).toBe(422);
    });

    test('Harus return errors: null jika tidak ada errors di response', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Bad Request' },
        },
      };

      const result = formatError(error);

      expect(result.errors).toBeNull();
    });
  });

  // ── [FE2] Request dikirim tapi tidak ada response ─────────
  describe('[FE2] Network error (request tanpa response)', () => {

    test('Harus return pesan koneksi gagal', () => {
      const error = {
        request: {},
        message: 'Network Error',
      };

      const result = formatError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      expect(result.statusCode).toBeNull();
    });
  });

  // ── [FE3] Error lainnya ───────────────────────────────────
  describe('[FE3] Error lainnya (bukan response, bukan request)', () => {

    test('Harus return error.message asli', () => {
      const error = {
        message: 'Something went wrong',
      };

      const result = formatError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Something went wrong');
      expect(result.statusCode).toBeNull();
    });

    test('Harus return fallback jika tidak ada message', () => {
      const error = {};

      const result = formatError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Terjadi kesalahan yang tidak diketahui');
    });
  });
});


// ============================================================
// TEST SUITE 2: formatResponse()
// Jalur Logika:
//   [FR1] response.data.data ada → return data dari nested
//   [FR2] response.data.data tidak ada → return response.data langsung
//   [FR3] message ada → return message
//   [FR4] message tidak ada → return 'Berhasil'
// ============================================================

describe('formatResponse()', () => {

  test('[FR1] Harus return nested data.data jika ada', () => {
    const response = {
      status: 200,
      data: {
        data: { id: 1, name: 'Test' },
        message: 'Berhasil mengambil data',
      },
    };

    const result = formatResponse(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: 'Test' });
    expect(result.statusCode).toBe(200);
  });

  test('[FR2] Harus return response.data langsung jika data.data tidak ada', () => {
    const response = {
      status: 200,
      data: { id: 1, name: 'Test' },
    };

    const result = formatResponse(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: 'Test' });
  });

  test('[FR3] Harus return message dari response', () => {
    const response = {
      status: 200,
      data: { message: 'Data berhasil disimpan' },
    };

    const result = formatResponse(response);

    expect(result.message).toBe('Data berhasil disimpan');
  });

  test('[FR4] Harus return "Berhasil" sebagai fallback message', () => {
    const response = {
      status: 200,
      data: {},
    };

    const result = formatResponse(response);

    expect(result.message).toBe('Berhasil');
  });
});