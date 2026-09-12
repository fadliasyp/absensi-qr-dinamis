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
- `location_name`, `latitude`, `longitude`, `radius_meters`
- `is_finalized`, `finalized_at`
- `created_at`

Sesi yang dibuat UI selalu menggunakan kelompok `Semua` dan `is_active: true`.

### `qr_tokens`

Field yang digunakan:

- `session_id`
- `token`
- `expired_at`
- `created_at`

Relasi logis: banyak/atau satu token mengacu ke satu session. Implementasi mengambil token tertua (`created_at` ascending, limit 1), sehingga secara efektif menggunakan satu token per sesi tetapi constraint uniknya belum diketahui.

### `participants`

Field yang digunakan:

- `id`
- `nama`
- `gender`
- `kelompok`
- `no_wa`
- `is_active`

`nama` dan `kelompok` diwajibkan oleh API. Nomor WhatsApp dan gender dapat null menurut payload aplikasi. Migration `20260912000000_add_participant_is_active.sql` menambahkan `is_active boolean not null default true`; migration belum dijalankan atau diverifikasi terhadap Supabase dari sesi ini.

### `attendance`

Field yang digunakan:

- `id`
- `session_id`, `participant_id`
- `waktu_hadir`
- snapshot `nama`, `gender`, `kelompok`
- `keterangan` (`Hadir`, `Izin`, `Alfa`)
- `local_device_id`, `cookie_device_id`
- `user_agent`, `ip_address`
- `user_latitude`, `user_longitude`, `distance_meters`

Relasi logis:

- `attendance.session_id` → `sessions.id`
- `attendance.participant_id` → `participants.id`

Nested select `participants(no_wa)` membuktikan Supabase mengenali sebuah relasi attendance–participants, tetapi nama/aturan foreign key belum tersedia.

Aplikasi memeriksa keunikan peserta per sesi serta masing-masing device ID per sesi sebelum insert. Error PostgreSQL `23505` juga ditangani, yang mengindikasikan ada unique constraint, tetapi kolom constraint yang sebenarnya belum dapat dibuktikan.

### `locations`

Field yang digunakan:

- `id`
- `location_name`
- `latitude`, `longitude`
- `radius_meters`

Default aplikasi untuk radius adalah 50 meter.

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
locations   (disalin ke field lokasi sessions; tidak ada location_id yang digunakan)
```

Tanda `?` berarti cardinality/constraint aktual belum diketahui.

## Indexes and Constraints

Belum diketahui / perlu dikonfirmasi. Secara bisnis, kandidat yang harus diperiksa:

- uniqueness `(session_id, participant_id)` pada attendance
- uniqueness device per sesi, dengan perlakuan null yang sesuai
- uniqueness token dan/atau satu token per sesi
- foreign key dan cascade untuk session/participant deletion
- check constraint nilai `keterangan`, `status`, dan radius positif

Daftar ini adalah kebutuhan audit, bukan klaim bahwa constraint tersebut ada.

## Migrations and Seed

Repository memiliki migration tambahan untuk status peserta di `supabase/migrations/20260912000000_add_participant_is_active.sql`, tetapi belum memiliki schema awal atau seed lengkap. `note.sql` berisi query operasional/manual:

- melihat rekap
- membuat sesi contoh dua jam
- menghapus seluruh QR token
- format waktu WIB
- query peserta berdasarkan sesi/kelompok
- approval dan daftar admin

Jangan menjalankan `note.sql` sebagai migration; file tersebut mengandung operasi data/destruktif.

## Row Level Security

Belum diketahui / perlu dikonfirmasi. Ini kritis karena halaman browser memakai anon client untuk membaca/mengubah `admin_users`, sementara endpoint API memakai anon client untuk mayoritas operasi database.

## Data Safety

- Jangan menjalankan query delete dari `note.sql` pada produksi tanpa target dan backup yang jelas.
- Verifikasi FK/cascade sebelum menghapus sesi atau peserta.
- Jangan mengekspos `SUPABASE_SERVICE_ROLE_KEY` ke browser.
- Gunakan database non-produksi untuk test finalisasi karena proses membuat banyak row Alfa.
- Sebelum perubahan schema, ekspor schema aktual dan buat migration yang dapat direview.
