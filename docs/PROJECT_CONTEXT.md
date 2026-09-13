# Project Context

Terakhir diperbarui: 2026-09-13

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
- Pembuatan, daftar/filter, dan penghapusan sesi.
- Pembuatan URL/QR per sesi dan unduhan lembar QR PDF.
- Absensi peserta dengan validasi sesi aktif, waktu, token, peserta aktif, peserta ganda, dan perangkat ganda tanpa geolocation.
- Input manual status `Hadir`, `Izin`, atau `Alfa`.
- Finalisasi sesi: peserta yang belum tercatat menjadi `Alfa`.
- Rekap kehadiran, ringkasan/filter pada dashboard, dan export PDF.
- Daftar peserta Alfa serta penyusunan tautan/pesan WhatsApp; pengiriman tetap dilakukan manual oleh pengguna.
- Pengumuman sesi melalui japri WhatsApp satu per satu untuk semua peserta yang terdaftar.
- Status “Sudah/Belum dijapri” untuk pengumuman dan Alfa, tersimpan serta sinkron antar-tab pada browser admin yang sama.

Status per fitur ada di `FEATURE_BASELINE.md`.

## Current Work

Belum ada task pengembangan aktif. Bootstrap dokumentasi dan perbaikan kerusakan terverifikasi selesai pada 2026-09-12.

## Pending Work

Belum diprioritaskan oleh pengguna:

- Menyediakan schema/migration database yang reproducible.
- Menambahkan test otomatis dan lingkungan pengujian non-produksi.
- Memindahkan authorization operasi admin ke server-side untuk seluruh endpoint sensitif.
- Memverifikasi endpoint penghapusan admin terhadap project Supabase non-produksi.

## Business Logic

- Sesi harus aktif dan berada di antara `start_time` dan `end_time` agar QR/absensi diterima.
- Token QR disimpan di `qr_tokens`. Implementasi mengambil token pertama milik sesi atau membuat satu token baru yang kedaluwarsa pada `end_time` (fallback 24 jam).
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

## Technical Facts

- Handler produksi: `api/index.js`.
- Handler yang sama membuka server lokal dan menyajikan `public/` ketika dijalankan langsung melalui `npm start`.
- `server.js` adalah prototipe lama dengan array in-memory, satu sesi contoh, dan token 20 detik.
- Frontend tidak memiliki proses build.
- CDN browser: Supabase JS dan SweetAlert2.
- Vercel me-rewrite `/api/(.*)` ke `api/index.js`.
- Git history yang tersedia hanya dua commit dan tidak cukup untuk membuktikan kestabilan fitur.

## Constraints

- Schema awal, seed, constraint, index, RLS policy, dan konfigurasi Supabase Auth tidak tersimpan lengkap di repository; baru ada migration tambahan status peserta.
- Banyak halaman dan handler berada dalam file besar, sehingga perubahan harus sangat terarah.
- Data nyata dan deployment tidak boleh digunakan untuk discovery tanpa izin.

## Known Issues and Risks

- **Security:** mayoritas endpoint pengelolaan data tidak memverifikasi sesi/role admin di server. Proteksi halaman dilakukan di browser dan tidak melindungi API dari request langsung.
- Penghapusan admin sudah menggunakan client service-role yang benar, tetapi belum diuji terhadap Supabase non-produksi.
- **Security:** kode undangan registrasi berada di JavaScript browser sehingga tidak dapat dianggap rahasia.
- **Security/configuration:** URL dan anon key Supabase berada di `public/auth-config.js`. Anon key memang dipakai browser, tetapi keamanan tetap bergantung pada RLS yang belum dapat diverifikasi.
- Pesan UI penghapusan sesi menyatakan attendance dan token ikut terhapus, tetapi handler hanya menghapus row `sessions`; perilaku cascade belum dapat dibuktikan karena schema tidak tersedia.
- Hapus peserta juga bergantung pada aturan foreign key yang belum diketahui bila peserta memiliki attendance.
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
- `public/admin-auth.js`: guard halaman dan timeout login
- `public/login.html`, `public/register.html`, `public/admin-approval.html`: alur admin
- `vercel.json`: routing deployment
- `note.sql`: query manual, bukan schema

## External Services

- Supabase Database: penyimpanan sesi, peserta, attendance, token, lokasi, admin.
- Supabase Auth: email/password dan OAuth Google.
- WhatsApp `wa.me`: membuka pesan terisi; tidak mengirim otomatis.
- jsDelivr: Supabase JS browser.
- SweetAlert2 CDN: dialog UI.
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

## Hal yang Belum Diketahui / Perlu Dikonfirmasi

- Struktur SQL aktual, tipe field, foreign key, cascade, unique constraint, index, trigger, dan RLS policy.
- Apakah trigger membuat row `admin_users` sesudah `auth.signUp`.
- Node.js version produksi dan domain deployment aktif.
- Apakah semua fitur pernah diuji end-to-end atau digunakan nyata.
- Apakah `assets/backup-absen.html` dan `public/backup-admin.html` masih perlu disimpan.
- Apakah `server.js` masih digunakan untuk workflow tertentu.

## Session Handoff

Discovery dan dokumentasi awal selesai tanpa mengubah source code aplikasi. Task berikutnya harus memulai dari masalah yang diprioritaskan pengguna, lalu memverifikasi schema/RLS aktual bila menyentuh database atau authorization.
