# Changelog

Perubahan dicatat sejak bootstrap dokumentasi; tidak ada sejarah fitur lama yang direkonstruksi tanpa bukti.

## 2026-09-12

### Added — Status Peserta Aktif/Nonaktif

- Menambahkan migration `participants.is_active` dengan default `true`.
- Menambahkan indikator, filter, dan aksi aktif/nonaktif pada halaman Kelola Peserta.
- Memisahkan statistik peserta nonaktif dari total aktif serta hitungan laki-laki dan perempuan aktif.
- Mengeluarkan peserta nonaktif dari pilihan absensi QR/manual, Pengumuman WA, finalisasi Alfa, dan daftar WhatsApp Alfa.
- Menambahkan penolakan server-side untuk pencatatan peserta nonaktif tanpa menghapus riwayat attendance lama.
- Menambahkan regression check berbasis `node:test` untuk kontrak status peserta.

### Added — Japri WhatsApp

- Menambahkan halaman pengumuman sesi yang membuat pesan personal dari data sesi dan peserta.
- Menambahkan tombol Pengumuman WA pada setiap baris sesi.
- Menambahkan status sudah/belum dijapri, warna kartu, statistik, filter, waktu klik, dan aksi reset.
- Menerapkan status japri yang sama pada halaman peserta Alfa.
- Menambahkan penyimpanan localStorage terpisah per sesi/jenis pesan dan sinkronisasi realtime antar-tab.
- Menambahkan test helper status, JavaScript inline kedua halaman, dan akses halaman melalui server lokal.

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
