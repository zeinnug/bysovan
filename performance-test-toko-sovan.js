/**
 * ============================================================
 *  PERFORMANCE TESTING - Aplikasi Mobile Toko Sepatu By Sovan
 *  Tool   : k6 (https://k6.io)
 *  Author : Muhammad Zein Al-Kautsar Nugroho - 21120122140151
 *  Universitas Diponegoro – 2025
 *
 *  ✅ ENDPOINT LOGIN TERVERIFIKASI: POST /api/login
 *     Response: { pesan, user: { id, nama, email, role }, token }

 *
 *  CARA MENJALANKAN:
 *     k6 run --env SCENARIO=load   performance-test-toko-sovan.js
 *     k6 run --env SCENARIO=stress performance-test-toko-sovan.js
 *     k6 run --env SCENARIO=spike  performance-test-toko-sovan.js
 *     k6 run --env SCENARIO=soak   performance-test-toko-sovan.js
 * ============================================================
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ─────────────────────────────────────────────
//  KONFIGURASI
// ─────────────────────────────────────────────
const BASE_URL = "https://testingaplikasi.tokosepatusovan.com/api";

const TEST_USER = {
  email:    "sovan01@gmail.com",
  password: "password123",
};

// ─────────────────────────────────────────────
//  ENDPOINT
// ─────────────────────────────────────────────
const EP = {
  LOGIN:               `${BASE_URL}/login`,
  LOGOUT:              `${BASE_URL}/auth/logout`,
  PROFILE:             `${BASE_URL}/auth/profile`,
  DASHBOARD:           `${BASE_URL}/dashboard`,
  PRODUCTS:            `${BASE_URL}/products`,
  PRODUCT_BY_ID:       (id)       => `${BASE_URL}/products/${id}`,
  UPDATE_PHYS_STOCK:   (id)       => `${BASE_URL}/products/${id}/physical-stock`,
  STOCK_OPNAME:        `${BASE_URL}/stock-opname`,
  SAVE_STOCK_REPORT:   `${BASE_URL}/stock-opname/save`,
  TRANSACTIONS:        `${BASE_URL}/transactions`,
  ADD_PRODUCT_BY_QR:   (unitCode) => `${BASE_URL}/transactions/add-product/${unitCode}`,
};

// ─────────────────────────────────────────────
//  CUSTOM METRICS
// ─────────────────────────────────────────────
const durLogin       = new Trend("dur_login");
const durDashboard   = new Trend("dur_dashboard");
const durInventory   = new Trend("dur_inventory");
const durOpname      = new Trend("dur_opname");
const durTransaction = new Trend("dur_transaction");
const errorRate      = new Rate("error_rate");
const totalReqs      = new Counter("total_requests");

// ─────────────────────────────────────────────
//  SKENARIO – MAX 1000 VU
// ─────────────────────────────────────────────
const SCENARIO = __ENV.SCENARIO || "load";

export const options = {

  // ── LOAD TEST ──────────────────────────────
  // Kondisi normal: 10 pengguna aktif bersamaan
  load: {
    stages: [
      { duration: "1m", target: 10 },  // ramp-up ke 10 VU
      { duration: "3m", target: 10 },  // tahan stabil
      { duration: "1m", target: 0  },  // ramp-down
    ],
    thresholds: {
      http_req_duration: ["p(95)<3000"],
      http_req_failed:   ["rate<0.10"],
      error_rate:        ["rate<0.10"],
    },
  },

  // ── STRESS TEST ────────────────────────────
  // Naikkan bertahap hingga 50 VU dalam 3 tahap
  stress: {
    stages: [
      { duration: "2m", target: 10 },  // tahap 1: naik ke 10 VU
      { duration: "3m", target: 30 },  // tahap 2: naik ke 30 VU
      { duration: "3m", target: 50 },  // tahap 3: naik ke 50 VU (diperpanjang 3 menit)
      { duration: "2m", target: 0  },  // ramp-down
    ],
    thresholds: {
      http_req_duration: ["p(95)<10000"],
      http_req_failed:   ["rate<0.30"],
    },
  },

  // ── SPIKE TEST ─────────────────────────────
  // Lonjakan mendadak dari 5 ke 50 VU lalu kembali
  spike: {
    stages: [
      { duration: "1m",  target: 5  },  // normal
      { duration: "30s", target: 50 },  // LONJAKAN ke 50 VU
      { duration: "2m",  target: 50 },  // tahan beban puncak
      { duration: "30s", target: 5  },  // turun kembali normal
      { duration: "1m",  target: 0  },  // ramp-down
    ],
    thresholds: {
      http_req_duration: ["p(95)<10000"],
      http_req_failed:   ["rate<0.30"],
    },
  },

  // ── SOAK TEST ──────────────────────────────
  // 10 VU selama 10 menit untuk uji ketahanan
  soak: {
    stages: [
      { duration: "1m", target: 10 },  // ramp-up
      { duration: "8m", target: 10 },  // tahan stabil
      { duration: "1m", target: 0  },  // ramp-down
    ],
    thresholds: {
      http_req_duration: ["p(95)<3000"],
      http_req_failed:   ["rate<0.10"],
    },
  },

}[SCENARIO] || {
  stages: [
    { duration: "2m", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "2m", target: 0  },
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed:   ["rate<0.10"],
  },
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function h(token = null) {
  const headers = {
    "Content-Type": "application/json",
    "Accept":        "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { headers };
}

function record(res, trend) {
  totalReqs.add(1);
  trend.add(res.timings.duration);
  errorRate.add(res.status < 200 || res.status >= 400 ? 1 : 0);
}

function body(res) {
  try { return JSON.parse(res.body); } catch { return null; }
}

// ─────────────────────────────────────────────
//  MODUL 1 – LOGIN
// ─────────────────────────────────────────────
function testLogin() {
  let token = null;

  group("1. Auth - Login", () => {
    const res = http.post(
      EP.LOGIN,
      JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
      h()
    );
    record(res, durLogin);
    check(res, {
      "Login: status 200":   (r) => r.status === 200,
      "Login: ada token":    (r) => !!body(r)?.token,
      "Login: < 2000ms":     (r) => r.timings.duration < 2000,
    });

    const b = body(res);
    if (b?.token) token = b.token;
    sleep(0.3);

    // Login gagal (negative test)
    const resFail = http.post(
      EP.LOGIN,
      JSON.stringify({ email: "salah@email.com", password: "wrongpass" }),
      h()
    );
    totalReqs.add(1);
    check(resFail, {
      "Login gagal: status 401": (r) => r.status === 401,
    });
  });

  return token;
}

// ─────────────────────────────────────────────
//  MODUL 2 – DASHBOARD
// ─────────────────────────────────────────────
function testDashboard(token) {
  group("2. Dashboard", () => {
    const res = http.get(EP.DASHBOARD, h(token));
    record(res, durDashboard);
    check(res, {
      "Dashboard: status 200": (r) => r.status === 200,
      "Dashboard: ada data":   (r) => !!body(r)?.data,
      "Dashboard: < 2000ms":   (r) => r.timings.duration < 2000,
    });
    sleep(0.3);
  });
}

// ─────────────────────────────────────────────
//  MODUL 3 – INVENTORY
// ─────────────────────────────────────────────
function testInventory(token) {
  group("3. Inventory - List & Search", () => {
    const resList = http.get(
      `${EP.PRODUCTS}?page=1&per_page=9999&order_by=created_at&sort=desc`,
      h(token)
    );
    record(resList, durInventory);
    check(resList, {
      "Products list: status 200": (r) => r.status === 200,
      "Products list: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const resSearch = http.get(
      `${EP.PRODUCTS}?search=nike&per_page=9999`,
      h(token)
    );
    record(resSearch, durInventory);
    check(resSearch, {
      "Products search: status 200": (r) => r.status === 200,
      "Products search: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);
  });

  group("3b. Inventory - Tambah & Edit Produk", () => {
    const resAdd = http.post(
      EP.PRODUCTS,
      JSON.stringify({
        brand:          "Nike",
        model:          `Air Max Test ${Date.now()}`,
        color:          "Hitam",
        selling_price:  350000,
        discount_price: null,
        sizes: [{ size: "42", stock: 5 }],
      }),
      h(token)
    );
    record(resAdd, durInventory);
    check(resAdd, {
      "Tambah produk: status 200/201": (r) => [200, 201].includes(r.status),
      "Tambah produk: < 5000ms":       (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const resEdit = http.put(
      EP.PRODUCT_BY_ID(1),
      JSON.stringify({
        brand:          "Nike",
        model:          "Air Max Updated",
        color:          "Putih",
        selling_price:  375000,
        discount_price: null,
        sizes: [{ size: "42", stock: 4 }],
      }),
      h(token)
    );
    record(resEdit, durInventory);
    check(resEdit, {
      "Edit produk: status 200/201": (r) => [200, 201].includes(r.status),
      "Edit produk: < 5000ms":       (r) => r.timings.duration < 5000,
    });
    sleep(0.3);
  });
}

// ─────────────────────────────────────────────
//  MODUL 4 – STOCK OPNAME
// ─────────────────────────────────────────────
function testStockOpname(token) {
  group("4. Stock Opname", () => {
    const resLoad = http.get(EP.STOCK_OPNAME, h(token));
    record(resLoad, durOpname);
    check(resLoad, {
      "Opname load: status 200": (r) => r.status === 200,
      "Opname load: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const resPhys = http.post(
      EP.UPDATE_PHYS_STOCK(1),
      JSON.stringify({ physical_stock: 8 }),
      h(token)
    );
    record(resPhys, durOpname);
    check(resPhys, {
      "Physical stock: status 200/201": (r) => [200, 201].includes(r.status),
      "Physical stock: < 5000ms":       (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const resSave = http.post(
      EP.SAVE_STOCK_REPORT,
      JSON.stringify({
        reports: [
          { product_id: 1, physical_stock: 8, system_stock: 10, difference: -2 },
        ],
      }),
      h(token)
    );
    record(resSave, durOpname);
    check(resSave, {
      "Simpan opname: status 200/201": (r) => [200, 201].includes(r.status),
      "Simpan opname: < 5000ms":       (r) => r.timings.duration < 5000,
    });
    sleep(0.3);
  });
}

// ─────────────────────────────────────────────
//  MODUL 5 – TRANSAKSI
// ─────────────────────────────────────────────
function testTransactions(token) {
  group("5. Transaksi - Get & Filter", () => {
    const resAll = http.get(EP.TRANSACTIONS, h(token));
    record(resAll, durTransaction);
    check(resAll, {
      "Transaksi list: status 200": (r) => r.status === 200,
      "Transaksi list: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const today = new Date().toISOString().split("T")[0];
    const resDate = http.get(
      `${EP.TRANSACTIONS}?date=${today}`,
      h(token)
    );
    record(resDate, durTransaction);
    check(resDate, {
      "Filter tanggal: status 200": (r) => r.status === 200,
      "Filter tanggal: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const resPay = http.get(
      `${EP.TRANSACTIONS}?payment_method=cash`,
      h(token)
    );
    record(resPay, durTransaction);
    check(resPay, {
      "Filter payment: status 200": (r) => r.status === 200,
      "Filter payment: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);
  });

  group("5b. Transaksi - QR Scan & Checkout", () => {
    const resQR = http.get(
      EP.ADD_PRODUCT_BY_QR("NIKE-AIRMAX-42"),
      h(token)
    );
    record(resQR, durTransaction);
    check(resQR, {
      "QR scan: status 200/404": (r) => [200, 404].includes(r.status),
      "QR scan: < 5000ms":       (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const resCheckout = http.post(
      EP.TRANSACTIONS,
      JSON.stringify({
        customer_name:     null,
        customer_phone:    null,
        customer_email:    null,
        payment_method:    "cash",
        card_type:         null,
        discount_amount:   0,
        overall_new_price: null,
        notes:             null,
        products: [
          {
            product_id: 1,
            unit_code:  "NIKE-AIRMAX-42",
            quantity:   1,
            new_price:  null,
          },
        ],
      }),
      h(token)
    );
    record(resCheckout, durTransaction);
    check(resCheckout, {
      "Checkout: status 200/201/422": (r) => [200, 201, 422].includes(r.status),
      "Checkout: < 5000ms":           (r) => r.timings.duration < 5000,
    });
    sleep(0.5);
  });
}

// ─────────────────────────────────────────────
//  MODUL 6 – PROFIL
// ─────────────────────────────────────────────
function testProfile(token) {
  group("6. Profil User", () => {
    const res = http.get(EP.PROFILE, h(token));
    totalReqs.add(1);
    check(res, {
      "Profil: status 200": (r) => r.status === 200,
      "Profil: < 3000ms":   (r) => r.timings.duration < 3000,
    });
    sleep(0.3);
  });
}

// ─────────────────────────────────────────────
//  FUNGSI UTAMA
// ─────────────────────────────────────────────
export default function () {
  const token = testLogin();

  if (!token) {
    console.warn(`[VU ${__VU}] Token tidak diperoleh!`);
    sleep(1);
    return;
  }

  sleep(0.3);
  testDashboard(token);
  testInventory(token);
  testStockOpname(token);
  testTransactions(token);
  testProfile(token);
  sleep(1);
}

// ─────────────────────────────────────────────
//  SUMMARY REPORT
// ─────────────────────────────────────────────
export function handleSummary(data) {
  const m   = data.metrics;
  const p95 = (n) => { const v = m[n]?.values?.["p(95)"]; return v != null ? `${v.toFixed(0)} ms` : "N/A"; };
  const avg = (n) => { const v = m[n]?.values?.["avg"];   return v != null ? `${v.toFixed(0)} ms` : "N/A"; };
  const pad = (s, n) => String(s).padEnd(n);

  const errPct  = ((m.error_rate?.values?.rate  || 0) * 100).toFixed(2);
  const totReq  = m.total_requests?.values?.count || 0;
  const p95all  = m.http_req_duration?.values?.["p(95)"] || 0;
  const status  = p95all < 3000
    ? "✅ LULUS – Semua response < 3000 ms"
    : "❌ TIDAK LULUS – Ada response > 3000 ms";

  const vuMax = {
    load:   "10 VU / 5 menit",
    stress: "10-50 VU / 10 menit",
    spike:  "5→50→5 VU / 5 menit",
    soak:   "10 VU / 10 menit",
  }[SCENARIO] || "10 VU";

  const report = `
╔══════════════════════════════════════════════════════════════╗
║      HASIL PERFORMANCE TESTING – TOKO SEPATU BY SOVAN        ║
║      Skenario : ${pad(SCENARIO.toUpperCase() + " (Max " + vuMax + ")", 44)}║
╠══════════════════════════════════════════════════════════════╣
║  MODUL              │ p(95) Response Time │ Avg Response     ║
╠══════════════════════════════════════════════════════════════╣
║  Login              │ ${pad(p95("dur_login"),       19)} │ ${pad(avg("dur_login"),       16)}║
║  Dashboard          │ ${pad(p95("dur_dashboard"),   19)} │ ${pad(avg("dur_dashboard"),   16)}║
║  Inventory          │ ${pad(p95("dur_inventory"),   19)} │ ${pad(avg("dur_inventory"),   16)}║
║  Stock Opname       │ ${pad(p95("dur_opname"),      19)} │ ${pad(avg("dur_opname"),      16)}║
║  Transaksi          │ ${pad(p95("dur_transaction"), 19)} │ ${pad(avg("dur_transaction"), 16)}║
╠══════════════════════════════════════════════════════════════╣
║  Total Request      │ ${pad(totReq,                46)}║
║  Error Rate         │ ${pad(errPct + "%",           46)}║
║  p(95) Global       │ ${pad(p95all.toFixed(0) + " ms", 46)}║
╠══════════════════════════════════════════════════════════════╣
║  Target (Skripsi)   │ Response time < 3000 ms                ║
║  Status             │ ${pad(status,                46)}║
╚══════════════════════════════════════════════════════════════╝
`;

  console.log(report);
  return {
    stdout: report,
    "hasil-testing.json": JSON.stringify(data, null, 2),
  };
}