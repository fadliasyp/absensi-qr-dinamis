# Project Context

Terakhir diperbarui: 2026-09-21

## Overview

Absensi QR Dinamis adalah project existing berupa aplikasi web absensi. Admin mengelola peserta dan sesi; peserta membuka URL dari QR, memilih identitas, lalu mengirim kehadiran tanpa memberi izin geolocation. Supabase menyimpan data dan menyediakan authentication admin.

Target pengguna:

- Admin/pengelola kegiatan atau pengajian
- Super admin yang menyetujui akun admin
- Peserta yang melakukan absensi

## Current Status

Status keseluruhan: **WORKING berdasarkan implementasi statis, belum terverifikasi end-to-end**.

Source JavaScript utama lolos pemeriksaan sintaks pada 2026-09-12. Smoke test server lokal juga lulus, tetapi koneksi database/deployment belum diuji end-to-end. Karena itu belum ada fitur bisnis yang layak diklaim `STABLE`.

## Completed Features (berdasarkan source code)

- Registrasi dan login admin melalui Supabase Auth (email/password dan login Google).
- Approval status admin serta pembatasan halaman super admin.
- Timeout sesi admin: idle 30 menit dan umur sesi maksimum 8 jam pada browser.
- CRUD peserta: tambah tunggal/bulk, daftar/filter, edit, hapus, nomor WhatsApp, dan status aktif/nonaktif.
- Peserta nonaktif dikeluarkan dari pilihan absensi QR/manual, pengumuman, finalisasi Alfa, dan daftar WhatsApp Alfa serta ditolak oleh endpoint pencatatan.
- Pembuatan, daftar/filter, edit masa aktif, dan penghapusan sesi. Waktu sesi dapat diubah saat sesi sudah mulai atau sedang berjalan selama belum difinalisasi.
- Pembuatan URL/QR per sesi dan unduhan lembar QR PDF.
- Absensi peserta dengan validasi sesi aktif, waktu, token, peserta aktif, peserta ganda, dan perangkat ganda tanpa geolocation.
- Halaman absensi memiliki fallback device ID untuk browser lama serta tetap dapat mengirim request ketika akses localStorage ditolak.
- Halaman absensi publik memakai custom picker lokal bergaya biru untuk kelompok/nama dan popup lokal untuk loading, informasi, sukses, duplikat, serta kegagalan tanpa dependency CDN/font eksternal.
- Pemilih Nama Peserta mengambil status terbaru setiap kali dibuka dan hanya menampilkan peserta aktif yang belum memiliki attendance pada sesi tersebut.
- Query independen pada pemuatan peserta dan submit QR dijalankan paralel dengan kolom minimum untuk mengurangi waktu tunggu Supabase.
- Halaman absensi membatasi waktu tunggu request menjadi 20 detik, menyediakan retry, dan menjelaskan kegagalan QR, sesi, peserta, duplikat, koneksi, serta server dengan pesan yang dapat ditindaklanjuti.
- Input manual status `Hadir`, `Izin`, atau `Alfa` dengan custom picker Kelompok/Nama Peserta; gender dan status data lama tampil sebagai metadata/badge terpisah.
- Finalisasi sesi: peserta yang belum tercatat menjadi `Alfa`.
- Rekap kehadiran, ringkasan/filter pada dashboard, dan export PDF.
- Daftar peserta Alfa serta penyusunan tautan/pesan WhatsApp; pengiriman tetap dilakukan manual oleh pengguna.
- Pengumuman sesi melalui japri WhatsApp satu per satu untuk semua peserta yang terdaftar.
- Status “Sudah/Belum dijapri” untuk pengumuman dan Alfa, tersimpan serta sinkron antar-tab pada browser admin yang sama.
- Custom template Alfa dan Pengumuman yang tersimpan terpisah per sesi/jenis pada browser admin yang sama.
- Database peserta per kelompok dengan tab Peserta/Link Kelompok, field pilihan dinamis, arsip yang mempertahankan data, rekap field aktif, filter custom, export PDF per kelompok, link ketua tanpa login, progress, dan autosave. Implementasi lokal selesai; migration belum diterapkan.

Status per fitur ada di `FEATURE_BASELINE.md`.

## Current Work

Belum ada task pengembangan aktif. Database peserta dinamis per kelompok sudah diimplementasikan dan regression test lokal lulus, tetapi migration serta pengujian Supabase nyata masih menunggu pengguna.

## Pending Work

Belum diprioritaskan oleh pengguna:

- Menyediakan schema/migration database yang reproducible.
- Menambahkan test otomatis dan lingkungan pengujian non-produksi.
- Memindahkan authorization operasi admin ke server-side untuk seluruh endpoint sensitif.
- Memverifikasi endpoint penghapusan admin terhadap project Supabase non-produksi.

## Business Logic

- Sesi harus aktif dan berada di antara `start_time` dan `end_time` agar QR/absensi diterima.
- Token QR disimpan di `qr_tokens`. Implementasi mengambil token pertama milik sesi atau membuat satu token baru yang kedaluwarsa pada `end_time` (fallback 24 jam).
- Saat masa aktif sesi diubah, `expired_at` token QR yang sudah ada ikut disesuaikan tanpa mengganti token.
- Absensi reguler tidak meminta atau memvalidasi koordinat peserta. Nama tempat sesi hanya informasi opsional.
- Satu peserta hanya boleh memiliki satu record per sesi.
- `local_device_id` (localStorage) dan `cookie_device_id` dipakai untuk membatasi satu perangkat per sesi.
- Input manual dapat membuat record atau mengganti status record yang sudah ada menjadi `Hadir`, `Izin`, atau `Alfa`.
- Finalisasi hanya boleh setelah waktu sesi selesai dan hanya satu kali menurut flag `is_finalized`.
- Semua peserta tanpa record saat finalisasi dibuat sebagai `Alfa`.
- Hanya peserta aktif yang menjadi kandidat absensi dan finalisasi. Menonaktifkan peserta mempertahankan riwayat attendance yang sudah ada.
- Sesi yang dibuat UI saat ini menggunakan `kelompok: "Semua"`; daftar peserta tidak dibatasi berdasarkan kelompok sesi.
- Format tanggal/waktu laporan menggunakan locale Indonesia dan zona `Asia/Jakarta`.
- Status japri dicatat saat admin membuka tautan WhatsApp. Status ini bukan bukti delivery dan disimpan terpisah per sesi/jenis pesan di localStorage browser admin.
- Custom template WhatsApp disimpan terpisah berdasarkan session ID dan jenis `alfa`/`announcement` di localStorage; template tidak tersedia lintas HP/browser.
- Ketua kelompok mengakses database melalui token link tanpa login. Token hanya boleh membaca peserta aktif dan menyimpan field tambahan pada kelompok yang sama.
- Field inti peserta tetap dipakai alur lama; field tambahan pilihan berlaku global dan nilainya disimpan terpisah per peserta.
- Field tambahan yang diarsipkan tidak tampil pada link ketua maupun rekap hasil admin. Definisi dan nilainya tetap tersimpan dan muncul kembali jika field diaktifkan.
- Export database PDF memuat peserta aktif satu kelompok, kolom nomor, serta 1–6 field inti/dinamis aktif yang dipilih admin. Layout A4 potret memakai baris rapat untuk sekitar 40 peserta per halaman.

## Technical Facts

- Handler produksi: `api/index.js`.
- Handler yang sama membuka server lokal dan menyajikan `public/` ketika dijalankan langsung melalui `npm start`.
- `server.js` adalah prototipe lama dengan array in-memory, satu sesi contoh, dan token 20 detik.
- Frontend tidak memiliki proses build.
- Halaman admin masih memakai CDN Supabase JS dan SweetAlert2; halaman absensi publik tidak lagi bergantung pada CDN.
- Vercel me-rewrite `/api/(.*)` ke `api/index.js`.
- Git history yang tersedia hanya dua commit dan tidak cukup untuk membuktikan kestabilan fitur.

## Constraints

- Schema awal, seed, mayoritas constraint/index, RLS policy, dan konfigurasi Supabase Auth tidak tersimpan lengkap di repository. Constraint/index utama attendance sudah diverifikasi lewat audit Supabase 2026-09-13.
- Banyak halaman dan handler berada dalam file besar, sehingga perubahan harus sangat terarah.
- Data nyata dan deployment tidak boleh digunakan untuk discovery tanpa izin.

## Known Issues and Risks

- **Performa deployment:** cold start Vercel, jarak region Vercel–Supabase, jumlah peserta, dan index database belum diukur pada lingkungan nyata.
- Keunikan peserta/local device/cookie per sesi dilindungi oleh pemeriksaan aplikasi dan constraint/index database; audit menemukan nol duplikasi.
- Endpoint publik peserta/absensi sudah mencatat konteks dan kode error Supabase di log server serta mengirim kode/pesan aman ke UI; observability endpoint admin lainnya masih belum seragam.
- **Security:** mayoritas endpoint pengelolaan data tidak memverifikasi sesi/role admin di server. Proteksi halaman dilakukan di browser dan tidak melindungi API dari request langsung.
- Penghapusan admin sudah menggunakan client service-role yang benar, tetapi belum diuji terhadap Supabase non-produksi.
- **Security:** kode undangan registrasi berada di JavaScript browser sehingga tidak dapat dianggap rahasia.
- **Security/configuration:** URL dan anon key Supabase berada di `public/auth-config.js`. Anon key memang dipakai browser, tetapi keamanan tetap bergantung pada RLS yang belum dapat diverifikasi.
- Penghapusan sesi terbukti menghapus attendance melalui cascade, tetapi klaim bahwa QR token ikut terhapus belum terverifikasi.
- Penghapusan peserta menghapus attendance terkait melalui cascade; UI memperingatkan admin untuk memakai status Nonaktif bila riwayat harus dipertahankan.
- Tidak ada rate limiting atau CSRF protection eksplisit.
- Audit dependency runtime bersih, tetapi tool development Vercel lama masih memiliki advisory yang perbaikannya memerlukan upgrade mayor.

## Important Files

- `api/index.js`: aturan bisnis API, QR, PDF
- `api/supabase.js`: konstruksi client Supabase
- `public/admin-session.html`: dashboard sesi/lokasi
- `public/admin.html`: QR dan rekap per sesi
- `public/absen.html`: alur peserta
- `public/manual.html`: input status manual
- `public/peserta.html`: manajemen peserta
- `public/alfa-wa.html`: tindak lanjut WhatsApp
- `public/pengumuman-wa.html`: generator pengumuman dan daftar japri peserta
- `public/wa-contact-status.js`: status japri lokal dan sinkronisasi antar-tab
- `public/wa-message-template.js`: penyimpanan serta substitusi variabel template WhatsApp
- `public/database-peserta.html`: pengelolaan/arsip field, rekap hasil lintas kelompok, dan link kelompok oleh admin
- `public/isi-data-kelompok.html`: pengisian autosave tanpa login untuk ketua kelompok
- `public/admin-auth.js`: guard halaman dan timeout login
- `public/login.html`, `public/register.html`, `public/admin-approval.html`: alur admin
- `vercel.json`: routing deployment
- `note.sql`: query manual, bukan schema

## External Services

- Supabase Database: penyimpanan sesi, peserta, attendance, token, lokasi, admin.
- Supabase Auth: email/password dan OAuth Google.
- WhatsApp `wa.me`: membuka pesan terisi; tidak mengirim otomatis.
- jsDelivr: Supabase JS pada halaman admin.
- SweetAlert2 CDN: dialog UI halaman admin.
- Vercel: hosting/routing yang dikonfigurasi.

## Things We Must Not Break

- Validasi waktu, token QR, peserta aktif, peserta ganda, dan perangkat ganda.
- Kemampuan admin mengganti status manual dan finalisasi Alfa.
- Format status persis `Hadir`, `Izin`, `Alfa`.
- Query parameter `session` dan `token` pada URL absensi.
- Zona waktu laporan WIB.
- Pemisahan anon key browser dan service-role key backend.
- Pemisahan status japri pengumuman dan Alfa untuk setiap sesi.
- Filter dan penolakan server-side untuk peserta nonaktif tanpa menghapus riwayat attendance lama.
- Pembatasan token database kelompok agar tidak dapat membaca atau mengubah peserta kelompok lain.

## Hal yang Belum Diketahui / Perlu Dikonfirmasi

- Struktur SQL selain bagian attendance yang telah diaudit, termasuk constraint/index tabel lain, trigger, dan RLS policy.
- Apakah trigger membuat row `admin_users` sesudah `auth.signUp`.
- Node.js version produksi dan domain deployment aktif.
- Apakah semua fitur pernah diuji end-to-end atau digunakan nyata.
- Migration geolocation dikonfirmasi sudah dijalankan pengguna pada 2026-09-13, tetapi schema hasilnya belum diverifikasi langsung dari repository.
- Apakah `assets/backup-absen.html` dan `public/backup-admin.html` masih perlu disimpan.
- Apakah `server.js` masih digunakan untuk workflow tertentu.

## Session Handoff

Discovery dan dokumentasi awal selesai tanpa mengubah source code aplikasi. Task berikutnya harus memulai dari masalah yang diprioritaskan pengguna, lalu memverifikasi schema/RLS aktual bila menyentuh database atau authorization.
