# Decision Log

## 2026-09-20 — Field Dinamis Diarsipkan, Bukan Dihapus

### Status

ACCEPTED

### Decision

Menonaktifkan field diperlakukan sebagai arsip. Field tersebut disembunyikan dari link pengisian dan rekap hasil admin, tetapi definisi serta semua nilai peserta tetap berada di database.

### Context

Data seperti Status Kesibukan masih dibutuhkan sebagai riwayat ketika admin menambahkan field baru seperti Hobi pada waktu berikutnya.

### Consequences

Admin dapat mengaktifkan kembali field untuk menampilkan hasil lamanya dan mengenali nilai lama setelah opsi diedit. Penghapusan permanen field tidak disediakan pada UI.

## 2026-09-20 — Link Rahasia Menggantikan Login Ketua Kelompok

### Status

ACCEPTED

### Decision

Ketua kelompok mengakses halaman pengisian melalui link rahasia per kelompok tanpa akun login. Token ditempatkan pada URL fragment, dikirim ke API lewat header khusus, dan dibatasi server-side pada satu kelompok.

### Context

Pengguna menginginkan alur yang ramah bagi ketua kelompok: buka link, pilih nilai, dan tersimpan otomatis.

### Consequences

Admin dapat mencabut atau membuat ulang link. Siapa pun yang memperoleh link dapat mengubah isian kelompok tersebut, dan identitas individu yang melakukan perubahan tidak dapat dibuktikan tanpa login.

## 2026-09-20 — Field Inti Tetap, Field Tambahan Bersifat Dinamis

### Status

ACCEPTED

### Decision

Pertahankan `nama`, `gender`, `kelompok`, nomor WhatsApp, dan status aktif sebagai field inti. Field tambahan didefinisikan pada tabel tersendiri dan nilainya disimpan per peserta/field.

### Context

Field inti dipakai oleh absensi, sapaan WhatsApp, finalisasi, dan laporan. Membuatnya sepenuhnya dinamis akan merusak kontrak fitur lama.

### Consequences

Admin dapat menambah banyak field pilihan tanpa migration baru. Tahap awal hanya mendukung field bertipe pilihan; tipe teks/tanggal ditambahkan bila ada kebutuhan nyata.

## 2026-09-15 — Template WhatsApp Disimpan Lokal per Sesi dan Jenis

### Status

ACCEPTED

### Decision

Simpan custom template Alfa dan Pengumuman di `localStorage` browser admin dengan key terpisah berdasarkan jenis pesan dan session ID. Pengiriman tetap berupa japri manual melalui tautan WhatsApp.

### Context

Admin memerlukan isi pesan yang dapat berbeda pada setiap sesi dan pada masing-masing tab tanpa layanan WhatsApp berbayar.

### Consequences

Tidak diperlukan perubahan database, API, atau dependency. Template tidak ikut berpindah ke HP/browser admin lain; variabel peserta dan sesi baru diganti ketika pesan dibuat.

## 2026-09-13 — Tidak Menambah Constraint Attendance yang Redundant

### Status

ACCEPTED

### Decision

Pertahankan unique constraint/index attendance yang sudah ada dan jangan membuat migration keunikan baru.

### Context

Audit Supabase memverifikasi keunikan `(session_id, participant_id)`, `(session_id, local_device_id)` untuk nilai non-null, dan `(session_id, cookie_device_id)` untuk nilai non-null. Ketiganya tidak memiliki data duplikat.

### Consequences

Pemeriksaan aplikasi tetap memberi pesan yang ramah, sedangkan database melindungi race condition. Tidak ada downtime atau risiko migration redundant. Nullable kolom dan constraint tabel lain tidak diubah.

## 2026-09-13 — Masa Aktif Sesi Dapat Diubah Sebelum Finalisasi

### Status

ACCEPTED

### Decision

Waktu mulai dan selesai boleh diubah pada sesi akan datang maupun sesi yang sedang berjalan. Sesi yang sudah difinalisasi tidak boleh diubah, dan perubahan waktu selesai harus menyesuaikan kedaluwarsa token QR yang sama.

### Context

Pengguna memerlukan perpanjangan atau koreksi masa aktif setelah kegiatan dimulai tanpa membuat sesi dan QR baru.

### Consequences

Absensi langsung mengikuti rentang waktu baru. Identitas token QR, attendance yang sudah tercatat, dan pembatasan perangkat tidak berubah.

## 2026-09-13 — Absensi Tanpa Geolocation

### Status

ACCEPTED

### Decision

Alur aktif tidak meminta GPS, menyimpan koordinat baru, atau membatasi kehadiran berdasarkan radius. Nama tempat tetap boleh disimpan sebagai informasi opsional. Pembatasan satu perangkat per sesi melalui local device ID dan cookie tetap dipertahankan.

### Context

Pengguna meminta seluruh fitur geolocation di sisi peserta dan admin dihapus tanpa menghilangkan aturan satu HP hanya boleh satu kali absen.

### Consequences

QR dapat digunakan dari lokasi mana pun selama sesi, token, peserta, dan perangkat valid. Kolom serta data lokasi lama tidak dihapus dari database agar tidak melakukan migration destruktif.

## 2026-09-12 — Nonaktif Mempertahankan Riwayat Absensi

### Status

ACCEPTED

### Decision

Status peserta disimpan sebagai `participants.is_active`. Peserta nonaktif dikeluarkan dari seluruh kandidat absensi dan tindak lanjut baru, tetapi row peserta serta attendance yang sudah tercatat tidak dihapus.

### Context

Pengguna memerlukan cara mengeluarkan peserta dari absensi, pengumuman, dan Alfa tanpa harus menghapus data peserta.

### Reason

Soft-disable memungkinkan peserta diaktifkan kembali dan menjaga keutuhan laporan sesi lama.

### Consequences

Daftar pengelolaan tetap memuat seluruh peserta. Endpoint peserta untuk sesi, finalisasi, dan WhatsApp hanya memakai peserta aktif; endpoint pencatatan melakukan validasi tambahan terhadap status tersebut.

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
