# Aturan Kerja Codex — Absensi QR Dinamis

## Project Identity

Project ini adalah aplikasi web absensi QR dinamis untuk admin dan peserta. Backend produksi yang terdokumentasi adalah handler Express pada `api/index.js`, dengan Supabase sebagai database dan authentication serta Vercel sebagai target deployment.

## Wajib Dibaca

Sebelum perubahan besar, baca:

1. `docs/PROJECT_CONTEXT.md`
2. `docs/CURRENT_TASK.md`
3. `docs/FEATURE_BASELINE.md`
4. Dokumentasi domain terkait (`ARCHITECTURE.md` atau `DATABASE.md`)

Validasi dokumentasi terhadap source code aktual. Source code dan konfigurasi yang dapat diverifikasi lebih kuat daripada catatan lama.

## Technology Stack

- Node.js, npm, ES modules
- Express 5
- Frontend HTML/CSS/JavaScript statis
- Supabase Database dan Auth
- QRCode, PDFKit, cookie-parser
- Vercel

Jangan menambah framework, dependency, atau abstraction tanpa kebutuhan nyata.

## Project Structure

- `api/index.js`: API Express/Supabase dan generator PDF/QR
- `api/supabase.js`: client Supabase anon dan service-role
- `public/`: halaman browser dan auth guard admin
- `public/wa-contact-status.js`: status japri WhatsApp lokal per sesi/jenis pesan
- `assets/`: gambar/header dan file backup
- `server.js`: prototipe lokal in-memory; bukan implementasi produksi
- `note.sql`: query operasional manual, bukan migration lengkap
- `docs/`: memory permanen project

## Coding Rules

- Pertahankan gaya vanilla JavaScript dan struktur yang sudah ada kecuali task meminta perubahan arsitektur.
- Lakukan perubahan sekecil mungkin pada akar masalah.
- Jangan refactor file besar hanya karena gaya lain terlihat lebih modern.
- Jangan memperlakukan `server.js` sebagai sumber kebenaran fitur produksi.
- Jangan mengaktifkan atau menghapus kode backup tanpa permintaan eksplisit.

## Database Rules

- Jangan menjalankan SQL destruktif atau migration tanpa persetujuan eksplisit.
- Repository belum memiliki schema/migration lengkap; konfirmasi struktur aktual di Supabase sebelum perubahan schema.
- Pertahankan relasi logis sesi, token QR, peserta, dan attendance.
- Perubahan yang menyentuh delete sesi/peserta harus memeriksa foreign key/cascade aktual terlebih dahulu.

## API Rules

- Validasi input pada boundary API.
- Gunakan format respons JSON yang sudah dipakai: `success`, `message`, dan data domain.
- Jangan membocorkan error sensitif, credential, atau token dalam log/respons.
- Endpoint mutasi admin harus diverifikasi server-side; guard halaman browser bukan authorization API.

## Security Rules

- Jangan menulis nilai credential ke dokumentasi, commit, log, atau contoh.
- Jangan menggunakan service-role key di browser.
- Perlakukan invite code yang berada di frontend sebagai informasi publik, bukan secret.
- Audit Supabase Row Level Security sebelum mengandalkan akses langsung dari browser.
- Pertahankan validasi token QR, waktu, peserta aktif, peserta ganda, dan perangkat ganda.

## Testing Rules

- Jangan menyatakan fitur `STABLE` tanpa bukti runtime/test/penggunaan yang dapat diverifikasi.
- Jalankan minimal `node --check` pada JavaScript yang diubah.
- Untuk perubahan alur utama, uji manual dengan Supabase non-produksi: login, sesi, QR, absensi, finalisasi, dan export yang relevan.
- Jalankan `npm test`; smoke test memastikan entrypoint lokal menyajikan halaman login.

## Documentation Rules

Setelah pekerjaan signifikan, perbarui file memory yang relevan:

- `docs/PROJECT_CONTEXT.md`
- `docs/CURRENT_TASK.md`
- `docs/FEATURE_BASELINE.md`
- `docs/CHANGELOG.md`
- `docs/DECISIONS.md` bila ada keputusan baru
- `docs/ARCHITECTURE.md` atau `docs/DATABASE.md` bila perilakunya berubah

Gunakan `Belum diketahui / perlu dikonfirmasi` ketika fakta tidak dapat dibuktikan.

## Feature Regression Protection

Sebelum mengubah QR, absensi, finalisasi, authentication, atau PDF:

1. Baca baseline dan telusuri semua consumer.
2. Catat dampak terhadap UI, API, database, dan deployment.
3. Pertahankan perilaku benar yang relevan.
4. Jalankan regression check proporsional.
5. Update baseline hanya setelah statusnya benar-benar terverifikasi.

## Git Safety

- Jangan reset, checkout branch lain, rewrite history, commit, push, atau deploy tanpa instruksi pengguna.
- Pertahankan perubahan pengguna yang tidak terkait.
- Periksa `git diff` sebelum handoff.

## Session Handoff

Saat task selesai, kosongkan task aktif menjadi `Belum ada task aktif`, simpan temuan penting di project context, dan catat perubahan signifikan di changelog. Jangan meninggalkan fakta penting hanya di chat.

## Project-Specific Rules

- Zona waktu tampilan bisnis adalah `Asia/Jakarta`/WIB.
- Status kehadiran yang didukung adalah `Hadir`, `Izin`, dan `Alfa`.
- Sesi baru saat ini berlaku untuk semua kelompok (`kelompok: "Semua"`).
- Token QR dibuat satu kali per sesi dan mengikuti `end_time` sesi; jangan menyebutnya QR berotasi tanpa mengubah implementasi.
- Jangan mendokumentasikan file backup sebagai fitur aktif.
- Status japri gratis berarti tautan WhatsApp telah dibuka, bukan konfirmasi pesan terkirim; jangan mengubah label menjadi klaim delivery tanpa API resmi.
- Status japri `announcement` dan `alfa` harus tetap terpisah dan saat ini hanya persisten pada browser admin yang sama.
- Hanya peserta dengan `participants.is_active = true` yang boleh muncul pada pilihan absensi/manual/pengumuman, diterima endpoint absensi, atau ikut finalisasi dan daftar WhatsApp Alfa. Nonaktif tidak menghapus riwayat attendance lama.
- Absensi QR tidak memakai geolocation atau pembatasan radius. Nama tempat sesi hanya informasi opsional; validasi satu perangkat per sesi melalui local device ID dan cookie harus tetap dipertahankan.
