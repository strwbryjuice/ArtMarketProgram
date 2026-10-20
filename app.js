'use strict';
/* =========================================================
   아트마켓 현장 장부
   - 금액은 모두 '센트(정수)'로 계산해서 소수점 오차를 없앱니다.
   - 재고는 상품별, 금액은 거래별로 따로 기록합니다.
   - 상품은 카테고리(제작자/엽서)로 묶여 정산도 카테고리별로 볼 수 있습니다.
   ========================================================= */

const SYM = { EUR: '€', GBP: '£' };
const KEY = 'artmarket-ledger-v3';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const toC = v => Math.round((parseFloat(v) || 0) * 100);          // 2.5 -> 250
const fmt = (c, cur) => SYM[cur] + (c / 100).toFixed(2);
const num = c => (c / 100).toFixed(2);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const dayOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

/* ---------------- 초기 데이터 ---------------- */
function defaultState() {
  // 엽서: 가격은 카테고리(세트가)에서 관리하므로 상품 가격은 비워둠
  const pc = (id, name) => ({ id: 'pc-' + id, name, cat: 'postcard', price: { EUR: 0, GBP: 0 }, stock: 15, baseStock: 15 });
  const it = (id, name, cat, eur, gbp, stock) =>
    ({ id, name, cat, price: { EUR: toC(eur), GBP: toC(gbp) }, stock, baseStock: stock });

  return {
    version: 2,
    settings: { gbpToEur: 1.15, showEurEq: true, cashFloatC: 0, currency: 'EUR', testMode: false, topScope: 'today' },
    categories: [
      { id: 'postcard', name: 'Postcards', unitName: 'pc',
        unit: { EUR: toC(3), GBP: toC(2.5) },
        bundles: [{ qty: 2, EUR: toC(5), GBP: toC(4) }] },
      { id: 'joint',   name: 'Collab' },
      { id: 'nayeon',  name: 'Nayeon' },
      { id: 'jh',      name: 'JH' },
      { id: 'friends', name: 'Friends' },
      { id: 'etc',     name: 'Other' }
    ],
    products: [
      /* 엽서 6종 · 각 15장 */
      pc('macaron',   'postcard macaron'),
      pc('crape',     'postcard crape'),
      pc('horse',     'postcard horse'),
      pc('dog',       'postcard dog'),
      pc('scren',     'postcard the scren'),
      pc('staircase', 'postcard staircase'),

      /* 공동 제작 */
      it('p-smallpeace', 'Small Peace Zine', 'joint', 10, 8.5, 60),

      /* 나연 제작 */
      it('p-dogsticker', 'Dog Sticker 🐶',       'nayeon', 5, 4.5, 8),
      it('p-homilass',   'Homil Asshole 🐈‍⬛',     'nayeon', 8, 7,   30),
      it('p-homilpoop',  'Homil Poop 🐈‍⬛💩',      'nayeon', 8, 7,   30),
      it('p-fishlino',   'Fish Linocut 🐠',      'nayeon', 8, 7,   9),
      it('p-tigerlino',  'Tiger Linocut 🐯',     'nayeon', 10, 8.5, 20),
      it('p-beccazine',  '📖 Becca zine 👽',     'nayeon', 6, 5,   55),
      it('p-fishzine',   '📖 Fish zine 🐟',      'nayeon', 4, 3.5, 38),
      it('p-gkzine',     '📖 GK zine ❄️',        'nayeon', 8, 7,   30),
      it('p-bologna1',   '1 Bologna Print A4',  'nayeon', 10, 9,  4),
      it('p-bologna2',   '2 Bologna Print A4',  'nayeon', 10, 9,  4),
      it('p-bologna3',   '3 Bologna print A4',  'nayeon', 10, 9,  4),
      it('p-dogpostcard','Dog postcard 🐶',      'nayeon', 3, 2.5, 5),

      /* JH 제작 */
      it('p-jhcutout',   '📖 JH Cutout',       'jh', 58, 50, 2),
      it('p-juicy',      'Juicy',              'jh', 10, 9, 1),
      it('p-yearsnake',  'Year of snake',      'jh', 5, 4, 1),
      { id: 'p-valentine', name: 'Valentine card', cat: 'jh',
        price: { EUR: toC(3), GBP: toC(2.5) },
        bundles: [{ qty: 2, EUR: toC(5), GBP: toC(4) }],   // 2개 세트가
        stock: 16, baseStock: 16 },
      it('p-naobig',     '📖 Nao Big zine',    'jh', 18, 15, 2),
      it('p-naosmall',   '📖 Nao small zine',  'jh', 10, 9, 2),

      /* 지인 제작 */
      it('p-hazel',      '📖 Hazel zine',      'friends', 5, 4, 5),
      it('p-lowercase',  '📖 Lowercase',       'friends', 20, 19, 7),
      it('p-hanbook',    'Han book',           'friends', 20, 19, 3)
    ],
    sales: []
  };
}

/* ---------------- 저장소 ---------------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {}
  return defaultState();
}
function migrate(s) {
  const d = defaultState();
  s = s || {};
  s.settings = Object.assign({}, d.settings, s.settings);
  if (!Array.isArray(s.categories) || !s.categories.length) s.categories = d.categories;
  if (!s.categories.some(c => c.id === 'etc')) s.categories.push({ id: 'etc', name: 'Other' });
  if (!Array.isArray(s.products) || !s.products.length) s.products = d.products;
  for (const p of s.products) {
    if (!p.cat) p.cat = p.groupId === 'postcard' ? 'postcard' : 'etc';
    if (!p.price) p.price = { EUR: 0, GBP: 0 };
  }
  if (!Array.isArray(s.sales)) s.sales = [];

  // 한 번만 적용: Nao zine 2종을 JH로, 이름을 안 바꿨으면 이모지 붙이기
  if (!s.fixV4) {
    const EMOJI = {
      'p-dogsticker': ['Dog Sticker', 'Dog Sticker 🐶'],
      'p-homilass':   ['Homil Asshole', 'Homil Asshole 🐈‍⬛'],
      'p-homilpoop':  ['Homil Poop', 'Homil Poop 🐈‍⬛💩'],
      'p-fishlino':   ['Fish Linocut', 'Fish Linocut 🐠'],
      'p-tigerlino':  ['Tiger Linocut', 'Tiger Linocut 🐯'],
      'p-beccazine':  ['📖 Becca zine', '📖 Becca zine 👽'],
      'p-fishzine':   ['📖 Fish zine', '📖 Fish zine 🐟'],
      'p-gkzine':     ['📖 GK zine', '📖 GK zine ❄️']
    };
    for (const p of s.products) {
      const e = EMOJI[p.id];
      if (e && p.name === e[0]) p.name = e[1];
      if (p.id === 'p-naobig' || p.id === 'p-naosmall') p.cat = 'jh';
    }
    s.fixV4 = true;
  }

  // 한 번만 적용: 나중에 알려준 가격 채우기 (직접 입력한 값은 건드리지 않음)
  if (!s.fixV5) {
    const PRICE = {
      'p-gkzine':      { GBP: 7 },
      'p-bologna1':    { GBP: 9 },
      'p-bologna2':    { GBP: 9 },
      'p-bologna3':    { GBP: 9 },
      'p-dogpostcard': { EUR: 3, GBP: 2.5 },
      'p-jhcutout':    { EUR: 58, GBP: 50 },
      'p-naobig':      { GBP: 15, force: true },
      'p-naosmall':    { EUR: 10 },
      'p-hazel':       { EUR: 5, GBP: 4 }
    };
    for (const p of s.products) {
      const f = PRICE[p.id] ||
                (/dog ?postcard/i.test(p.name) ? { EUR: 3, GBP: 2.5 } : null);
      if (!f || !p.price) continue;
      if (f.EUR != null && (!p.price.EUR || f.force)) p.price.EUR = toC(f.EUR);
      if (f.GBP != null && (!p.price.GBP || f.force)) p.price.GBP = toC(f.GBP);
    }
    s.fixV5 = true;
  }

  // 한 번만 적용: 나중에 추가한 상품 넣기
  if (!s.fixV6) {
    const ADD = [
      { id: 'p-juicy', name: 'Juicy', cat: 'jh',
        price: { EUR: toC(10), GBP: toC(9) }, stock: null, baseStock: null },
      { id: 'p-valentine', name: 'Valentine card', cat: 'jh',
        price: { EUR: toC(3), GBP: toC(2.5) },
        bundles: [{ qty: 2, EUR: toC(5), GBP: toC(4) }],
        stock: null, baseStock: null },
      { id: 'p-hanbook', name: 'Han book', cat: 'friends',
        price: { EUR: toC(20), GBP: toC(19) }, stock: null, baseStock: null }
    ];
    for (const np of ADD) if (!s.products.some(x => x.id === np.id)) s.products.push(np);
    s.fixV6 = true;
  }

  // 한 번만 적용: 마지막으로 받은 가격
  if (!s.fixV7) {
    const LAST = {
      'p-naosmall':  { EUR: 10, GBP: 9 },
      'p-lowercase': { EUR: 20, GBP: 19 }
    };
    for (const p of s.products) {
      const f = LAST[p.id];
      if (!f || !p.price) continue;
      if (!p.price.EUR) p.price.EUR = toC(f.EUR);
      if (!p.price.GBP) p.price.GBP = toC(f.GBP);
    }
    s.fixV7 = true;
  }

  // 한 번만 적용: 재고 확정 + Year of snake 추가
  if (!s.fixV8) {
    const STOCK = { 'p-juicy': 1, 'p-valentine': 16, 'p-hanbook': 3 };
    for (const p of s.products) {
      if (STOCK[p.id] != null && p.stock == null) { p.stock = STOCK[p.id]; p.baseStock = STOCK[p.id]; }
      if (p.id === 'p-fishlino') { p.stock = 9; p.baseStock = 9; }   // 4개 추가 → 총 9
    }
    if (!s.products.some(x => x.id === 'p-yearsnake')) {
      s.products.push({ id: 'p-yearsnake', name: 'Year of snake', cat: 'jh',
                        price: { EUR: toC(5), GBP: toC(4) }, stock: 1, baseStock: 1 });
    }
    s.fixV8 = true;
  }

  // 한 번만 적용: Year of snake 재고 1개
  if (!s.fixV9) {
    const p = s.products.find(x => x.id === 'p-yearsnake');
    if (p && p.stock == null) { p.stock = 1; p.baseStock = 1; }
    s.fixV9 = true;
  }
  return s;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

let state = load();
let cart = [];              // [{key, productId|null, name, qty, unitC?}]
let detent = 'full';   // 'peek' | 'mid' | 'full'
let curT = 0, drag = null;
let view = 'sell';
let ledgerDate = dayOf();

/* ---------------- 공통 조회 ---------------- */
const prod = id => state.products.find(p => p.id === id);
const catOf = id => state.categories.find(c => c.id === id) || state.categories.find(c => c.id === 'etc') || state.categories[0];
const isBundleCat = c => !!(c && c.unit);
const unitOf = (p, cur) => {
  const c = catOf(p.cat);
  return isBundleCat(c) ? (c.unit[cur] || 0) : (p.price[cur] || 0);
};
const catUnitName = c => (c && c.unitName) || 'pcs';
const productsOf = catId => state.products.filter(p => (catOf(p.cat).id) === catId);

/* =========================================================
   가격 계산
   ========================================================= */
// 수량 qty를 낱개/세트 조합 중 가장 싸게 (3장=세트+낱개, 4장=세트2개 …)
function bestPrice(qty, unitC, bundles, cur) {
  if (qty <= 0) return 0;
  const dp = new Array(qty + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= qty; i++) {
    dp[i] = dp[i - 1] + unitC;
    for (const b of (bundles || [])) {
      const bq = Number(b.qty) || 0, bp = b[cur];
      if (bq > 0 && bq <= i && Number.isFinite(bp)) dp[i] = Math.min(dp[i], dp[i - bq] + bp);
    }
  }
  return dp[qty];
}
// 세트가를 각 디자인에 수량 비율로 나눠 담기 (합계가 정확히 일치하도록 보정)
function allocate(totalC, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map(w => totalC * w / sum);
  const out = raw.map(Math.floor);
  const rest = totalC - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rest; k++) out[order[k % order.length][1]]++;
  return out;
}

// 세트가는 카테고리 전체(엽서)에 걸릴 수도, 상품 하나(Valentine card)에 걸릴 수도 있다
function bundleOf(p, cur) {
  const c = catOf(p.cat);
  if (isBundleCat(c)) return { key: 'c:' + c.id, unitC: c.unit[cur] || 0, bundles: c.bundles };
  if (p.bundles && p.bundles.length) return { key: 'p:' + p.id, unitC: p.price[cur] || 0, bundles: p.bundles };
  return null;
}

function computeCart(cur) {
  // 같은 세트가 묶음끼리 수량을 모아서 한 번에 계산
  const bQty = {}, bRef = {};
  for (const it of cart) {
    const p = it.productId && prod(it.productId);
    const b = p && bundleOf(p, cur);
    if (!b) continue;
    bQty[b.key] = (bQty[b.key] || 0) + it.qty;
    bRef[b.key] = b;
  }
  const bAlloc = {};
  for (const k in bQty) {
    const b = bRef[k];
    const cost = bestPrice(bQty[k], b.unitC, b.bundles, cur);
    const items = cart.filter(it => {
      const p = it.productId && prod(it.productId);
      const bb = p && bundleOf(p, cur);
      return bb && bb.key === k;
    });
    const parts = allocate(cost, items.map(i => i.qty));
    bAlloc[k] = new Map(items.map((it, i) => [it.key, parts[i]]));
  }

  const lines = cart.map(it => {
    const p = it.productId ? prod(it.productId) : null;
    if (p) {
      const c = catOf(p.cat);
      const unitC = unitOf(p, cur);
      const b = bundleOf(p, cur);
      return { key: it.key, productId: p.id, cat: c.id, bundled: !!b, name: p.name, qty: it.qty, unitC,
               grossC: unitC * it.qty,
               chargedC: b ? (bAlloc[b.key].get(it.key) || 0) : unitC * it.qty };
    }
    const unitC = it.unitC || 0;
    return { key: it.key, productId: null, cat: 'etc', bundled: false, name: it.name, qty: it.qty, unitC,
             grossC: unitC * it.qty, chargedC: unitC * it.qty };
  });
  const grossC = lines.reduce((a, l) => a + l.grossC, 0);
  const totalC = lines.reduce((a, l) => a + l.chargedC, 0);
  return { lines, grossC, totalC, discountC: grossC - totalC, qty: lines.reduce((a, l) => a + l.qty, 0) };
}

/* =========================================================
   장바구니 조작
   ========================================================= */
function addToCart(productId) {
  const p = prod(productId);
  if (!p) return;
  const line = cart.find(c => c.productId === productId);
  const have = line ? line.qty : 0;
  if (p.stock != null && have >= p.stock) { toast(`Only ${p.stock} left of ${p.name}`); return; }
  const wasEmpty = !cart.length;
  if (line) line.qty++;
  else cart.push({ key: uid(), productId, name: p.name, qty: 1 });
  if (wasEmpty) detent = 'full';
  else if (detent === 'peek') detent = 'mid';
  renderSell(); renderCart();
}
function bumpCart(key, delta) {
  const line = cart.find(c => c.key === key);
  if (!line) return;
  if (delta > 0 && line.productId) {
    const p = prod(line.productId);
    if (p && p.stock != null && line.qty >= p.stock) { toast(`Only ${p.stock} left of ${p.name}`); return; }
  }
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter(c => c.key !== key);
  renderSell(); renderCart();
}

/* =========================================================
   판매 기록
   ========================================================= */
function recordSale() {
  const cur = state.settings.currency;
  const c = computeCart(cur);
  if (!c.lines.length) { toast('Nothing in the cart'); return; }

  let receivedC, changeC;
  if (cur === 'EUR') {
    const raw = $('#received').value.trim();
    receivedC = raw === '' ? c.totalC : toC(raw);
    if (receivedC < c.totalC) { toast('Received is less than the total'); return; }
    changeC = receivedC - c.totalC;
  } else {
    receivedC = c.totalC; changeC = 0;   // 카드 결제는 잔돈 없음
  }

  const isTest = !!state.settings.testMode;
  state.sales.push({
    id: uid(), ts: Date.now(), date: dayOf(), currency: cur, test: isTest,
    method: cur === 'EUR' ? 'cash' : 'card',
    lines: c.lines.map(l => ({ productId: l.productId, name: l.name, cat: l.cat, qty: l.qty,
                               unitC: l.unitC, grossC: l.grossC, chargedC: l.chargedC })),
    grossC: c.grossC, totalC: c.totalC, discountC: c.discountC, receivedC, changeC
  });

  if (!isTest) {                       // 재고 차감 (테스트 모드에서는 건드리지 않음)
    for (const l of c.lines) {
      const p = l.productId && prod(l.productId);
      if (p && p.stock != null) p.stock = p.stock - l.qty;
    }
  }

  const msg = isTest ? '🧪 Test record — nothing counted' : cur === 'EUR'
    ? (changeC > 0 ? `Recorded · change ${fmt(changeC, 'EUR')}` : `Recorded · ${fmt(c.totalC, 'EUR')}`)
    : `Recorded · card ${fmt(c.totalC, 'GBP')}`;

  cart = []; $('#received').value = '';
  ledgerDate = dayOf();
  save(); renderAll(); toast(msg);
}

function deleteSale(id) {
  const i = state.sales.findIndex(s => s.id === id);
  if (i < 0) return;
  restoreStock(state.sales[i]);
  state.sales.splice(i, 1);
  save(); renderAll(); toast('Deleted · stock restored');
}

/* 팝업(confirm)이 막히는 브라우저에서도 되도록 '두 번 눌러 확인' */
const armTimers = new WeakMap();
function disarm(btn) {
  clearTimeout(armTimers.get(btn));
  btn.dataset.armed = '';
  btn.classList.remove('armed');
  if (btn.dataset.oldLabel != null) { btn.textContent = btn.dataset.oldLabel; delete btn.dataset.oldLabel; }
}
function armTap(btn, label, fn) {
  if (btn.dataset.armed === '1') { disarm(btn); fn(); return; }
  btn.dataset.oldLabel = btn.textContent;
  btn.dataset.armed = '1';
  btn.textContent = label;
  btn.classList.add('armed');
  toast('Tap again to confirm');
  armTimers.set(btn, setTimeout(() => disarm(btn), 4000));
}

/* =========================================================
   집계
   ========================================================= */
function salesOf(date) {                       // 실제 기록만 (테스트 제외)
  const real = state.sales.filter(s => !s.test);
  return date === 'ALL' ? real : real.filter(s => s.date === date);
}
function testSales() { return state.sales.filter(s => s.test); }
function restoreStock(s) {                     // 판매 전 재고로 되돌리기
  if (s.test) return;                          // 테스트 기록은 재고를 건드린 적이 없음
  for (const l of s.lines) {
    const p = l.productId && prod(l.productId);
    if (p && p.stock != null) p.stock = p.stock + l.qty;
  }
}
function summarize(date) { return summarizeList(salesOf(date)); }

// 테스트 기록만 따로 집계 (진짜 장부와 절대 섞이지 않음)
function summarizeTest(date) {
  const all = testSales();
  return summarizeList(date === 'ALL' ? all : all.filter(s => s.date === date));
}

function summarizeList(list) {
  const o = { count: list.length, qty: 0, cashC: 0, cardC: 0, receivedC: 0, changeC: 0,
              discountC: 0, discountEurC: 0, discountGbpC: 0 };
  for (const s of list) {
    o.qty += s.lines.reduce((a, l) => a + l.qty, 0);
    o.discountC += s.discountC || 0;
    if (s.currency === 'EUR') {
      o.cashC += s.totalC; o.receivedC += s.receivedC || 0; o.changeC += s.changeC || 0;
      o.discountEurC += s.discountC || 0;
    } else { o.cardC += s.totalC; o.discountGbpC += s.discountC || 0; }
  }
  o.drawerC = state.settings.cashFloatC + o.receivedC - o.changeC;
  o.cardAsEurC = Math.round(o.cardC * (parseFloat(state.settings.gbpToEur) || 0));
  o.totalEurC = o.cashC + o.cardAsEurC;
  return o;
}
// 기록이 있는 날짜 범위 (3일 마켓이면 '10-23 ~ 10-25')
function dateRange(testOnly) {
  const src = testOnly ? testSales() : state.sales.filter(s => !s.test);
  const ds = Array.from(new Set(src.map(s => s.date))).sort();
  if (!ds.length) return dayOf();
  return ds.length === 1 ? ds[0] : `${ds[0]} ~ ${ds[ds.length - 1]}`;
}
function dayCount() {
  return new Set(state.sales.filter(s => !s.test).map(s => s.date)).size;
}

function soldQty(date, productId) {
  let n = 0;
  for (const s of salesOf(date)) for (const l of s.lines) if (l.productId === productId) n += l.qty;
  return n;
}
// 카테고리(제작자)별 매출
function byCategory(date) {
  const map = new Map();
  const get = cid => {
    if (!map.has(cid)) map.set(cid, { id: cid, name: catOf(cid).name, qty: 0, eurC: 0, gbpC: 0 });
    return map.get(cid);
  };
  for (const s of salesOf(date)) for (const l of s.lines) {
    const p = l.productId && prod(l.productId);
    const cid = p ? catOf(p.cat).id : (l.cat || 'etc');
    const r = get(cid);
    r.qty += l.qty;
    if (s.currency === 'EUR') r.eurC += l.chargedC; else r.gbpC += l.chargedC;
  }
  // 카테고리 정의 순서대로
  return state.categories.map(c => map.get(c.id)).filter(Boolean)
    .concat(Array.from(map.values()).filter(r => !state.categories.some(c => c.id === r.id)));
}

/* =========================================================
   렌더 — 상단바
   ========================================================= */
function renderTestBar() {
  const on = !!state.settings.testMode;
  $('#setTest').checked = on;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', on ? '#d98324' : '#1f5fbf');
  document.body.classList.toggle('testing', on);
  $('#testBar').hidden = !on;
  $('#cartRecord').textContent = on ? '🧪 Record (test)' : '✅ Record';
}

function renderTop() {
  const on = !!state.settings.testMode;
  const all = state.settings.topScope === 'all';
  const scope = all ? 'ALL' : dayOf();
  const t = on ? summarizeTest(scope) : summarize(scope);       // 테스트 숫자는 따로 센다
  const tag = on ? '🧪 ' : '';
  const days = dayCount();
  const when = all ? (days > 1 ? `all ${days} days` : 'all days') : 'today';
  $('#topStats').innerHTML = `
    <div class="stat">${tag}Cash ${when} ⇄<b>${fmt(t.cashC, 'EUR')}</b></div>
    <div class="stat">${tag}Card ${when}<b>${fmt(t.cardC, 'GBP')}</b></div>
    <div class="stat">${tag}Sales / items<b>${t.count} / ${t.qty}</b></div>`;
}

/* ---------------- 판매 화면 ---------------- */
function renderSell() {
  const cur = state.settings.currency;
  $$('#curSeg .seg-btn').forEach(b => b.classList.toggle('is-on', b.dataset.cur === cur));

  const inCart = {};
  for (const c of cart) if (c.productId) inCart[c.productId] = c.qty;

  let html = '';
  for (const c of state.categories) {
    const items = productsOf(c.id);
    if (!items.length) continue;
    const unitName = catUnitName(c);
    const left = items.reduce((a, p) => a + (p.stock || 0), 0);
    let head = `<h2>${esc(c.name)}`;
    if (isBundleCat(c)) {
      const bundleTxt = (c.bundles || []).map(b => `${b.qty} for ${fmt(b[cur], cur)}`).join(' · ');
      head += ` <span class="badge">${fmt(c.unit[cur], cur)} each${bundleTxt ? ' · ' + bundleTxt : ''}</span>`;
    } else {
      head += ` <span class="badge">${items.length} item${items.length > 1 ? 's' : ''} · ${left} left</span>`;
    }
    head += `</h2>`;
    html += `<div class="card" data-cat="${c.id}">${head}
      <div class="pgrid">${items.map(p => pcardHtml(p, cur, inCart[p.id])).join('')}</div>
      ${isBundleCat(c) ? `<p class="hint">${left} left in total · mixing designs is fine — any 2 count as a bundle.</p>` : ''}
    </div>`;
  }
  $('#productSections').innerHTML = html;
}

function pcardHtml(p, cur, qtyInCart) {
  const out = p.stock != null && p.stock <= 0;
  const price = unitOf(p, cur);
  let cls = 'pcard-stock', txt;
  if (p.stock == null) txt = 'Not tracked';
  else if (p.stock <= 0) { cls += ' out'; txt = 'Sold out'; }
  else if (p.stock <= 3) { cls += ' low'; txt = `${p.stock} left`; }
  else txt = `${p.stock} left`;
  return `<button class="pcard${qtyInCart ? ' in-cart' : ''}" data-cat="${catOf(p.cat).id}" data-add="${p.id}"${out ? ' disabled' : ''}>
    ${qtyInCart ? `<span class="pcard-qty">${qtyInCart}</span>` : ''}
    <span class="pcard-name">${esc(p.name)}</span>
    <span class="pcard-price${price ? '' : ' noprice'}">${price ? fmt(price, cur) : 'No price'}</span>
    ${p.bundles && p.bundles.length ? `<span class="pcard-bundle">${p.bundles.map(b => `${b.qty} for ${fmt(b[cur] || 0, cur)}`).join(' · ')}</span>` : ''}
    <span class="${cls}">${txt}</span>
  </button>`;
}

/* ---------------- 장바구니 ---------------- */
function renderCart() {
  const box = $('#cart');
  if (!cart.length) { box.hidden = true; $('#main').style.paddingBottom = ''; return; }
  box.hidden = false;

  const cur = state.settings.currency;
  const c = computeCart(cur);

  $('#cartQty').textContent = c.qty;
  $('#cartTotalMini').textContent = fmt(c.totalC, cur);

  $('#cartLines').innerHTML = c.lines.map(l => `
    <li class="cart-line">
      <span class="cart-line-name">${esc(l.name)}<small>${fmt(l.unitC, cur)} × ${l.qty}${l.bundled ? ' (bundle price)' : ''}</small></span>
      <span class="stepper">
        <button data-bump="${l.key}" data-d="-1">−</button>
        <span>${l.qty}</span>
        <button data-bump="${l.key}" data-d="1">＋</button>
      </span>
      <span class="cart-line-amt">${fmt(l.chargedC, cur)}</span>
    </li>`).join('');

  $('#cartSum').innerHTML = `
    <div class="sum-row"><span>List price</span><span>${fmt(c.grossC, cur)}</span></div>
    ${c.discountC ? `<div class="sum-row discount"><span>Bundle discount</span><span>− ${fmt(c.discountC, cur)}</span></div>` : ''}
    <div class="sum-row total"><span>To collect</span><b>${fmt(c.totalC, cur)}</b></div>`;

  const pay = $('#payBox');
  if (cur === 'GBP') {
    pay.hidden = true;
  } else {
    pay.hidden = false;
    const quick = [c.totalC, 500, 1000, 2000, 5000];
    const seen = new Set();
    $('#quickCash').innerHTML = quick.filter(v => v > 0 && !seen.has(v) && seen.add(v))
      .map((v, i) => `<button data-cash="${num(v)}">${i === 0 ? 'Exact' : fmt(v, 'EUR')}</button>`).join('');
    const raw = $('#received').value.trim();
    const receivedC = raw === '' ? c.totalC : toC(raw);
    const changeC = receivedC - c.totalC;
    const row = $('.change-row');
    if (changeC < 0) {
      row.classList.add('short');
      $('#changeOut').textContent = `${fmt(-changeC, 'EUR')} short`;
    } else {
      row.classList.remove('short');
      $('#changeOut').textContent = fmt(changeC, 'EUR');
    }
  }
  requestAnimationFrame(() => snap(detent, false));
}

/* ---------- 바텀 시트: 애플식 드래그 (3단계) ---------- */
const DETENTS = ['peek', 'mid', 'full'];
const sheetH = () => $('#cart').offsetHeight;
const headH  = () => $('#cartGrab').offsetHeight;
function translateFor(d) {
  const h = sheetH(), head = headH();
  if (d === 'full') return 0;
  if (d === 'mid') return Math.max(0, Math.round((h - head) * 0.55));
  return Math.max(0, h - head);                 // peek: 손잡이 줄만 남김
}
function applyT(px, animate) {
  const box = $('#cart');
  curT = px;
  box.style.transition = animate ? 'transform .26s cubic-bezier(.32,.72,0,1)' : 'none';
  box.style.transform = `translateY(${px}px)`;
  $('#main').style.paddingBottom = (Math.max(0, sheetH() - px) + 90) + 'px';
}
function snap(d, animate = true) { detent = d; applyT(translateFor(d), animate); }

/* ---------------- 재고 화면 ---------------- */
function renderStock() {
  const today = dayOf();
  const tracked = state.products.filter(p => p.stock != null);
  const totalLeft = tracked.reduce((a, p) => a + p.stock, 0);
  const outList = tracked.filter(p => p.stock <= 0);
  const lowList = tracked.filter(p => p.stock > 0 && p.stock <= 3);
  const soldToday = state.products.reduce((a, p) => a + soldQty(today, p.id), 0);
  const soldTotal = state.products.reduce((a, p) => a + soldQty('ALL', p.id), 0);
  const days = dayCount();

  $('#stockSummary').innerHTML = `
    <h2>Stock overview</h2>
    <div class="tiles">
      <div class="tile"><span>Total left</span><b>${totalLeft}</b></div>
      <div class="tile strong"><span>Total sold${days > 1 ? ` (${days} days)` : ''}</span><b>${soldTotal}</b></div>
      <div class="tile"><span>Today sold</span><b>${soldToday}</b></div>
      <div class="tile"><span>Sold out</span><b>${outList.length}</b></div>
      <div class="tile wide"><span>3 or fewer left</span><b>${lowList.length}</b></div>
    </div>
    ${outList.length ? `<p class="hint">Sold out: ${outList.map(p => esc(p.name)).join(', ')}</p>` : ''}
    ${lowList.length ? `<p class="hint">Running low: ${lowList.map(p => esc(p.name) + ' (' + p.stock + ')').join(', ')}</p>` : ''}`;

  let html = '';
  for (const c of state.categories) {
    const items = productsOf(c.id);
    if (!items.length) continue;
    const left = items.reduce((a, p) => a + (p.stock || 0), 0);
    const sold = items.reduce((a, p) => a + soldQty(today, p.id), 0);
    const soldAll = items.reduce((a, p) => a + soldQty('ALL', p.id), 0);
    html += `<h3 data-cat="${c.id}">${esc(c.name)} · ${left} left <span class="muted">(sold ${sold} today / ${soldAll} total)</span></h3>`;
    html += items.map(p => stockRow(p, today)).join('');
  }
  $('#stockList').innerHTML = html;
}

function stockRow(p, today) {
  const sold = soldQty(today, p.id);
  const soldAll = soldQty('ALL', p.id);
  const base = p.baseStock || p.stock || 0;
  const left = p.stock;
  const pct = (left != null && base > 0) ? Math.max(0, Math.min(100, Math.round(left / base * 100))) : 0;
  const barCls = left == null ? '' : (left <= 0 ? 'out' : (left <= 3 ? 'low' : ''));
  return `<div class="stock-row" data-cat="${catOf(p.cat).id}" data-sid="${p.id}">
    <div class="stock-top">
      <span class="stock-name">${esc(p.name)}</span>
      <span class="stock-left">${left == null ? '<small>not tracked</small>' : `${left}<small> / ${base}</small>`}</span>
    </div>
    ${left == null ? '' : `<div class="stock-bar"><i class="${barCls}" style="width:${pct}%"></i></div>`}
    <div class="stock-foot"><span class="sold-today">sold <b>${sold}</b> today · <b>${soldAll}</b> total</span></div>
  </div>`;
}

/* ---------------- 장부 화면 ---------------- */
function renderLedger() {
  const dates = Array.from(new Set(state.sales.map(s => s.date))).sort().reverse();
  if (!dates.includes(dayOf())) dates.unshift(dayOf());
  if (ledgerDate !== 'ALL' && !dates.includes(ledgerDate)) ledgerDate = dates[0];
  $('#ledgerDate').innerHTML = dates.map(d =>
    `<option value="${d}"${d === ledgerDate ? ' selected' : ''}>${d}${d === dayOf() ? ' (today)' : ''}</option>`).join('')
    + `<option value="ALL"${ledgerDate === 'ALL' ? ' selected' : ''}>All days (total)</option>`;

  const t = summarize(ledgerDate);
  $('#ledgerSummary').innerHTML = `
    <div class="tiles" style="margin-top:12px">
      <div class="tile cash"><span>Cash sales (€)</span><b>${fmt(t.cashC, 'EUR')}</b></div>
      <div class="tile card"><span>Card sales (£)</span><b>${fmt(t.cardC, 'GBP')}</b></div>
      <div class="tile"><span>Cash received</span><b>${fmt(t.receivedC, 'EUR')}</b></div>
      <div class="tile"><span>Change given</span><b>${fmt(t.changeC, 'EUR')}</b></div>
      <div class="tile wide strong"><span>Cash you should be holding (received − change)</span><b>${fmt(t.drawerC, 'EUR')}</b></div>
      <div class="tile"><span>Bundle discount</span><b>${fmt(t.discountEurC, 'EUR')}${t.discountGbpC ? ' / ' + fmt(t.discountGbpC, 'GBP') : ''}</b></div>
      <div class="tile"><span>Sales / items</span><b>${t.count} / ${t.qty}</b></div>
    </div>`;

  // 카테고리(제작자)별 정산
  const cats = byCategory(ledgerDate);
  $('#ledgerByCat').innerHTML = cats.length ? `
    <table class="ptable">
      <thead><tr><th>Category</th><th>Qty</th><th>Cash €</th><th>Card £</th></tr></thead>
      <tbody>${cats.map(r => `<tr data-cat="${r.id}"><td><span class="cat-dot"></span>${esc(r.name)}</td><td>${r.qty}</td><td>${r.eurC ? num(r.eurC) : '–'}</td><td>${r.gbpC ? num(r.gbpC) : '–'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td>${cats.reduce((a, r) => a + r.qty, 0)}</td><td>${num(cats.reduce((a, r) => a + r.eurC, 0))}</td><td>${num(cats.reduce((a, r) => a + r.gbpC, 0))}</td></tr></tfoot>
    </table>` : '<p class="empty">No sales recorded.</p>';

  // 상품별
  const rows = [];
  for (const p of state.products) {
    let qty = 0, eur = 0, gbp = 0;
    for (const s of salesOf(ledgerDate)) for (const l of s.lines) if (l.productId === p.id) {
      qty += l.qty; if (s.currency === 'EUR') eur += l.chargedC; else gbp += l.chargedC;
    }
    if (qty) rows.push({ name: p.name, cat: catOf(p.cat).name, qty, eur, gbp });
  }
  for (const s of salesOf(ledgerDate)) for (const l of s.lines) if (!l.productId) {
    let r = rows.find(x => x.name === l.name);
    if (!r) { r = { name: l.name, cat: 'Other', qty: 0, eur: 0, gbp: 0 }; rows.push(r); }
    r.qty += l.qty; if (s.currency === 'EUR') r.eur += l.chargedC; else r.gbp += l.chargedC;
  }
  $('#ledgerByProduct').innerHTML = rows.length ? `
    <table class="ptable">
      <thead><tr><th>Product</th><th>Qty</th><th>Cash €</th><th>Card £</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${esc(r.name)}<small class="muted"> · ${esc(r.cat)}</small></td><td>${r.qty}</td><td>${r.eur ? num(r.eur) : '–'}</td><td>${r.gbp ? num(r.gbp) : '–'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td>${rows.reduce((a, r) => a + r.qty, 0)}</td><td>${num(rows.reduce((a, r) => a + r.eur, 0))}</td><td>${num(rows.reduce((a, r) => a + r.gbp, 0))}</td></tr></tfoot>
    </table>` : '<p class="empty">No sales recorded.</p>';

  // 테스트 기록
  const tests = testSales().slice().sort((a, b) => b.ts - a.ts);
  $('#testCard').hidden = !tests.length;
  if (tests.length) {
    $('#testList').innerHTML = tests.map(s => `<li class="test-row">
      <div class="hist-top">
        <span class="hist-items">${s.lines.map(l => esc(l.name) + '<span class="badge">×' + l.qty + '</span>').join(' ')}</span>
        <span class="hist-amt">${fmt(s.totalC, s.currency)}</span>
      </div>
      <div class="hist-meta"><span>🧪 ${s.date} ${hhmm(s.ts)}</span>
      <button class="hist-del" data-del="${s.id}">Delete</button></div>
    </li>`).join('');
  }

  // 거래 내역
  const list = salesOf(ledgerDate).slice().sort((a, b) => b.ts - a.ts);
  $('#histList').innerHTML = list.length ? list.map(s => {
    const items = s.lines.map(l => `${esc(l.name)}<span class="badge">×${l.qty}</span>`).join(' ');
    const meta = s.currency === 'EUR'
      ? `received ${fmt(s.receivedC, 'EUR')} · change ${fmt(s.changeC, 'EUR')}${s.discountC ? ` · discount ${fmt(s.discountC, 'EUR')}` : ''}`
      : `card payment (no change)${s.discountC ? ` · discount ${fmt(s.discountC, 'GBP')}` : ''}`;
    return `<li>
      <div class="hist-top">
        <span class="hist-items">${items} <span class="badge${s.currency === 'GBP' ? ' gbp' : ''}">${s.currency === 'GBP' ? 'Card £' : 'Cash €'}</span></span>
        <span class="hist-amt ${s.method}">${fmt(s.totalC, s.currency)}</span>
      </div>
      <div class="hist-meta"><span>🕒 ${s.date === dayOf() ? '' : s.date + ' '}${hhmm(s.ts)} · ${meta}</span>
      <button class="hist-del" data-del="${s.id}">Delete</button></div>
    </li>`;
  }).join('') : '<p class="empty">No sales recorded yet.</p>';
}

/* ---------------- 설정 화면 ---------------- */
function renderSettings() {
  const s = state.settings, g = catOf('postcard');
  if (isBundleCat(g)) {
    $('#pcUnitEur').value = num(g.unit.EUR);
    $('#pcPairEur').value = num(g.bundles[0].EUR);
    $('#pcUnitGbp').value = num(g.unit.GBP);
    $('#pcPairGbp').value = num(g.bundles[0].GBP);
  }

  const catOptions = p => state.categories
    .map(c => `<option value="${c.id}"${catOf(p.cat).id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');

  let html = '';
  for (const c of state.categories) {
    const items = productsOf(c.id);
    if (!items.length) continue;
    html += `<h3>${esc(c.name)} · ${items.length} item${items.length > 1 ? 's' : ''}</h3>`;
    html += items.map(p => {
      const bundled = isBundleCat(catOf(p.cat));
      return `<div class="prow" data-pid="${p.id}">
        <div class="prow-head">
          <input type="text" data-f="name" value="${esc(p.name)}">
          <button class="prow-del" data-delp="${p.id}">🗑</button>
        </div>
        <div class="prow-grid">
          <div><label>€ price</label><input type="number" inputmode="decimal" step="0.5" data-f="eur"
            value="${bundled ? num(catOf(p.cat).unit.EUR) : num(p.price.EUR)}" ${bundled ? 'disabled' : ''}></div>
          <div><label>£ price</label><input type="number" inputmode="decimal" step="0.5" data-f="gbp"
            value="${bundled ? num(catOf(p.cat).unit.GBP) : num(p.price.GBP)}" ${bundled ? 'disabled' : ''}></div>
          <div><label>Stock</label><input type="number" inputmode="numeric" data-f="stock"
            value="${p.stock == null ? '' : p.stock}" placeholder="untracked"></div>
        </div>
        ${p.bundles && p.bundles.length ? `
        <div class="prow-grid">
          <div><label>${p.bundles[0].qty} for €</label><input type="number" inputmode="decimal" step="0.5" data-f="b0eur" value="${num(p.bundles[0].EUR)}"></div>
          <div><label>${p.bundles[0].qty} for £</label><input type="number" inputmode="decimal" step="0.5" data-f="b0gbp" value="${num(p.bundles[0].GBP)}"></div>
          <div><label>&nbsp;</label><span class="tag" style="margin:0">bundle price</span></div>
        </div>` : ''}
        <label style="margin-top:8px">Category</label>
        <select data-f="cat">${catOptions(p)}</select>
        ${bundled ? `<span class="tag">※ Price comes from “Postcard price” above</span>` : ''}
      </div>`;
    }).join('');
  }
  $('#setProducts').innerHTML = html;
}

/* =========================================================
   CSV / JSON
   ========================================================= */
function download(name, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function csvOf(date, cur) {
  const head = ['Date', 'Time', 'Transaction ID', 'Method', 'Currency', 'Category', 'Product', 'Qty', 'Unit price', 'List total', 'Charged', 'Discount', 'Transaction total', 'Received', 'Change'];
  const rows = [head];
  for (const s of salesOf(date).filter(x => !cur || x.currency === cur).sort((a, b) => a.ts - b.ts)) {
    s.lines.forEach((l, i) => {
      const p = l.productId && prod(l.productId);
      const cname = catOf(p ? p.cat : (l.cat || 'etc')).name;
      rows.push([
        s.date, hhmm(s.ts), s.id, s.method === 'cash' ? 'Cash' : 'Card', s.currency,
        cname, l.name, l.qty, num(l.unitC), num(l.grossC), num(l.chargedC), num(l.grossC - l.chargedC),
        i === 0 ? num(s.totalC) : '', i === 0 ? num(s.receivedC) : '', i === 0 ? num(s.changeC) : ''
      ]);
    });
  }
  const body = rows.map(r => r.map(v => {
    const t = String(v);
    return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }).join(',')).join('\r\n');
  return '﻿' + body;   // BOM: 엑셀/구글시트 한글 깨짐 방지
}

/* ---------- 통화별 PDF 리포트 ---------- */
function aggregate(date, cur) {
  const list = salesOf(date).filter(s => s.currency === cur).sort((a, b) => a.ts - b.ts);
  const cats = new Map(), prods = new Map();
  let qty = 0, grossC = 0, totalC = 0, receivedC = 0, changeC = 0;
  for (const s of list) {
    grossC += s.grossC; totalC += s.totalC;
    receivedC += s.receivedC || 0; changeC += s.changeC || 0;
    for (const l of s.lines) {
      qty += l.qty;
      const p = l.productId && prod(l.productId);
      const c = catOf(p ? p.cat : (l.cat || 'etc'));
      const cr = cats.get(c.id) || { name: c.name, qty: 0, amtC: 0 };
      cr.qty += l.qty; cr.amtC += l.chargedC; cats.set(c.id, cr);
      const key = l.productId || ('x:' + l.name);
      const pr = prods.get(key) || { name: l.name, cat: c.name, qty: 0, amtC: 0 };
      pr.qty += l.qty; pr.amtC += l.chargedC; prods.set(key, pr);
    }
  }
  const catRows = state.categories.map(c => cats.get(c.id) && Object.assign({ id: c.id }, cats.get(c.id))).filter(Boolean);
  return { list, qty, grossC, totalC, discountC: grossC - totalC, receivedC, changeC,
           catRows, prodRows: Array.from(prods.values()).sort((a, b) => b.amtC - a.amtC) };
}

function reportHtml(date, cur) {
  const a = aggregate(date, cur);
  const label = cur === 'EUR' ? 'Cash EUR (€)' : 'Card GBP (£)';
  const period = date === 'ALL' ? `${dateRange()} (all days)` : date;
  const now = new Date();
  const stamp = `${dayOf(now)} ${hhmm(now.getTime())}`;
  const rate = parseFloat(state.settings.gbpToEur) || 0;
  const money = c => fmt(c, cur);

  const sum = cur === 'EUR'
    ? `<div class="big"><span>Total cash sales</span><span>${money(a.totalC)}</span></div>
       <div><span>List price total</span><span>${money(a.grossC)}</span></div>
       <div><span>Bundle discount</span><span>− ${money(a.discountC)}</span></div>
       <div><span>Cash received</span><span>${money(a.receivedC)}</span></div>
       <div><span>Change given</span><span>${money(a.changeC)}</span></div>
       <div><span>Cash you should be holding</span><span>${money(a.receivedC - a.changeC)}</span></div>
       <div><span>Sales / items</span><span>${a.list.length} / ${a.qty}</span></div>`
    : `<div class="big"><span>Total card sales</span><span>${money(a.totalC)}</span></div>
       <div><span>List price total</span><span>${money(a.grossC)}</span></div>
       <div><span>Bundle discount</span><span>− ${money(a.discountC)}</span></div>
       <div><span>Sales / items</span><span>${a.list.length} / ${a.qty}</span></div>
       <div><span>Payment</span><span>Card (no change given)</span></div>`;

  const catTable = a.catRows.length ? `
    <h2>Settlement by category</h2>
    <table><thead><tr><th>Category</th><th>Qty</th><th>Sales</th></tr></thead>
    <tbody>${a.catRows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.qty}</td><td>${money(r.amtC)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td>${a.qty}</td><td>${money(a.totalC)}</td></tr></tfoot></table>` : '';

  const prodTable = a.prodRows.length ? `
    <h2>Sales by product</h2>
    <table><thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Sales</th></tr></thead>
    <tbody>${a.prodRows.map(r => `<tr><td>${esc(r.name)}</td><td style="text-align:left">${esc(r.cat)}</td><td>${r.qty}</td><td>${money(r.amtC)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td></td><td>${a.qty}</td><td>${money(a.totalC)}</td></tr></tfoot></table>` : '';

  const txTable = a.list.length ? `
    <h2>Transactions</h2>
    <table><thead><tr><th>Date · time</th><th>Items</th><th>Amount</th>${cur === 'EUR' ? '<th>Received</th><th>Change</th>' : ''}</tr></thead>
    <tbody>${a.list.map(s => `<tr>
      <td>${date === 'ALL' ? s.date + ' ' : ''}${hhmm(s.ts)}</td>
      <td style="text-align:left">${s.lines.map(l => esc(l.name) + ' ×' + l.qty).join(', ')}</td>
      <td>${money(s.totalC)}</td>
      ${cur === 'EUR' ? `<td>${money(s.receivedC)}</td><td>${money(s.changeC)}</td>` : ''}
    </tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td></td><td>${money(a.totalC)}</td>${cur === 'EUR' ? `<td>${money(a.receivedC)}</td><td>${money(a.changeC)}</td>` : ''}</tr></tfoot></table>` : '';

  return `
    <div class="rp-head">
      <h1>Art Market Sales Report — ${label}</h1>
      <div class="rp-sub">Period: ${period} · This report contains <b>${cur}</b> transactions only.</div>
    </div>
    <div class="rp-sum">${sum}</div>
    ${catTable}
    ${prodTable}
    ${txTable}
    <div class="rp-foot">Generated ${stamp} · Art Market Ledger</div>`;
}

function printReport(cur) {
  const date = ledgerDate;
  const a = aggregate(date, cur);
  if (!a.list.length) { toast(cur === 'EUR' ? 'No EUR sales for this date' : 'No GBP sales for this date'); return; }
  $('#reportSheet').innerHTML = reportHtml(date, cur);
  const oldTitle = document.title;
  document.title = `ArtMarket_${cur}_report_${date}`;
  const restore = () => { document.title = oldTitle; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  setTimeout(restore, 60000);
  setTimeout(() => window.print(), 50);
}

/* =========================================================
   화면 전환 / 토스트
   ========================================================= */
function go(v) {
  view = v;
  ['sell', 'stock', 'ledger', 'settings'].forEach(k => { $('#view-' + k).hidden = (k !== v); });
  $$('.tab').forEach(b => b.classList.toggle('is-on', b.dataset.go === v));
  $('#cart').hidden = !(v === 'sell' && cart.length);
  if (v === 'stock') renderStock();
  if (v === 'ledger') renderLedger();
  if (v === 'settings') renderSettings();
  if (v === 'sell') { renderSell(); renderCart(); }
  window.scrollTo(0, 0);
}
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}
function renderAll() {
  renderTop();
  renderSell(); renderCart();
  if (view === 'stock') renderStock();
  if (view === 'ledger') renderLedger();
  if (view === 'settings') renderSettings();
}

/* =========================================================
   이벤트
   ========================================================= */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-add],[data-bump],[data-cash],[data-del],[data-delp],[data-cur]');
  if (!t) return;

  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.cur) { state.settings.currency = t.dataset.cur; save(); renderSell(); renderCart(); return; }
  if (t.dataset.add) return addToCart(t.dataset.add);
  if (t.dataset.bump) return bumpCart(t.dataset.bump, parseInt(t.dataset.d, 10));
  if (t.dataset.cash) { $('#received').value = t.dataset.cash; renderCart(); return; }
  if (t.dataset.del) return armTap(t, 'Delete?', () => deleteSale(t.dataset.del));

  if (t.dataset.delp) {
    const p = prod(t.dataset.delp);
    if (!p) return;
    armTap(t, '❗', () => {
      state.products = state.products.filter(x => x.id !== p.id);
      cart = cart.filter(c => c.productId !== p.id);
      save(); renderSettings(); renderAll(); toast(`Deleted ${p.name}`);
    });
  }
});

const grab = $('#cartGrab');
grab.addEventListener('pointerdown', e => {
  drag = { y: e.clientY, t: curT, moved: false };
  try { grab.setPointerCapture(e.pointerId); } catch (_) {}
  $('#cart').style.transition = 'none';
});
grab.addEventListener('pointermove', e => {
  if (!drag) return;
  const dy = e.clientY - drag.y;
  if (Math.abs(dy) > 4) drag.moved = true;
  applyT(Math.min(translateFor('peek'), Math.max(0, drag.t + dy)), false);
});
function endDrag() {
  if (!drag) return;
  const moved = drag.moved;
  drag = null;
  if (!moved) { snap(detent === 'full' ? 'peek' : 'full'); return; }   // 톡 치면 열고 닫기
  let best = 'full', bd = Infinity;
  for (const d of DETENTS) {
    const dist = Math.abs(translateFor(d) - curT);
    if (dist < bd) { bd = dist; best = d; }
  }
  snap(best);
}
grab.addEventListener('pointerup', endDrag);
grab.addEventListener('pointercancel', endDrag);
$('#cartClear').addEventListener('click', () => { cart = []; $('#received').value = ''; renderSell(); renderCart(); });
$('#cartRecord').addEventListener('click', recordSale);
$('#received').addEventListener('input', renderCart);

// 상단 숫자: 오늘 ⇄ 전체 기간
$('#topStats').addEventListener('click', () => {
  state.settings.topScope = state.settings.topScope === 'all' ? 'today' : 'all';
  save(); renderTop();
  toast(state.settings.topScope === 'all' ? 'Showing all days' : 'Showing today');
});

$('#customAdd').addEventListener('click', () => {
  const name = $('#customName').value.trim() || 'Other';
  const c = toC($('#customPrice').value);
  if (c <= 0) { toast('Enter an amount'); return; }
  cart.push({ key: uid(), productId: null, name, qty: 1, unitC: c });
  $('#customName').value = ''; $('#customPrice').value = '';
  detent = 'full'; renderCart(); toast(`${name} added`);
});

$('#restockAll').addEventListener('click', e => armTap(e.currentTarget, 'Tap again to reset', () => {
  for (const p of state.products) if (p.baseStock != null) p.stock = p.baseStock;
  save(); renderStock(); renderTop(); renderSell(); toast('Stock reset to starting quantity');
}));

document.addEventListener('change', e => {
  // 설정: 상품 편집
  const row = e.target.closest('.prow');
  if (row && e.target.dataset.f) {
    const p = prod(row.dataset.pid);
    if (!p) return;
    const f = e.target.dataset.f, v = e.target.value;
    if (f === 'name') p.name = v.trim() || p.name;
    if (f === 'eur' && !isBundleCat(catOf(p.cat))) p.price.EUR = toC(v);
    if (f === 'gbp' && !isBundleCat(catOf(p.cat))) p.price.GBP = toC(v);
    if (f === 'b0eur' && p.bundles) p.bundles[0].EUR = toC(v);
    if (f === 'b0gbp' && p.bundles) p.bundles[0].GBP = toC(v);
    if (f === 'stock') {
      p.stock = v.trim() === '' ? null : Math.max(0, parseInt(v, 10) || 0);
      p.baseStock = p.stock;
    }
    if (f === 'cat') { p.cat = v; save(); renderSettings(); renderAll(); toast('Category changed'); return; }
    save(); renderTop(); renderSell();
    return;
  }
});

// 설정: 엽서 가격
[['#pcUnitEur', v => catOf('postcard').unit.EUR = toC(v)],
 ['#pcUnitGbp', v => catOf('postcard').unit.GBP = toC(v)],
 ['#pcPairEur', v => catOf('postcard').bundles[0].EUR = toC(v)],
 ['#pcPairGbp', v => catOf('postcard').bundles[0].GBP = toC(v)]
].forEach(([sel, fn]) => {
  $(sel).addEventListener('change', e => { fn(e.target.value); save(); renderSell(); renderCart(); renderTop(); toast('Saved'); });
});

$('#addProduct').addEventListener('click', () => {
  state.products.push({ id: 'p-' + uid(), name: 'New product', cat: 'etc', price: { EUR: 0, GBP: 0 }, stock: null, baseStock: null });
  save(); renderSettings(); renderSell();
  const rows = $$('.prow'); rows[rows.length - 1].scrollIntoView({ block: 'center' });
});

const dlCsv = cur => {
  const n = salesOf(ledgerDate).filter(s => !cur || s.currency === cur).length;
  if (!n) { toast('Nothing to export'); return; }
  const span = ledgerDate === 'ALL' ? dateRange().replace(' ~ ', '_') : ledgerDate;
  download(`artmarket-${cur || 'all'}-${span}.csv`, csvOf(ledgerDate, cur), 'text/csv;charset=utf-8');
};
$('#csvEur').addEventListener('click', () => dlCsv('EUR'));
$('#csvGbp').addEventListener('click', () => dlCsv('GBP'));
$('#csvAll').addEventListener('click', () => dlCsv(null));
$('#pdfEur').addEventListener('click', () => printReport('EUR'));
$('#pdfGbp').addEventListener('click', () => printReport('GBP'));
const backup = () => download(`artmarket-backup-${dayOf()}.json`, JSON.stringify(state, null, 2), 'application/json');
$('#expJson').addEventListener('click', backup);
$('#expJson2').addEventListener('click', backup);

$('#impJson').addEventListener('click', e => armTap(e.currentTarget, 'Overwrite — tap again', () => $('#fileInput').click()));
$('#fileInput').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      state = migrate(JSON.parse(r.result));
      cart = []; save(); renderTestBar(); renderAll(); renderSettings(); toast('Backup restored');
    } catch (err) { alert('Could not read that file.'); }
  };
  r.readAsText(f);
  e.target.value = '';
});

$('#resetDay').addEventListener('click', e => {
  const n = salesOf(dayOf()).length;
  if (!n) { toast('No records today'); return; }
  armTap(e.currentTarget, `Delete ${n} — tap again`, () => {
    for (const s of salesOf(dayOf())) restoreStock(s);
    state.sales = state.sales.filter(s => s.test || s.date !== dayOf());
    save(); renderAll(); toast("Today's records deleted · stock restored");
  });
});
$('#resetAll').addEventListener('click', e => armTap(e.currentTarget, 'Factory reset — tap again', () => {
  state = defaultState(); cart = [];
  save(); renderAll(); renderSettings(); toast('Reset to defaults');
}));

/* 판매 기록 전부 삭제 + 재고 전부 복구 (상품·가격은 그대로) */
$('#cleanAll').addEventListener('click', e => armTap(e.currentTarget, 'Delete everything — tap again', () => {
  state.sales = [];
  for (const p of state.products) if (p.baseStock != null) p.stock = p.baseStock;
  save(); renderAll(); renderSettings(); toast('All sales deleted · stock reset');
}));

/* 이 날짜 기록 전체 삭제 */
$('#clearDate').addEventListener('click', e => {
  const n = salesOf(ledgerDate).length;
  if (!n) { toast('No records for this date'); return; }
  armTap(e.currentTarget, `Delete ${n} — tap again`, () => {
    for (const s of salesOf(ledgerDate)) restoreStock(s);
    const keep = ledgerDate === 'ALL' ? [] : state.sales.filter(s => s.test || s.date !== ledgerDate);
    state.sales = ledgerDate === 'ALL' ? testSales() : keep;
    save(); renderAll(); toast('Deleted · stock restored');
  });
});

/* 테스트 모드 */
$('#setTest').addEventListener('change', e => {
  state.settings.testMode = e.target.checked;
  save(); renderTestBar(); renderAll(); renderSettings();
  toast(e.target.checked ? '🧪 Test mode ON — nothing counts' : 'Test mode OFF — sales count for real');
});
$('#testOff').addEventListener('click', () => {
  state.settings.testMode = false;
  save(); renderTestBar(); renderAll(); renderSettings(); toast('Test mode off');
});
const wipeTests = e => armTap(e.currentTarget, 'Delete all — tap again', () => {
  if (!testSales().length) { toast('No test records'); return; }
  state.sales = state.sales.filter(s => !s.test);
  save(); renderAll(); toast('Test records cleared');
});
$('#testWipe').addEventListener('click', wipeTests);
$('#testWipe2').addEventListener('click', wipeTests);

$('#ledgerDate').addEventListener('change', e => { ledgerDate = e.target.value; renderLedger(); });

window.addEventListener('resize', () => { if (!$('#cart').hidden) renderCart(); });

/* ---------------- 시작 ---------------- */
renderTestBar();
go('sell');
renderTop();

// 콘솔 점검용
window.__market = { get state() { return state; }, get cart() { return cart; },
                    computeCart, bestPrice, summarize, byCategory, csvOf, aggregate, reportHtml, printReport, addToCart, recordSale, testSales };
