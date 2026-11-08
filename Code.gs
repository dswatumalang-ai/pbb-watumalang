/**
 * Backend Modul PBB Desa – Google Sheets + Apps Script
 * Tempel di: Google Sheet → Ekstensi → Apps Script. Lihat README.md.
 */
var KEY = 'GANTI-DENGAN-KUNCI-RAHASIA-ANDA';   // harus sama dengan CLOUD_KEY di config.js
var CH = 45000;                                  // batas aman per sel (maks 50.000 karakter)

/* ---------- entry point ---------- */
function doGet() { return ContentService.createTextOutput('PBB Desa API aktif'); }

function doPost(e) {
  var out;
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.k !== KEY) throw new Error('Kunci cloud salah (CLOUD_KEY tidak sama dengan KEY).');
    var lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try { out = route_(d); } finally { lock.releaseLock(); }
  } catch (err) {
    out = { ok: false, e: String(err.message || err), c: err.code || '' };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function route_(d) {
  switch (d.a) {
    case 'names': return names_();
    case 'pay':   return pay_(d);
    case 'pull':  return pull_(d);
    case 'push':  return push_(d);
    case 'paket':
      auth_(d.au);
      if (d.au.role !== 'pem') throw new Error('Bukan akun pemungut.');
      var p = kvGet_('P:' + d.au.n);
      if (!p) throw new Error('Paket untuk ' + d.au.n + ' belum tersedia. Minta admin menekan "Unggah ke cloud".');
      return { ok: true, p: p };
    case 'full':
      auth_(d.au);
      if (d.au.role !== 'admin') throw new Error('Hanya admin.');
      return { ok: true, S: kvGet_('S') };
  }
  throw new Error('Aksi tidak dikenal.');
}

/* ---------- sheet & penyimpanan kunci-nilai (sheet _DB, tersembunyi) ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sh_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) {
    s = ss_().insertSheet(name);
    if (name === 'Pembayaran') {
      s.getRange('A:C').setNumberFormat('@');
      s.getRange(1, 1, 1, 6).setValues([['NOP', 'Tgl Lunas', 'Tgl Serah SPPT', 't (ms)', 'u (ms)', 'Dicatat oleh']]).setFontWeight('bold');
      s.setFrozenRows(1);
    }
    if (name === '_DB') s.hideSheet();
  }
  return s;
}

function setup() { sh_('Pembayaran'); sh_('_DB'); sh_('DHKP'); }   // jalankan sekali untuk memberi izin

function kvRow_(sh, key) {
  var n = sh.getLastRow(); if (!n) return 0;
  var v = sh.getRange(1, 1, n, 1).getValues();
  for (var i = 0; i < n; i++) if (v[i][0] === key) return i + 1;
  return 0;
}
function kvGet_(key) {
  var sh = sh_('_DB'), r = kvRow_(sh, key); if (!r) return null;
  var c = sh.getLastColumn(); if (c < 2) return null;
  var v = sh.getRange(r, 2, 1, c - 1).getValues()[0], out = [];
  for (var i = 0; i < v.length; i++) { if (v[i] === '') break; out.push(String(v[i]).substr(1)); }
  return out.join('');
}
function kvSet_(key, str) {
  var sh = sh_('_DB'), parts = [];
  for (var i = 0; i < str.length; i += CH) parts.push('J' + str.substr(i, CH));   // awalan J mencegah sel diubah jadi angka/rumus
  if (!parts.length) parts.push('J');
  var r = kvRow_(sh, key) || sh.getLastRow() + 1, need = 1 + parts.length;
  if (sh.getMaxColumns() < need) sh.insertColumnsAfter(sh.getMaxColumns(), need - sh.getMaxColumns());
  if (sh.getMaxRows() < r) sh.insertRowsAfter(sh.getMaxRows(), r - sh.getMaxRows());
  sh.getRange(r, 1, 1, sh.getMaxColumns()).clearContent();
  sh.getRange(r, 1, 1, need).setValues([[key].concat(parts)]);
}
function kvDelPrefix_(p) {
  var sh = sh_('_DB'), n = sh.getLastRow(); if (!n) return;
  var v = sh.getRange(1, 1, n, 1).getValues();
  for (var i = n - 1; i >= 0; i--) if (String(v[i][0]).indexOf(p) === 0) sh.deleteRow(i + 1);
}

/* ---------- autentikasi (hash PIN dari aplikasi) ---------- */
function authErr_(msg) { var e = new Error(msg); e.code = 'auth'; return e; }
function tooMany_() { return +(CacheService.getScriptCache().get('fail') || 0) >= 30; }
function fail_() { var c = CacheService.getScriptCache(); c.put('fail', String(+(c.get('fail') || 0) + 1), 600); }

function auth_(au) {
  if (tooMany_()) throw authErr_('Terlalu banyak PIN salah. Coba lagi dalam 10 menit.');
  var A = JSON.parse(kvGet_('A') || 'null');
  if (!A) throw new Error('Data desa belum diunggah admin ke cloud.');
  var ok = false;
  if (au && au.role === 'admin') ok = !!A.adm && au.h === A.adm;
  else if (au && au.role === 'pem') ok = !!(A.pin && A.pin[au.n]) && au.h === A.pin[au.n];
  if (!ok) { fail_(); throw authErr_('PIN tidak cocok dengan data cloud. Jika PIN baru diganti, admin perlu menekan "Unggah ke cloud".'); }
  return A;
}

/* ---------- aksi ---------- */
function names_() {
  var A = JSON.parse(kvGet_('A') || 'null');
  if (!A) return { ok: true, init: false };
  var ns = []; for (var n in (A.pin || {})) if (A.pin[n]) ns.push(n);
  return { ok: true, init: true, salt: A.salt, names: ns };
}

function ds_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd') : String(v || ''); }

function pay_(d) {
  auth_(d.au);
  var sh = sh_('Pembayaran'), last = sh.getLastRow();
  var data = last > 1 ? sh.getRange(2, 1, last - 1, 6).getValues() : [];
  var idx = {}, i; for (i = 0; i < data.length; i++) idx[String(data[i][0])] = i;
  var now = Date.now(), by = d.au.role === 'admin' ? 'Admin' : d.au.n, n = 0;
  (d.items || []).forEach(function (it) {
    var nop = String(it.nop), row = [nop, String(it.lunas || ''), String(it.serah || ''), +it.t || 0, now, by], k = idx[nop];
    if (k === undefined) { idx[nop] = data.length; data.push(row); n++; }
    else if ((+data[k][3] || 0) <= row[3]) { data[k] = row; n++; }      // yang terbaru menang
  });
  if (n) sh.getRange(2, 1, data.length, 6).setValues(data);
  return { ok: true, n: n };
}

function pull_(d) {
  auth_(d.au);
  var since = +d.since || 0, sh = sh_('Pembayaran'), last = sh.getLastRow(), items = [];
  if (last > 1) {
    var v = sh.getRange(2, 1, last - 1, 6).getValues();
    for (var i = 0; i < v.length; i++) if (+v[i][4] > since)
      items.push({ nop: String(v[i][0]), lunas: ds_(v[i][1]), serah: ds_(v[i][2]), t: +v[i][3] });
  }
  return { ok: true, items: items, u: Date.now() };
}

function safe_(x) { x = String(x == null ? '' : x); return /^[=+\-@]/.test(x) ? "'" + x : x; }

function push_(d) {
  if (tooMany_()) throw authErr_('Terlalu banyak PIN salah. Coba lagi dalam 10 menit.');
  var A = JSON.parse(kvGet_('A') || 'null');
  if (A && !(d.au && d.au.role === 'admin' && A.adm && d.au.h === A.adm)) { fail_(); throw authErr_('PIN admin tidak cocok dengan data cloud.'); }
  if (!d.A || !d.A.adm) throw new Error('PIN admin belum diatur.');
  sh_('Pembayaran');
  kvSet_('S', d.S);
  kvSet_('A', JSON.stringify(d.A));
  kvDelPrefix_('P:');
  for (var n in (d.P || {})) kvSet_('P:' + n, d.P[n]);
  writeView_(d.view || []);
  return { ok: true };
}

/* Lembar "DHKP": daftar NOP + status lunas/serah yang otomatis terisi dari lembar Pembayaran */
function writeView_(rows) {
  var sh = sh_('DHKP'); sh.clear();
  sh.getRange(1, 1, 1, 7).setValues([['NOP', 'Nama WP', 'Pokok (Rp)', 'Dusun/RT-RW', 'Pemungut', 'Tgl Lunas', 'Tgl Serah SPPT']]).setFontWeight('bold');
  sh.setFrozenRows(1);
  var n = rows.length; if (!n) return;
  sh.getRange(2, 1, n, 1).setNumberFormat('@');
  sh.getRange(2, 1, n, 5).setValues(rows.map(function (r) { return [String(r[0]), safe_(r[1]), +r[2] || 0, safe_(r[3]), safe_(r[4])]; }));
  var f = [];
  for (var i = 0; i < n; i++) {
    var rw = i + 2;
    f.push(['=IFERROR(VLOOKUP($A' + rw + ',Pembayaran!$A:$C,2,FALSE)&"","")',
            '=IFERROR(VLOOKUP($A' + rw + ',Pembayaran!$A:$C,3,FALSE)&"","")']);
  }
  sh.getRange(2, 6, n, 2).setFormulas(f);
}
