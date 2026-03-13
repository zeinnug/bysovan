/**
 * ============================================================
 *  PERFORMANCE TESTING - Aplikasi Mobile Toko Sepatu By Sovan
 *  Tool   : k6 (https://k6.io)
 *  Author : Muhammad Zein Al-Kautsar Nugroho - 21120122140151
 *  Universitas Diponegoro – 2025
 *
 *  Modul yang diuji:
 *    1. Login
 *    2. Dashboard
 *    3. Inventory
 *    4. Stock Opname
 *    5. Transaksi
 *
 *  Perbaikan bottleneck:
 *    - per_page inventory : 9999 → 100
 *    - per_page search    : 9999 → 20
 *    - per_page transaksi : tanpa limit → 20
 *
 *  Cara menjalankan:
 *    k6 run --env SCENARIO=load   performance-test-toko-sovan.js
 *    k6 run --env SCENARIO=stress performance-test-toko-sovan.js
 *    k6 run --env SCENARIO=spike  performance-test-toko-sovan.js
 *    k6 run --env SCENARIO=soak   performance-test-toko-sovan.js
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

const INVENTORY_PER_PAGE   = 100;
const SEARCH_PER_PAGE      = 20;
const TRANSACTION_PER_PAGE = 20;

// ─────────────────────────────────────────────
//  ENDPOINT
// ─────────────────────────────────────────────
const EP = {
  LOGIN:             `${BASE_URL}/login`,
  PROFILE:           `${BASE_URL}/auth/profile`,
  DASHBOARD:         `${BASE_URL}/dashboard`,
  PRODUCTS:          `${BASE_URL}/products`,
  PRODUCT_BY_ID:     (id)       => `${BASE_URL}/products/${id}`,
  UPDATE_PHYS_STOCK: (id)       => `${BASE_URL}/products/${id}/physical-stock`,
  STOCK_OPNAME:      `${BASE_URL}/stock-opname`,
  SAVE_STOCK_REPORT: `${BASE_URL}/stock-opname/save`,
  TRANSACTIONS:      `${BASE_URL}/transactions`,
  ADD_PRODUCT_BY_QR: (unitCode) => `${BASE_URL}/transactions/add-product/${unitCode}`,
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
//  SKENARIO
// ─────────────────────────────────────────────
const SCENARIO = __ENV.SCENARIO || "load";

export const options = {

  load: {
    stages: [
      { duration: "1m", target: 10 },
      { duration: "3m", target: 10 },
      { duration: "1m", target: 0  },
    ],
    thresholds: {
      http_req_duration: ["p(95)<3000"],
      http_req_failed:   ["rate<0.10"],
      error_rate:        ["rate<0.10"],
      dur_inventory:     ["p(95)<3000"],
    },
  },

  stress: {
    stages: [
      { duration: "2m", target: 10 },
      { duration: "3m", target: 30 },
      { duration: "3m", target: 50 },
      { duration: "2m", target: 0  },
    ],
    thresholds: {
      http_req_duration: ["p(95)<10000"],
      http_req_failed:   ["rate<0.30"],
      dur_inventory:     ["p(95)<5000"],
    },
  },

  spike: {
    stages: [
      { duration: "1m",  target: 5  },
      { duration: "30s", target: 50 },
      { duration: "2m",  target: 50 },
      { duration: "30s", target: 5  },
      { duration: "1m",  target: 0  },
    ],
    thresholds: {
      http_req_duration: ["p(95)<10000"],
      http_req_failed:   ["rate<0.30"],
      dur_inventory:     ["p(95)<8000"],
    },
  },

  soak: {
    stages: [
      { duration: "1m", target: 10 },
      { duration: "8m", target: 10 },
      { duration: "1m", target: 0  },
    ],
    thresholds: {
      http_req_duration: ["p(95)<3000"],
      http_req_failed:   ["rate<0.10"],
      dur_inventory:     ["p(95)<3000"],
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
function h(token) {
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
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
  group("1. Login", () => {
    const res = http.post(
      EP.LOGIN,
      JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
      h()
    );
    record(res, durLogin);
    check(res, {
      "Login: status 200": (r) => r.status === 200,
      "Login: ada token":  (r) => !!body(r)?.token,
      "Login: < 2000ms":   (r) => r.timings.duration < 2000,
    });
    const b = body(res);
    if (b?.token) token = b.token;
    sleep(0.3);

    // Negative test
    const resFail = http.post(
      EP.LOGIN,
      JSON.stringify({ email: "salah@email.com", password: "wrongpass" }),
      h()
    );
    totalReqs.add(1);
    check(resFail, { "Login gagal: status 401": (r) => r.status === 401 });
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
  group("3. Inventory - Load Produk", () => {
    const resList = http.get(
      `${EP.PRODUCTS}?page=1&per_page=${INVENTORY_PER_PAGE}&order_by=created_at&sort=desc`,
      h(token)
    );
    record(resList, durInventory);
    check(resList, {
      "Products load: status 200": (r) => r.status === 200,
      "Products load: < 3000ms":   (r) => r.timings.duration < 3000,
    });
    sleep(0.3);

    const resSearch = http.get(
      `${EP.PRODUCTS}?search=nike&per_page=${SEARCH_PER_PAGE}`,
      h(token)
    );
    record(resSearch, durInventory);
    check(resSearch, {
      "Products search: status 200": (r) => r.status === 200,
      "Products search: < 2000ms":   (r) => r.timings.duration < 2000,
    });
    sleep(0.3);
  });

  /**
   * ✅ SAFE: Tambah & Edit diganti GET detail produk
   * Alasan: POST /products & PUT /products/:id menulis ke DB setiap iterasi
   * → 50 VU × beberapa menit = ribuan produk dummy → DB penuh
   * Diganti dengan GET by ID yang setara mengukur beban endpoint inventory
   * tanpa meninggalkan data apapun di database.
   */
  group("3b. Inventory - Detail Produk (read-only)", () => {
    const resDetail = http.get(EP.PRODUCT_BY_ID(1), h(token));
    record(resDetail, durInventory);
    check(resDetail, {
      "Detail produk: status 200/404": (r) => [200, 404].includes(r.status),
      "Detail produk: < 3000ms":       (r) => r.timings.duration < 3000,
    });
    sleep(0.3);

    // Cek produk ID lain untuk variasi beban query
    const resDetail2 = http.get(EP.PRODUCT_BY_ID(2), h(token));
    record(resDetail2, durInventory);
    check(resDetail2, {
      "Detail produk 2: status 200/404": (r) => [200, 404].includes(r.status),
      "Detail produk 2: < 3000ms":       (r) => r.timings.duration < 3000,
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

    /**
     * ✅ SAFE: POST physical-stock & POST save-report dihapus
     * Alasan: kedua endpoint ini INSERT ke tabel stock_opname_reports setiap hit.
     * Dengan 50 VU selama beberapa menit = ribuan baris laporan dummy → DB penuh.
     * Diganti GET opname ulang untuk simulasi user scroll / refresh halaman opname.
     */
    const resReload = http.get(EP.STOCK_OPNAME, h(token));
    record(resReload, durOpname);
    check(resReload, {
      "Opname reload: status 200": (r) => r.status === 200,
      "Opname reload: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);
  });
}

// ─────────────────────────────────────────────
//  MODUL 5 – TRANSAKSI
// ─────────────────────────────────────────────
function testTransactions(token) {
  group("5. Transaksi - Get & Filter", () => {
    const resAll = http.get(
      `${EP.TRANSACTIONS}?per_page=${TRANSACTION_PER_PAGE}`,
      h(token)
    );
    record(resAll, durTransaction);
    check(resAll, {
      "Transaksi list: status 200": (r) => r.status === 200,
      "Transaksi list: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const today = new Date().toISOString().split("T")[0];
    const resDate = http.get(
      `${EP.TRANSACTIONS}?date=${today}&per_page=${TRANSACTION_PER_PAGE}`,
      h(token)
    );
    record(resDate, durTransaction);
    check(resDate, {
      "Filter tanggal: status 200": (r) => r.status === 200,
      "Filter tanggal: < 5000ms":   (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    const resPay = http.get(
      `${EP.TRANSACTIONS}?payment_method=cash&per_page=${TRANSACTION_PER_PAGE}`,
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
    const resQR = http.get(EP.ADD_PRODUCT_BY_QR("NIKE-AIRMAX-42"), h(token));
    record(resQR, durTransaction);
    check(resQR, {
      "QR scan: status 200/404": (r) => [200, 404].includes(r.status),
      "QR scan: < 5000ms":       (r) => r.timings.duration < 5000,
    });
    sleep(0.3);

    /**
     * ✅ SAFE: POST /transactions (checkout) dihapus
     * Alasan: setiap checkout INSERT transaksi baru ke DB + kurangi stok produk.
     * 50 VU × menit = ratusan transaksi palsu + stok produk terkuras habis.
     * Diganti GET transaksi by ID untuk mengukur beban query transaksi detail.
     */
    const resDetail = http.get(EP.TRANSACTIONS + "/1", h(token));
    record(resDetail, durTransaction);
    check(resDetail, {
      "Detail transaksi: status 200/404": (r) => [200, 404].includes(r.status),
      "Detail transaksi: < 5000ms":       (r) => r.timings.duration < 5000,
    });
    sleep(0.5);
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
  sleep(1);
}

// ─────────────────────────────────────────────
//  SUMMARY REPORT  —  tabel tunggal & rapi
// ─────────────────────────────────────────────
export function handleSummary(data) {
  const m = data.metrics;

  const getVal = (name, stat) => {
    const v = m[name]?.values?.[stat];
    return (v != null) ? v : null;
  };
  const fms = (name, stat) => {
    const v = getVal(name, stat);
    return (v != null) ? `${v.toFixed(0)} ms` : "N/A";
  };
  const pad = (s, n) => String(s).padEnd(n);

  // ── Lebar kolom ──
  const C1 = 20; // Modul
  const C2 = 12; // p(95)
  const C3 = 12; // Avg
  const C4 = 12; // Min
  const C5 = 12; // Max

  const line = () => `+${"-".repeat(C1+2)}+${"-".repeat(C2+2)}+${"-".repeat(C3+2)}+${"-".repeat(C4+2)}+${"-".repeat(C5+2)}+`;
  const row  = (a,b,c,d,e) =>
    `| ${pad(a,C1)} | ${pad(b,C2)} | ${pad(c,C3)} | ${pad(d,C4)} | ${pad(e,C5)} |`;

  // ── Baris modul ──
  const dataRows = [
    row("1. Login",        fms("dur_login","p(95)"),       fms("dur_login","avg"),       fms("dur_login","min"),       fms("dur_login","max")),
    row("2. Dashboard",    fms("dur_dashboard","p(95)"),   fms("dur_dashboard","avg"),   fms("dur_dashboard","min"),   fms("dur_dashboard","max")),
    row("3. Inventory",    fms("dur_inventory","p(95)"),   fms("dur_inventory","avg"),   fms("dur_inventory","min"),   fms("dur_inventory","max")),
    row("4. Stock Opname", fms("dur_opname","p(95)"),      fms("dur_opname","avg"),      fms("dur_opname","min"),      fms("dur_opname","max")),
    row("5. Transaksi",    fms("dur_transaction","p(95)"), fms("dur_transaction","avg"), fms("dur_transaction","min"), fms("dur_transaction","max")),
  ];

  // ── Statistik global ──
  const totReq    = getVal("total_requests","count") || 0;
  const errPct    = ((getVal("error_rate","rate")    || 0) * 100).toFixed(2);
  const failPct   = ((getVal("http_req_failed","rate")|| 0) * 100).toFixed(2);
  const p95Global = getVal("http_req_duration","p(95)") || 0;

  const lulus   = p95Global < 3000;
  const statusTxt  = lulus
    ? "✅ LULUS      – p95 Global < 3000 ms"
    : "❌ TIDAK LULUS – p95 Global >= 3000 ms";

  const vuLabel = { load:"10 VU | 5 menit", stress:"50 VU | 10 menit", spike:"5→50→5 VU | 5 menit", soak:"10 VU | 10 menit" }[SCENARIO] || "-";

  // ── Lebar total baris tabel ──
  const TOTAL_W = line().length;
  const fullLine  = `+${"-".repeat(TOTAL_W - 2)}+`;
  const fullRow   = (txt) => `| ${pad(txt, TOTAL_W - 4)} |`;

  const report = "\n" + [
    fullLine,
    fullRow("  HASIL PERFORMANCE TESTING – TOKO SEPATU BY SOVAN"),
    fullRow(`  Skenario : ${SCENARIO.toUpperCase()}  (${vuLabel})`),
    fullRow(`  Fix      : per_page inventory 9999→${INVENTORY_PER_PAGE}  |  search 9999→${SEARCH_PER_PAGE}  |  transaksi→${TRANSACTION_PER_PAGE}`),
    fullLine,
    line(),
    row("MODUL", "p(95)", "AVG", "MIN", "MAX"),
    line(),
    ...dataRows,
    line(),
    fullRow(`  Total Request   : ${totReq}`),
    fullRow(`  Error Rate      : ${errPct}%`),
    fullRow(`  Failed Request  : ${failPct}%`),
    fullRow(`  p(95) Global    : ${p95Global.toFixed(0)} ms`),
    fullLine,
    fullRow(`  Target Skripsi  : Response time < 3000 ms`),
    fullRow(`  Status          : ${statusTxt}`),
    fullLine,
  ].join("\n") + "\n";

  console.log(report);
  return {
    stdout: report,
    "hasil-testing.json": JSON.stringify(data, null, 2),
  };
}