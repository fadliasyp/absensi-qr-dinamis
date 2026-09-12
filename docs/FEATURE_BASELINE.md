# Feature Baseline

Terakhir diperbarui: 2026-09-12

## Ringkasan Status

Belum ada fitur bisnis berstatus `STABLE`. Repository kini memiliki smoke test server lokal, tetapi belum ada bukti penggunaan nyata atau hasil verifikasi Supabase end-to-end. Status `WORKING` berarti implementasinya lengkap secara statis dan pemeriksaan yang relevan lulus; status tersebut belum menjamin integrasi produksi.

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Login email/password dan Google | WORKING | Diimplementasikan di `login.html` dengan Supabase Auth dan pengecekan `admin_users`. |
| Registrasi admin | PARTIAL | `signUp` tersedia, tetapi pembuatan row `admin_users` bergantung pada konfigurasi/trigger Supabase yang tidak ada di repo; invite code terlihat di browser. |
| Guard halaman dan timeout admin | WORKING | `admin-auth.js`: status approved, idle 30 menit, maksimum 8 jam. Hanya melindungi UI. |
| Approval status admin | PARTIAL | UI super admin membaca/mengubah `admin_users` langsung; efektivitas bergantung pada RLS yang belum diketahui. |
| Hapus admin | WORKING | Client service-role sudah diimpor dan authorization super admin tetap dipertahankan; belum diuji terhadap Supabase. |
| CRUD peserta | WORKING | Tambah tunggal/bulk, baca, edit, hapus, filter, nomor WA, serta status aktif/nonaktif tersedia. Integritas delete bergantung FK aktual. |
| Peserta nonaktif | PARTIAL | Filter dan penolakan backend serta kontrol UI diimplementasikan dan diuji statis; migration kolom belum dijalankan atau diuji end-to-end pada Supabase. |
| CRUD lokasi tersimpan | WORKING | Daftar, tambah, pakai ulang, hapus, dan ambil geolocation admin tersedia. |
| Pengelolaan sesi | WORKING | Buat, daftar/filter status, dan hapus tersedia. Klaim cascade saat delete belum terverifikasi. |
| QR per sesi | WORKING | URL absensi dan QR dibuat untuk sesi aktif dalam rentang waktu. Token tidak berotasi selama record masih ada. |
| PDF QR | WORKING | PDFKit menghasilkan lembar QR dan memakai header asset bila tersedia. |
| Absensi peserta | WORKING | Validasi token, waktu, geolocation/radius, identitas peserta, dan duplikasi tersedia. |
| Absensi manual | WORKING | Insert/update status `Hadir`, `Izin`, `Alfa`. |
| Rekap dashboard | WORKING | Daftar attendance, ringkasan, filter, dan refresh tersedia. |
| Finalisasi sesi | WORKING | Setelah sesi berakhir, peserta tanpa record menjadi Alfa dan sesi ditandai final. Tidak transaksional. |
| Export rekap PDF | WORKING | PDF landscape dengan ringkasan dan tabel tersedia. |
| Tindak lanjut WhatsApp Alfa | WORKING | Daftar/filter, preview/salin pesan, dan tautan `wa.me`; pengguna tetap menekan Kirim. |
| Status japri WhatsApp Alfa | WORKING | Warna/statistik/filter berubah saat tautan dibuka, persisten dan realtime pada browser admin yang sama. |
| Pengumuman WhatsApp sesi | WORKING | Pesan sesi dapat diedit dan dijapri satu per satu ke seluruh peserta dengan nomor WA. |
| Status japri pengumuman | WORKING | Dipisahkan per session ID dan dari status Alfa; dapat dikembalikan menjadi belum dijapri. |
| Authorization API admin | BROKEN | Mayoritas endpoint sensitif tidak memeriksa bearer token/role server-side. |
| Server development lokal | WORKING | `npm start` menyajikan `public/`; diverifikasi oleh smoke test Node. |
| Prototipe `server.js` | DEPRECATED | Backend in-memory terpisah dari implementasi Supabase/Vercel dan tidak menyajikan fitur terbaru. |
| File backup HTML | DEPRECATED | Tidak dirujuk oleh navigasi aktif; disimpan sebagai backup. |

## Candidate Regression Baseline

Bagian berikut harus dilindungi saat diperbaiki, walaupun statusnya belum `STABLE`.

### Validasi Absensi QR

Status: `WORKING` / kandidat baseline

Perilaku yang harus dipertahankan:

- Menolak sesi yang tidak ditemukan/tidak aktif/belum mulai/sudah selesai.
- Menolak token yang tidak cocok atau kedaluwarsa.
- Mewajibkan geolocation dan menolak peserta di luar radius.
- Menolak peserta yang sudah tercatat serta perangkat yang sudah dipakai pada sesi sama.
- Menyimpan snapshot nama, gender, kelompok, waktu, koordinat, jarak, device, user agent, dan IP sesuai implementasi.

File penting: `api/index.js`, `public/absen.html`.

Cara verifikasi:

1. Buat sesi aktif dengan lokasi dan radius uji.
2. Scan QR dan hadir di dalam radius; pastikan satu record `Hadir` dibuat.
3. Ulangi peserta/perangkat yang sama; pastikan ditolak.
4. Uji di luar radius, sebelum mulai, sesudah selesai, dan token salah.

### Manual dan Finalisasi

Status: `WORKING` / kandidat baseline

Perilaku yang harus dipertahankan:

- Admin dapat insert atau update satu status ke `Hadir`, `Izin`, atau `Alfa`.
- Finalisasi ditolak sebelum sesi berakhir atau bila sudah difinalisasi.
- Peserta tanpa record menjadi Alfa; record yang sudah ada tidak digandakan.

File penting: `api/index.js`, `public/manual.html`, `public/admin.html`.

Cara verifikasi: siapkan peserta dengan campuran Hadir/Izin/tanpa record, akhiri sesi, finalisasi, lalu bandingkan hasil dan flag sesi.

### Pelaporan

Status: `WORKING` / kandidat baseline

Perilaku yang harus dipertahankan:

- Rekap tetap terkait ke session ID.
- Status dan waktu tampil dalam format Indonesia/WIB.
- Export rekap dan QR menghasilkan response PDF.

File penting: `api/index.js`, `public/admin.html`, `public/admin-session.html`, `assets/header-qr.png`.

Cara verifikasi: buka dashboard sesi dengan data campuran, periksa ringkasan/filter, unduh kedua PDF, dan buka hasilnya.

### Japri WhatsApp

Status: `WORKING` / kandidat baseline

Perilaku yang harus dipertahankan:

- Pengumuman dan Alfa mempunyai status japri yang terpisah per sesi.
- Membuka tombol `Kirim WA` langsung mengubah kartu menjadi hijau dan memperbarui statistik/filter.
- Refresh halaman mempertahankan status pada browser yang sama; perubahan antar-tab tersinkron.
- Admin dapat mengembalikan status menjadi belum dijapri.
- Label UI menjelaskan bahwa status berarti tautan WhatsApp dibuka, bukan konfirmasi delivery.

File penting: `public/pengumuman-wa.html`, `public/alfa-wa.html`, `public/wa-contact-status.js`.

Cara verifikasi: buka dua tab untuk sesi yang sama, klik `Kirim WA` pada satu tab, pastikan kedua tab berubah, refresh, lalu uji `Tandai Belum` dan pastikan status pengumuman tidak mengubah status Alfa.

### Peserta Aktif/Nonaktif

Status: `PARTIAL` / kandidat baseline setelah migration

Perilaku yang harus dipertahankan:

- Peserta baru dan peserta lama bernilai aktif secara default.
- Peserta nonaktif tetap terlihat pada Kelola Peserta dan dapat diaktifkan kembali.
- Peserta nonaktif tidak muncul pada pilihan absensi QR/manual atau Pengumuman WA.
- Endpoint absensi QR/manual menolak peserta nonaktif meskipun ID dikirim langsung.
- Peserta nonaktif tidak ikut finalisasi Alfa dan Alfa lamanya tidak muncul pada daftar WhatsApp Alfa.
- Riwayat attendance lama tidak dihapus saat peserta dinonaktifkan.

File penting: `api/index.js`, `public/peserta.html`, dan migration `supabase/migrations/20260912000000_add_participant_is_active.sql`.

## Promosi Menjadi STABLE

Ubah status hanya setelah ada hasil pengujian yang dicatat (atau konfirmasi penggunaan produksi dari pengguna), dependency/database telah diverifikasi, dan tidak ada regression yang diketahui.
