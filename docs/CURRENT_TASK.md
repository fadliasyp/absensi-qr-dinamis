# Current Task

## Task

Belum ada task aktif.

## Status

Implementasi source fitur peserta aktif/nonaktif selesai pada 2026-09-12; penerapan migration dan uji Supabase masih perlu dilakukan pengguna.

## Completed

- Menambahkan migration `participants.is_active` dengan default peserta lama tetap aktif.
- Menambahkan tombol aktif/nonaktif, indikator, dan filter pada Kelola Peserta.
- Memfilter peserta nonaktif dari absensi QR/manual, pengumuman, finalisasi, dan WhatsApp Alfa.
- Menolak peserta nonaktif pada endpoint absensi QR/manual.
- Mempertahankan riwayat attendance lama.
- Menambahkan pemeriksaan otomatis untuk kontrak fitur dan sintaks halaman.

## Files Being Modified

Tidak ada pekerjaan source code lanjutan yang direncanakan.

## Next Steps

Jalankan migration status peserta pada Supabase, deploy source terbaru, lalu uji satu peserta aktif dan satu peserta nonaktif secara end-to-end.

## Blockers

Migration belum dijalankan dari sesi ini karena perubahan database memerlukan persetujuan dan akses lingkungan pengguna.

## Notes for Next Session

Baca `AGENTS.md`, `PROJECT_CONTEXT.md`, dan `FEATURE_BASELINE.md`. Verifikasi kolom `participants.is_active` serta RLS Supabase sebelum menyatakan fitur stabil.
