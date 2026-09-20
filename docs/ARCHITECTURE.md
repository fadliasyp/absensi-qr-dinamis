# Architecture

## High-Level Architecture

```text
Browser peserta                         Browser admin
public/absen.html                       public/*.html + admin-auth.js
        |                                        |
        | fetch /api/*                           | fetch /api/* / Supabase Auth
        +------------------+---------------------+
                           v
                  Vercel rewrite /api/*
                           v
                Express app (api/index.js)
                    |                 |
                    v                 v
             Supabase Database    QRCode / PDFKit

Browser admin -------- Supabase JS --------> Supabase Auth + admin_users
WhatsApp page -------- wa.me link ----------> WhatsApp (manual send)
```

## Frontend

Frontend adalah kumpulan halaman statis, masing-masing berisi HTML, CSS, dan JavaScript inline:

- `login.html`, `register.html`: authentication admin.
- `admin-session.html`: pembuatan dan daftar sesi; nama tempat bersifat informasi opsional.
- `admin.html`: QR, rekap, finalisasi, tautan export.
- `peserta.html`: CRUD serta aktivasi/nonaktivasi peserta.
- `manual.html`: status manual dengan custom picker lokal untuk kelompok dan peserta.
- `alfa-wa.html`: tindak lanjut Alfa.
- `pengumuman-wa.html`: generator pengumuman sesi dan japri seluruh peserta.
- `wa-contact-status.js`: penyimpanan status japri lokal per sesi/jenis dan event sinkronisasi antar-tab.
- `wa-message-template.js`: penyimpanan dan substitusi variabel template WhatsApp lokal per sesi/jenis.
- `database-peserta.html`: definisi/arsip field dinamis, rekap hasil lintas kelompok, dan pengelolaan link kelompok oleh admin.
- `isi-data-kelompok.html`: pengisian field peserta per kelompok tanpa login dengan autosave.
- `admin-approval.html`: status akun admin.
- `absen.html`: UI publik peserta dengan custom picker serta popup pemberitahuan lokal tanpa dependency CDN.

Halaman admin memuat `auth-config.js` dan `admin-auth.js`. Guard memeriksa sesi Supabase serta row `admin_users`, lalu menerapkan timeout lokal.

## Backend and API

`api/index.js` mengekspor satu Express app untuk Vercel. Middleware global hanya JSON parser dan cookie parser; belum ada middleware authentication/authorization umum.

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/qr/:sessionId` | Validasi sesi dan buat QR/URL absensi. |
| GET | `/api/participants?session=...` | Daftar peserta beserta status hadir pada sesi. |
| POST | `/api/attendance` | Simpan kehadiran QR dengan validasi waktu/token/peserta/device tanpa geolocation. |
| GET | `/api/attendance/:sessionId` | Rekap sesi. |
| POST | `/api/manual-attendance` | Insert/update status manual. |
| POST, GET | `/api/sessions` | Buat dan daftar sesi. |
| PUT | `/api/sessions/:sessionId` | Ubah waktu mulai/selesai sesi belum final dan sesuaikan kedaluwarsa token QR. |
| DELETE | `/api/sessions/:sessionId` | Hapus sesi. |
| POST | `/api/sessions/:sessionId/finalize` | Isi Alfa otomatis dan finalisasi. |
| GET | `/api/sessions/:sessionId/export-pdf` | Export rekap PDF. |
| GET | `/api/sessions/:sessionId/qr-pdf` | Export QR PDF. |
| GET | `/api/attendance/:sessionId/alfa` | Data Alfa dan nomor WA. |
| POST | `/api/participants` | Tambah peserta tunggal/bulk. |
| GET | `/api/all-participants` | Daftar seluruh peserta. |
| PUT, DELETE | `/api/participants/:participantId` | Edit/hapus peserta. |
| DELETE | `/api/admin-users/:adminId` | Hapus admin dengan verifikasi bearer token dan role super admin. |
| GET | `/api/participant-database/groups` | Sinkronkan/daftar kelompok dan link untuk admin terautentikasi. |
| POST, DELETE | `/api/participant-database/groups/:groupId/link` | Buat ulang atau cabut link kelompok. |
| GET, POST, PUT | `/api/participant-database/fields` | Kelola definisi field pilihan dinamis. |
| GET | `/api/participant-database/results` | Peserta dan nilai field seluruh kelompok untuk rekap admin. |
| GET | `/api/group-participant-database` | Data peserta aktif satu kelompok berdasarkan token link. |
| PUT | `/api/group-participant-database/value` | Autosave nilai peserta dengan validasi token, kelompok, field, dan opsi. |

Format error/sukses umumnya JSON dengan `success` dan `message`.

## Database

Data diakses dengan `@supabase/supabase-js`; tidak ada ORM. Tabel yang terlihat: `sessions`, `qr_tokens`, `participants`, `attendance`, `locations`, dan `admin_users`. Detail berada di `DATABASE.md`.

## Authentication and Authorization

- Supabase Auth menyediakan email/password dan Google OAuth.
- Browser membaca `admin_users` untuk status `pending`, `approved`, atau `rejected`.
- Role `super_admin` diperlukan oleh UI approval.
- Browser logout setelah idle 30 menit atau maksimum sesi 8 jam.
- Authorization API belum diterapkan secara konsisten. Endpoint hapus admin sudah memverifikasi bearer token dan role super admin.
- Endpoint pengelolaan database peserta baru memverifikasi bearer token serta status admin. Endpoint ketua menggunakan token kelompok tanpa Supabase Auth.

## Storage

Tidak ditemukan Supabase Storage atau filesystem persistence untuk data. `assets/header-qr.png` dibaca oleh generator PDF saat runtime, dengan fallback gambar berbasis shape/text.

Status japri WhatsApp disimpan dalam `localStorage` browser admin dengan key terpisah untuk jenis `announcement` dan `alfa` serta session ID. Custom event memperbarui tab aktif dan browser `storage` event menyinkronkan tab lain pada origin yang sama. Status ini tidak tersedia lintas HP/browser.

Template pesan WhatsApp juga disimpan dalam `localStorage` dengan key yang memuat jenis pesan dan session ID. Template Alfa dan Pengumuman tidak saling menimpa, tetapi template ini tidak disimpan ke database dan tidak tersedia lintas HP/browser.

Token link kelompok diletakkan pada URL fragment agar tidak ikut terkirim sebagai URL/referrer. Browser meneruskannya lewat header `X-Group-Access-Token`; database hanya menyimpan hash dan nonce token. Backend membentuk ulang link untuk admin menggunakan `GROUP_LINK_SECRET`, dengan fallback `SUPABASE_SERVICE_ROLE_KEY`.

## External Services

- Supabase Database/Auth
- Google OAuth melalui Supabase
- WhatsApp deep link (`wa.me`)
- jsDelivr dan SweetAlert2 CDN untuk halaman admin; halaman absensi publik tidak memerlukannya
- Vercel

## Background Jobs

Tidak ditemukan queue, cron, worker, atau background job. Finalisasi dilakukan saat admin menekan tombol.

## Deployment

`vercel.json` me-rewrite semua `/api/*` ke `api/index.js`. Static pages diharapkan dilayani dari `public/`. Tidak ditemukan CI/CD, Docker, atau workflow GitHub Actions.

Saat `api/index.js` dijalankan langsung melalui `npm start`, handler yang sama menyajikan `public/` dan membuka listener lokal. Ketika diimpor oleh Vercel, listener lokal tidak dibuat.

## Data Flows

### Absensi QR

```text
Admin membuat sesi
  -> API menyimpan sessions
  -> Admin membuka QR
  -> API mengambil/membuat qr_tokens
  -> Peserta membuka /absen.html?session=...&token=...
  -> Browser mengambil peserta + device ID
  -> Saat pemilih nama dibuka, browser menyegarkan status dan menyisakan peserta belum hadir
  -> POST /api/attendance
  -> API paralel validasi sesi/token/peserta
  -> API paralel memeriksa duplikasi peserta/perangkat
  -> attendance disimpan
```

### Finalisasi

```text
Sesi berakhir -> admin menekan Finalisasi
  -> ambil participants aktif
  -> ambil participant_id yang sudah tercatat
  -> insert Alfa untuk selisihnya
  -> tandai sessions.is_finalized
```

Operasi insert Alfa dan update sesi tidak berada dalam satu transaction; kegagalan langkah kedua dapat meninggalkan data Alfa dengan sesi belum ditandai final.

### Status Peserta

`participants.is_active` menjadi filter backend untuk pilihan absensi QR/manual, pengumuman WhatsApp, finalisasi, dan daftar WhatsApp Alfa. Endpoint absensi juga menolak ID peserta nonaktif agar status tidak dapat dilewati lewat request langsung. Menonaktifkan peserta tidak menghapus row peserta maupun riwayat `attendance` yang sudah tercatat.

### Database Peserta per Kelompok

```text
Admin membuat field + link kelompok
  -> backend menyimpan definisi field dan hash token
  -> ketua membuka URL #token=...
  -> browser mengirim token melalui header
  -> backend membatasi peserta aktif berdasarkan kelompok token
  -> ketua memilih opsi
  -> backend memvalidasi peserta, kelompok, field, dan opsi
  -> upsert participant_custom_values
```

## Architectural Rules

- `api/index.js` adalah sumber kebenaran backend deployment; `server.js` bukan mirror aktif.
- Semua waktu yang ditampilkan kepada pengguna harus konsisten WIB.
- Validasi kritis absensi harus tetap server-side.
- Absensi QR tidak menggunakan geolocation; nama tempat tidak boleh dijadikan syarat kehadiran.
- Supabase service-role hanya boleh dipakai backend.
- Perubahan database harus disertai schema/migration yang dapat ditinjau.

## Risks

- API sensitif tanpa authorization server-side.
- Ketergantungan pada RLS/trigger/FK yang tidak terdokumentasi.
- Handler monolitik dan halaman inline besar meningkatkan risiko regression.
- Kode backup dapat membingungkan sumber kebenaran.
- Finalisasi multi-langkah tidak atomik.
- Tanpa geolocation, tautan QR dapat dipakai dari lokasi mana pun; pembatasan yang tersisa adalah waktu, token, peserta, dan perangkat per sesi.
- Dependency development Vercel memerlukan upgrade mayor untuk menutup seluruh advisory audit; dependency runtime sudah bersih.
