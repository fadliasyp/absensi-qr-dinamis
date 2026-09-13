# Changelog

Perubahan dicatat sejak bootstrap dokumentasi; tidak ada sejarah fitur lama yang direkonstruksi tanpa bukti.

## 2026-09-13

### Fixed — Tata Letak Custom Picker Mobile

- Menghapus pencarian dari pemilih Kelompok dan Nama Peserta.
- Mengubah bottom sheet menjadi modal terpusat dengan jarak aman, empat sudut membulat, dan tinggi mengikuti dynamic viewport.
- Merapikan kartu peserta, scrolling internal, dan reset posisi daftar ke paling atas setiap dibuka.
- Memperbarui regression test tampilan; seluruh 18 test lokal lulus.

### Changed — Peserta Hadir Hilang dari Pilihan

- Menyegarkan daftar/status attendance dari server setiap kali pemilih Nama Peserta dibuka.
- Hanya menampilkan peserta aktif yang belum hadir dan memperbarui jumlah peserta tersedia.
- Menandai serta mengeluarkan nama secara lokal setelah submit sukses atau respons bahwa peserta sudah tercatat.
- Menambahkan regression test perilaku refresh/filter; seluruh 18 test lokal lulus.

### Changed — Custom Picker Absensi

- Mengganti pilihan native Kelompok dan Nama Peserta dengan modal pilihan lokal bergaya biru Absenku.
- Menambahkan pencarian, metadata ketersediaan peserta, indikator terpilih, scrolling mobile, dan kontrol tutup yang aksesibel.
- Mempertahankan halaman publik tanpa CDN serta seluruh validasi/filter absensi yang sudah ada.
- Memperbarui regression test custom picker; seluruh 17 test lokal lulus.

### Verified — Constraint Attendance

- Memverifikasi unique constraint peserta per sesi serta partial unique index local/cookie device per sesi pada Supabase aktual.
- Memverifikasi tidak ada duplikasi pada ketiga aturan tersebut; migration baru tidak diperlukan.
- Memverifikasi foreign key sesi dan peserta memakai `ON DELETE CASCADE` terhadap attendance.
- Memperjelas peringatan UI bahwa menghapus peserta akan menghapus riwayat attendance dan bahwa Nonaktifkan harus dipakai untuk mempertahankannya.

### Added — Preflight Unique Constraint Attendance

- Menambahkan query audit Supabase baca-saja untuk tipe kolom, constraint, index, dan duplikasi peserta/perangkat per sesi.
- Menunda pembuatan unique index sampai schema aktual diketahui dan data lama dipastikan tidak memiliki duplikasi.
- Menambahkan regression test yang memastikan query audit tidak memutasi data/schema dan mencakup tiga aturan duplikasi; seluruh 17 test lokal lulus.

### Changed — Pesan Absensi Mobile Tahap 4

- Menambahkan batas tunggu 20 detik pada pemuatan peserta dan submit absensi.
- Menambahkan tombol `Coba Lagi` untuk timeout, gangguan koneksi, dan error server yang dapat dicoba ulang.
- Menyesuaikan pesan peserta untuk QR tidak valid/kedaluwarsa, status sesi, peserta nonaktif, absensi duplikat, dan kegagalan penyimpanan.
- Menambahkan kode error API publik yang stabil, log error server-side, serta menghapus detail database dari respons peserta.
- Menambahkan regression test timeout/pesan; seluruh 16 test lokal lulus.

### Changed — Performa Absensi Mobile Tahap 3

- Menjalankan query independen secara paralel pada endpoint daftar peserta dan submit QR.
- Mengganti `select("*")` dengan kolom minimum pada dua endpoint publik tersebut.
- Mengurangi submit dari tujuh round-trip Supabase berurutan menjadi tiga fase tanpa menghapus validasi.
- Menangani kegagalan query pemeriksaan duplikasi sebelum insert dan menambahkan regression test kontrak performa.

### Fixed — Ketergantungan CDN Absensi Mobile Tahap 2

- Menghapus SweetAlert2 CDN dan Google Fonts dari halaman absensi publik.
- Mengganti popup pemilih kelompok/nama dengan select native browser.
- Menampilkan status loading, sukses, dan gagal langsung di halaman dengan `aria-live`.
- Menghapus pengambilan ulang seluruh daftar peserta setelah absensi berhasil.
- Menambahkan regression test yang memastikan halaman publik tidak memiliki dependency UI pihak ketiga.

### Fixed — Kompatibilitas Absensi Mobile Tahap 1

- Mengganti `crypto.randomUUID()` dengan generator device ID yang memakai Web Crypto lebih luas dan fallback sederhana.
- Menangani localStorage yang ditolak browser tanpa menggagalkan request absensi; cookie backend tetap menjadi pemeriksaan perangkat kedua bila tersedia.
- Mengganti `String.replaceAll()` pada halaman absensi agar pemilih kelompok lebih kompatibel dengan browser lama.
- Menambahkan test untuk kondisi penyimpanan dan Web Crypto yang tidak tersedia.
- Mencatat konfirmasi pengguna bahwa migration geolocation sudah dijalankan.

### Added — Edit Masa Aktif Sesi

- Menambahkan tombol edit waktu mulai dan selesai pada daftar sesi, termasuk untuk sesi yang sudah mulai atau sedang berjalan.
- Menambahkan validasi waktu di endpoint dan mengunci perubahan pada sesi yang sudah difinalisasi.
- Menyesuaikan kedaluwarsa token QR ketika waktu selesai berubah tanpa membuat token baru.
- Menambahkan regression test untuk kontrak edit masa aktif sesi.

### Removed — Geolocation Absensi

- Menghapus permintaan GPS pada halaman peserta dan dashboard sesi admin.
- Menghapus validasi koordinat/radius serta penyimpanan jarak dari endpoint attendance.
- Menghapus pengelolaan lokasi tersimpan dan endpoint API lokasi tanpa menghapus data tabel lama.
- Menghapus informasi radius dari PDF QR; nama tempat tetap menjadi informasi opsional.
- Menambahkan migration non-destruktif untuk melepas constraint `NOT NULL` dari kolom geolocation lama.
- Mempertahankan pembatasan satu perangkat per sesi melalui local device ID dan cookie serta menambahkan regression test khusus.

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
