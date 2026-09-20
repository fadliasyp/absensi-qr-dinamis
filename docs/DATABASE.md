# Database

## Ringkasan

Database menggunakan Supabase/PostgreSQL melalui Supabase JS, tanpa ORM. Repository tidak memiliki migration atau schema lengkap. Daftar field berikut **diinferensikan dari query source code**, bukan definisi SQL resmi; tipe, nullability, default, constraint, dan index yang tidak terlihat harus dikonfirmasi di Supabase.

## Tables

### `sessions`

Field yang digunakan:

- `id`
- `judul`
- `kelompok`
- `is_active`
- `start_time`, `end_time`
- `location_name`
- `is_finalized`, `finalized_at`
- `created_at`

Sesi yang dibuat UI selalu menggunakan kelompok `Semua` dan `is_active: true`. `location_name` hanya informasi tempat opsional. Kolom lama `latitude`, `longitude`, dan `radius_meters` mungkin masih ada di database, tetapi tidak lagi dibaca atau ditulis oleh alur aktif.

### `qr_tokens`

Field yang digunakan:

- `session_id`
- `token`
- `expired_at`
- `created_at`

Relasi logis: banyak/atau satu token mengacu ke satu session. Implementasi mengambil token tertua (`created_at` ascending, limit 1), sehingga secara efektif menggunakan satu token per sesi tetapi constraint uniknya belum diketahui.
Perubahan `sessions.end_time` melalui fitur edit masa aktif juga memperbarui `qr_tokens.expired_at` untuk sesi tersebut tanpa mengganti nilai token.

### `participants`

Field yang digunakan:

- `id`
- `nama`
- `gender`
- `kelompok`
- `no_wa`
- `is_active`

`nama` dan `kelompok` diwajibkan oleh API. Nomor WhatsApp dan gender dapat null menurut payload aplikasi. Migration `20260912000000_add_participant_is_active.sql` menambahkan `is_active boolean not null default true`; migration belum dijalankan atau diverifikasi terhadap Supabase dari sesi ini.

### `participant_groups`

Ditambahkan oleh migration `20260920000000_add_dynamic_participant_database.sql` sebagai registry nama kelompok dan akses link ketua. Field:

- `id`, `name`
- `access_token_hash`, `access_token_nonce`
- `is_active`
- `created_at`, `updated_at`

Nama kelompok disinkronkan dari nilai `participants.kelompok`. Token mentah tidak disimpan; backend membentuk link menggunakan secret server dan memeriksa hash ketika link dipakai.

### `participant_custom_fields`

Definisi field pilihan tambahan yang berlaku untuk seluruh kelompok:

- `id`, `label`
- `options` berupa array JSON
- `is_required`, `is_active`
- `created_at`, `updated_at`

Nama field unik tanpa membedakan kapitalisasi. Tahap awal hanya mendukung field dengan pilihan yang ditentukan admin.
`is_active = false` berarti field diarsipkan: field tidak dikirim ke halaman ketua kelompok, tetapi row field dan nilai terkait tidak dihapus. Field dapat diaktifkan kembali.

### `participant_custom_values`

Nilai field dinamis setiap peserta:

- `participant_id`, `field_id` sebagai primary key gabungan
- `value`
- `updated_via_group_id`
- `updated_at`

Foreign key peserta dan field memakai `ON DELETE CASCADE`; referensi kelompok pengisi memakai `ON DELETE SET NULL`. API memastikan nilai termasuk opsi aktif dan peserta berada pada kelompok token.
Endpoint admin tetap mengambil nilai field yang diarsipkan, tetapi UI rekap hanya menampilkan field aktif. Nilai arsip muncul kembali ketika field diaktifkan. Jika daftar opsi berubah, nilai lama dipertahankan dan UI menandainya sebagai nilai lama.

### `attendance`

Field yang digunakan:

- `id`
- `session_id`, `participant_id`
- `waktu_hadir`
- snapshot `nama`, `gender`, `kelompok`
- `keterangan` (`Hadir`, `Izin`, `Alfa`)
- `local_device_id`, `cookie_device_id`
- `user_agent`, `ip_address`

Kolom lama `user_latitude`, `user_longitude`, dan `distance_meters` mungkin masih ada, tetapi alur absensi aktif tidak lagi menulisnya.

Relasi yang terverifikasi dari hasil audit Supabase 2026-09-13:

- `attendance.session_id` → `sessions.id` dengan `ON DELETE CASCADE`
- `attendance.participant_id` → `participants.id` dengan `ON DELETE CASCADE`

Menghapus sesi atau peserta akan menghapus row attendance terkait. Menonaktifkan peserta tetap menjadi pilihan untuk mempertahankan riwayat.

Aplikasi memeriksa keunikan sebelum insert dan database juga menegakkannya melalui constraint/index yang dijelaskan di bawah. Error PostgreSQL `23505` tetap ditangani sebagai perlindungan terhadap request bersamaan.

### `locations` (legacy)

Tabel lokasi mungkin masih ada di database, tetapi tidak lagi diakses oleh API atau UI aktif. Data tidak dihapus agar perubahan tetap aman dan dapat dipulihkan.

### `admin_users`

Field yang digunakan:

- `id`
- `user_id`
- `nama_lengkap`
- `email`
- `role` (`admin` atau `super_admin` digunakan UI)
- `status` (`pending`, `approved`, `rejected`)
- `created_at`, `approved_at`

Relasi yang diharapkan adalah `user_id` ke Supabase Auth user, tetapi definisi constraint/trigger tidak ada di repository.

## Relationships

```text
auth.users  ?--- admin_users
sessions    1---? qr_tokens
sessions    1---* attendance *---1 participants
participant_groups 1---* participant_custom_values *---1 participants
participant_custom_fields 1---* participant_custom_values
```

Tanda `?` berarti cardinality/constraint aktual belum diketahui.

## Indexes and Constraints

Hasil audit Supabase yang dijalankan pengguna pada 2026-09-13 memverifikasi:

- primary key `attendance_pkey` pada `id`
- unique constraint `attendance_session_id_participant_id_key` pada `(session_id, participant_id)`
- partial unique index `unique_local_device_per_session` pada `(session_id, local_device_id)` ketika `local_device_id is not null`
- partial unique index `unique_cookie_device_per_session` pada `(session_id, cookie_device_id)` ketika `cookie_device_id is not null`
- foreign key attendance ke sessions dan participants, keduanya `ON DELETE CASCADE`
- tidak ada kelompok/baris duplikat pada ketiga aturan keunikan saat audit dijalankan

Keempat kolom tersebut memiliki tipe `session_id uuid`, `participant_id uuid`, `local_device_id text`, dan `cookie_device_id text`; semuanya nullable pada database aktual. Keunikan token/satu token per sesi, constraint nilai `keterangan`, dan schema tabel lain masih belum dikonfirmasi.

Audit baca-saja tersedia di `supabase/checks/20260913_attendance_uniqueness_audit.sql`. Query tersebut menampilkan tipe/nullability kolom, constraint, index, dan jumlah kelompok/baris duplikat untuk:

- `(session_id, participant_id)`
- `(session_id, local_device_id)` ketika device ID tidak null
- `(session_id, cookie_device_id)` ketika device ID tidak null

Hasil audit menunjukkan unique index yang dibutuhkan sudah ada, sehingga tidak dibuat migration tambahan yang redundant.

## Migrations and Seed

Repository memiliki migration tambahan untuk status peserta di `supabase/migrations/20260912000000_add_participant_is_active.sql`, pelepasan kewajiban kolom geolocation lama di `supabase/migrations/20260913000000_remove_geolocation_requirements.sql`, database peserta dinamis di `supabase/migrations/20260920000000_add_dynamic_participant_database.sql`, serta folder `supabase/checks/` untuk query audit baca-saja. Repository belum memiliki schema awal atau seed lengkap. Migration geolocation—dikonfirmasi pengguna sudah dijalankan pada 2026-09-13—mempertahankan kolom/data lama dan hanya melepas constraint `NOT NULL`; migration database peserta dinamis belum dijalankan. `note.sql` berisi query operasional/manual:

- melihat rekap
- membuat sesi contoh dua jam
- menghapus seluruh QR token
- format waktu WIB
- query peserta berdasarkan sesi/kelompok
- approval dan daftar admin

Jangan menjalankan `note.sql` sebagai migration; file tersebut mengandung operasi data/destruktif.

## Row Level Security

Belum diketahui / perlu dikonfirmasi. Ini kritis karena halaman browser memakai anon client untuk membaca/mengubah `admin_users`, sementara endpoint API memakai anon client untuk mayoritas operasi database.

Ketiga tabel database peserta dinamis mengaktifkan RLS dan mencabut privilege `anon`/`authenticated`. Aksesnya hanya melalui endpoint backend dengan service-role setelah verifikasi admin atau token kelompok.

## Data Safety

- Jangan menjalankan query delete dari `note.sql` pada produksi tanpa target dan backup yang jelas.
- Verifikasi FK/cascade sebelum menghapus sesi atau peserta.
- Jangan mengekspos `SUPABASE_SERVICE_ROLE_KEY` ke browser.
- Gunakan database non-produksi untuk test finalisasi karena proses membuat banyak row Alfa.
- Sebelum perubahan schema, ekspor schema aktual dan buat migration yang dapat direview.
