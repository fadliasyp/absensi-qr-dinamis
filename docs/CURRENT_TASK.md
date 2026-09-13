# Current Task

## Task

Belum ada task aktif.

## Status

Penghapusan geolocation dari alur aktif selesai pada 2026-09-13; uji end-to-end Supabase/deployment masih perlu dilakukan pengguna.

## Completed

- Menghapus permintaan geolocation browser peserta dan admin.
- Menghapus koordinat, radius, validasi jarak, serta penyimpanan jarak dari endpoint attendance.
- Menghapus pengelolaan lokasi tersimpan dan endpoint `/api/locations`.
- Menjadikan nama tempat sebagai informasi sesi opsional.
- Mempertahankan pemeriksaan peserta ganda, local device ID, dan cookie device ID per sesi.
- Menghapus radius dari PDF QR dan menambahkan regression test tanpa geolocation.

## Files Being Modified

Tidak ada pekerjaan source code lanjutan yang direncanakan.

## Next Steps

Jalankan migration `20260913000000_remove_geolocation_requirements.sql`, deploy source terbaru, lalu uji absensi tanpa izin lokasi serta percobaan kedua dari HP yang sama.

## Blockers

Schema Supabase aktual belum diverifikasi dan migration pelepasan `NOT NULL` belum dijalankan; kolom geolocation lama sengaja tidak dihapus dari database.

## Notes for Next Session

Baca `AGENTS.md`, `PROJECT_CONTEXT.md`, dan `FEATURE_BASELINE.md`. Verifikasi absensi end-to-end tanpa permission lokasi dan pastikan duplikasi perangkat tetap ditolak sebelum menyatakan fitur stabil.
