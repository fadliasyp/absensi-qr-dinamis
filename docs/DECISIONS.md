# Decision Log

## 2026-09-12 — Repository Menjadi Sumber Memory Project

### Status

ACCEPTED

### Decision

Konteks, arsitektur, database, baseline fitur, task aktif, keputusan, dan changelog disimpan di `AGENTS.md` dan `docs/`.

### Context

Pengguna meminta bootstrap dokumentasi berdasarkan `CODEX_PROJECT_SETUP.md` agar project dapat dilanjutkan lintas sesi.

### Reason

Fakta project perlu dapat ditemukan dari repository tanpa bergantung pada percakapan sebelumnya.

### Alternatives

Menyimpan pengetahuan hanya di chat. Ditolak karena tidak persisten dan tidak independen dari sesi.

### Consequences

Pekerjaan signifikan berikutnya harus memperbarui memory terkait dan memvalidasi isinya terhadap source code.

## 2026-09-12 — Implementasi Supabase/Vercel Menjadi Sumber Kebenaran

### Status

ACCEPTED

### Decision

Dokumentasi fitur aktif mengacu pada `api/index.js`, `api/supabase.js`, `public/`, dan `vercel.json`. `server.js` dicatat sebagai prototipe/deprecated sampai pengguna menyatakan sebaliknya.

### Context

Repository memiliki dua implementasi backend. `api/index.js` mencakup fitur terbaru dan menjadi destination rewrite Vercel; `server.js` hanya menyimpan contoh data in-memory dan subset endpoint.

### Reason

Konfigurasi deployment memberikan bukti paling kuat mengenai jalur yang dimaksudkan untuk digunakan.

### Alternatives

Mendokumentasikan keduanya sebagai backend setara. Ditolak karena akan menyesatkan alur operasi dan status fitur.

### Consequences

Perubahan fitur produksi harus dimulai dari `api/index.js`; sinkronisasi atau penghapusan `server.js` memerlukan keputusan terpisah.

## 2026-09-12 — Tidak Ada Fitur Diklaim Stable Saat Discovery

### Status

ACCEPTED

### Decision

Fitur yang terlihat lengkap diberi status `WORKING`, bukan `STABLE`.

### Context

Tidak ada test otomatis, hasil runtime end-to-end, atau bukti penggunaan produksi di repository. `npm test` adalah placeholder gagal.

### Reason

Status stabil harus didukung bukti, sesuai pedoman project dan prinsip tidak mengarang.

### Alternatives

Menganggap source yang tampak lengkap sebagai stable. Ditolak karena tidak membuktikan integrasi Supabase, RLS, schema, browser, atau deployment.

### Consequences

Baseline mencatat kandidat perilaku yang harus dijaga, dan promosi ke `STABLE` menunggu verifikasi.

