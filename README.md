# Modul PBB Desa – Dashboard (dengan sinkron Google Sheets)

Aplikasi web statis untuk pengelolaan PBB tingkat desa. Bisa dipakai **offline** (data di browser) atau **multi-user online**
(data tersimpan di Google Sheets milik Anda, gratis).

Isi repository:
| File | Fungsi |
|---|---|
| `index.html` | Aplikasi |
| `config.js` | Tempat menempel URL & kunci cloud |
| `Code.gs` | Kode backend untuk Google Apps Script (**tidak** dipakai GitHub, hanya untuk ditempel di Google Sheet) |
| `.nojekyll` | Agar GitHub Pages menyajikan file apa adanya |

## A. Publikasi di GitHub Pages
1. Buat repository **Public** di GitHub (mis. `pbb-desa`), upload seluruh isi folder ini.
2. **Settings → Pages →** Source: *Deploy from a branch* → branch `main`, folder `/ (root)` → Save.
3. Alamat: `https://USERNAME.github.io/pbb-desa/`

## B. Mengaktifkan penyimpanan bersama (Google Sheets)
1. Buka sheets.google.com → buat spreadsheet baru, beri nama mis. **Database PBB Desa**.
2. Menu **Ekstensi → Apps Script**. Hapus isi default, tempel seluruh isi `Code.gs`.
3. Ubah baris `var KEY = '...'` menjadi kata sandi acak buatan Anda (mis. 20 karakter). Simpan (ikon disket).
4. Pilih fungsi **setup** di dropdown atas, klik **Jalankan**, lalu setujui izin
   (Lanjutan → *Buka ... (tidak aman)* → Izinkan). Ini normal untuk skrip buatan sendiri.
5. Klik **Deploy → Penerapan baru** → ikon roda gigi → **Aplikasi web**:
   - *Jalankan sebagai*: **Saya**
   - *Yang memiliki akses*: **Siapa saja**
   - klik **Deploy**, lalu **salin URL** (berakhiran `/exec`).
6. Di GitHub, buka `config.js` → ikon pensil → isi:
   ```js
   var CLOUD_URL = 'URL_DARI_LANGKAH_5';
   var CLOUD_KEY = 'KUNCI_YANG_SAMA_DENGAN_KEY_DI_Code.gs';
   ```
   lalu **Commit changes**. Tunggu 1–2 menit.
7. Buka aplikasi sebagai admin: **Pengaturan → Akun & akses**, atur PIN admin dan PIN tiap pemungut, lalu tekan
   **"Unggah data & paket pemungut ke cloud"**.

### Cara pakai sehari-hari
- **Pemungut** membuka alamat aplikasi di HP → pilih nama → masukkan PIN → data wilayahnya termuat otomatis.
- Setiap **Lunas / Serahkan SPPT / Batalkan** otomatis terkirim ke Google Sheets dan muncul di perangkat lain
  dalam ±30 detik. Jika sinyal hilang, catatan menunggu di perangkat dan terkirim sendiri saat online
  (lihat label ☁ di pojok kanan bawah; ketuk untuk sinkron sekarang).
- **Admin** menekan *Unggah ke cloud* lagi setiap kali mengubah data NOP, wilayah/pemungut, jadwal, atau PIN.
  Pemungut lalu memakai tombol **"Muat paket terbaru dari cloud"** di layar login.
- Admin di perangkat lain: buka aplikasi → pilih *Admin* → PIN → data dipulihkan dari cloud.
- Di Google Sheet Anda ada lembar **DHKP** (daftar NOP + status lunas/serah, otomatis terisi) dan **Pembayaran**
  (catatan mentah, termasuk siapa yang mencatat). Jangan mengedit lembar `Pembayaran`/`_DB` secara manual.

### Catatan keamanan
- `CLOUD_KEY` terlihat di file publik; fungsinya hanya menahan akses iseng. Perlindungan utama adalah PIN
  (diverifikasi server; 30 kali salah → terkunci 10 menit).
- Jangan membagikan (share) Google Sheet ke pemungut; cukup Anda sebagai pemilik. Lembar `_DB` menyimpan seluruh data
  dan hash PIN.
- Jika mengubah kode `Code.gs` di kemudian hari: **Deploy → Kelola penerapan → Edit → Versi baru → Deploy**.
- Kuota gratis Google Apps Script cukup untuk puluhan pengguna setingkat desa.
- Tetap lakukan **Cadangan data** (menu Pengaturan) secara berkala.

## Mode offline
Biarkan `CLOUD_URL` kosong di `config.js`; aplikasi berjalan seperti semula (data di browser + alur paket/setoran JSON).
