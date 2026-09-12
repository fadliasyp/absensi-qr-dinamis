# Changelog

Perubahan dicatat sejak bootstrap dokumentasi; tidak ada sejarah fitur lama yang direkonstruksi tanpa bukti.

## 2026-09-12

### Fixed

- Memperbaiki endpoint hapus admin dengan memakai export `supabaseAdmin` yang sudah tersedia.
- Menghapus handler duplikat untuk data Alfa dan penghapusan lokasi; perilaku handler aktif dipertahankan.
- Membuat `npm start` benar-benar membuka server lokal dan menyajikan halaman di `public/`.
- Mengarahkan metadata entrypoint package ke `api/index.js` yang benar-benar tersedia.
- Menghapus logging URL Supabase dan session ID dari generator QR.
- Memperbarui dependency transitive kompatibel hingga `npm audit --omit=dev` melaporkan nol kerentanan runtime.

### Added

- Menambahkan smoke test server lokal berbasis `node:test` tanpa dependency testing baru.

### Documentation

- Menambahkan README sebagai pintu masuk project.
- Menambahkan aturan permanen agent di `AGENTS.md`.
- Menambahkan project context, current task, feature baseline, architecture, database notes, dan decision log.
- Mendokumentasikan fitur yang ditemukan beserta status `WORKING`, `PARTIAL`, `BROKEN`, dan `DEPRECATED`.
- Mencatat ketidakpastian schema/RLS dan risiko authorization tanpa mengubah source code.

### Technical

- Memverifikasi sintaks `api/index.js`, `server.js`, dan `public/admin-auth.js` dengan `node --check`.
- Menjalankan `npm test` dan mengonfirmasi bahwa script masih placeholder yang keluar gagal.
