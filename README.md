# Absensi QR Dinamis

Aplikasi web absensi berbasis QR untuk mengelola sesi, peserta, kehadiran, dan tindak lanjut peserta Alfa. Absensi peserta divalidasi terhadap waktu sesi, token QR, lokasi, dan identitas perangkat.

## Stack

- Node.js ES modules
- Express 5
- HTML, CSS, dan JavaScript tanpa framework frontend
- Supabase Database dan Supabase Auth
- QRCode dan PDFKit
- Vercel

## Persyaratan

- Node.js yang mendukung ES modules (Node.js 18+ disarankan)
- npm
- Project Supabase dengan tabel dan kebijakan akses yang sesuai
- Akun Vercel untuk pola deployment yang dikonfigurasi repository

## Instalasi

```bash
npm install
```

Konfigurasikan environment variable berikut pada lingkungan backend/deployment:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Jangan menyimpan nilainya dalam dokumentasi atau commit. Belum tersedia `.env.example` dan schema/migration yang dapat membangun database dari nol.

## Menjalankan

Lingkungan yang paling mendekati routing produksi adalah:

```bash
npx vercel dev
```

Script berikut tercantum di `package.json`, tetapi `api/index.js` tidak memanggil `listen()`. Proses akan selesai tanpa membuka server dan juga tidak menyajikan folder `public/`:

```bash
npm start
```

`server.js` adalah prototipe lokal lama berbasis data in-memory, bukan backend Supabase yang dipakai konfigurasi Vercel.

## Testing

Belum ada test otomatis. `npm test` masih merupakan placeholder dan sengaja keluar dengan status gagal. Pemeriksaan sintaks yang tersedia:

```bash
node --check api/index.js
node --check server.js
node --check public/admin-auth.js
```

## Build dan deployment

Tidak ada langkah build frontend. `vercel.json` meneruskan `/api/*` ke `api/index.js`; aset statis berada di `public/`. Environment variable Supabase harus diatur pada deployment.

## Dokumentasi

- [Konteks project](docs/PROJECT_CONTEXT.md)
- [Arsitektur](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Baseline fitur](docs/FEATURE_BASELINE.md)
- [Task aktif](docs/CURRENT_TASK.md)
- [Keputusan](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)
