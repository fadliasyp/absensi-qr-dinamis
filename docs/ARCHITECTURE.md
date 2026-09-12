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
- `admin-session.html`: lokasi dan sesi.
- `admin.html`: QR, rekap, finalisasi, tautan export.
- `peserta.html`: CRUD peserta.
- `manual.html`: status manual.
- `alfa-wa.html`: tindak lanjut Alfa.
- `admin-approval.html`: status akun admin.
- `absen.html`: UI publik peserta.

Halaman admin memuat `auth-config.js` dan `admin-auth.js`. Guard memeriksa sesi Supabase serta row `admin_users`, lalu menerapkan timeout lokal.

## Backend and API

`api/index.js` mengekspor satu Express app untuk Vercel. Middleware global hanya JSON parser dan cookie parser; belum ada middleware authentication/authorization umum.

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/qr/:sessionId` | Validasi sesi dan buat QR/URL absensi. |
| GET | `/api/participants?session=...` | Daftar peserta beserta status hadir pada sesi. |
| POST | `/api/attendance` | Simpan kehadiran QR dengan validasi waktu/lokasi/device. |
| GET | `/api/attendance/:sessionId` | Rekap sesi. |
| POST | `/api/manual-attendance` | Insert/update status manual. |
| POST, GET | `/api/sessions` | Buat dan daftar sesi. |
| DELETE | `/api/sessions/:sessionId` | Hapus sesi. |
| POST | `/api/sessions/:sessionId/finalize` | Isi Alfa otomatis dan finalisasi. |
| GET | `/api/sessions/:sessionId/export-pdf` | Export rekap PDF. |
| GET | `/api/sessions/:sessionId/qr-pdf` | Export QR PDF. |
| GET | `/api/attendance/:sessionId/alfa` | Data Alfa dan nomor WA. Route terduplikasi. |
| POST | `/api/participants` | Tambah peserta tunggal/bulk. |
| GET | `/api/all-participants` | Daftar seluruh peserta. |
| PUT, DELETE | `/api/participants/:participantId` | Edit/hapus peserta. |
| GET, POST | `/api/locations` | Daftar/tambah lokasi. |
| DELETE | `/api/locations/:locationId` | Hapus lokasi. Route terduplikasi. |
| DELETE | `/api/admin-users/:adminId` | Hapus admin; saat ini broken karena client admin tidak tersedia. |

Format error/sukses umumnya JSON dengan `success` dan `message`.

## Database

Data diakses dengan `@supabase/supabase-js`; tidak ada ORM. Tabel yang terlihat: `sessions`, `qr_tokens`, `participants`, `attendance`, `locations`, dan `admin_users`. Detail berada di `DATABASE.md`.

## Authentication and Authorization

- Supabase Auth menyediakan email/password dan Google OAuth.
- Browser membaca `admin_users` untuk status `pending`, `approved`, atau `rejected`.
- Role `super_admin` diperlukan oleh UI approval.
- Browser logout setelah idle 30 menit atau maksimum sesi 8 jam.
- Authorization API belum diterapkan secara konsisten. Satu endpoint mencoba bearer-token authorization, tetapi implementasinya broken.

## Storage

Tidak ditemukan Supabase Storage atau filesystem persistence untuk data. `assets/header-qr.png` dibaca oleh generator PDF saat runtime, dengan fallback gambar berbasis shape/text.

## External Services

- Supabase Database/Auth
- Google OAuth melalui Supabase
- WhatsApp deep link (`wa.me`)
- jsDelivr dan SweetAlert2 CDN
- Vercel

## Background Jobs

Tidak ditemukan queue, cron, worker, atau background job. Finalisasi dilakukan saat admin menekan tombol.

## Deployment

`vercel.json` me-rewrite semua `/api/*` ke `api/index.js`. Static pages diharapkan dilayani dari `public/`. Tidak ditemukan CI/CD, Docker, atau workflow GitHub Actions.

## Data Flows

### Absensi QR

```text
Admin membuat sesi + lokasi
  -> API menyimpan sessions
  -> Admin membuka QR
  -> API mengambil/membuat qr_tokens
  -> Peserta membuka /absen.html?session=...&token=...
  -> Browser mengambil peserta + geolocation + device ID
  -> POST /api/attendance
  -> API validasi sesi/token/radius/duplikasi
  -> attendance disimpan
```

### Finalisasi

```text
Sesi berakhir -> admin menekan Finalisasi
  -> ambil semua participants
  -> ambil participant_id yang sudah tercatat
  -> insert Alfa untuk selisihnya
  -> tandai sessions.is_finalized
```

Operasi insert Alfa dan update sesi tidak berada dalam satu transaction; kegagalan langkah kedua dapat meninggalkan data Alfa dengan sesi belum ditandai final.

## Architectural Rules

- `api/index.js` adalah sumber kebenaran backend deployment; `server.js` bukan mirror aktif.
- Semua waktu yang ditampilkan kepada pengguna harus konsisten WIB.
- Validasi kritis absensi harus tetap server-side.
- Supabase service-role hanya boleh dipakai backend.
- Perubahan database harus disertai schema/migration yang dapat ditinjau.

## Risks

- API sensitif tanpa authorization server-side.
- Ketergantungan pada RLS/trigger/FK yang tidak terdokumentasi.
- Handler monolitik dan halaman inline besar meningkatkan risiko regression.
- Duplikasi route dan kode backup dapat membingungkan sumber kebenaran.
- Finalisasi multi-langkah tidak atomik.
- Proses development lokal tidak seragam.
- `npm start` tidak membuka listener karena entrypoint-nya adalah handler Vercel.
