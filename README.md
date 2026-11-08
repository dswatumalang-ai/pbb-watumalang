# Modul PBB Desa – Dashboard

Aplikasi web statis untuk pengelolaan PBB tingkat desa. Berjalan sepenuhnya di browser (tanpa server/database).

## Cara Menjalankan
- **Online:** buka alamat GitHub Pages repository ini (lihat langkah di bawah).
- **Lokal:** klik dua kali `index.html`.

## Cara Publikasi di GitHub Pages (gratis)
1. Buat repository baru di GitHub (contoh: `pbb-desa`), set **Public**.
2. Klik **Add file → Upload files**, seret seluruh isi folder ini (`index.html`, `README.md`, `.nojekyll`), lalu **Commit changes**.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
5. Pilih branch **main** dan folder **/ (root)**, klik **Save**.
6. Tunggu 1–2 menit. Alamat situs: `https://USERNAME.github.io/pbb-desa/`

## Catatan Penting
- Data disimpan di **localStorage** browser masing-masing perangkat. Data tidak dibagikan antar perangkat dan bisa hilang jika cache browser dihapus. Lakukan **ekspor/backup Excel** secara berkala.
- Repository Public berarti kode terlihat umum, tetapi data yang Anda input **tidak** ikut terunggah.
- Membutuhkan internet saat pertama dibuka untuk memuat library SheetJS (cdnjs).

## Pembaruan
Edit atau upload ulang `index.html` ke repository; situs diperbarui otomatis dalam beberapa menit.
