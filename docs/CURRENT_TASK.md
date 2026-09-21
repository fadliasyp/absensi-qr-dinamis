# Current Task

## Task

Belum ada task aktif.

## Status

Database peserta dinamis per kelompok selesai diimplementasikan secara lokal pada 2026-09-20. Migration baru belum dijalankan pada Supabase.

## Completed

- Menambahkan pengelolaan field pilihan dinamis yang berlaku untuk seluruh kelompok.
- Menambahkan link rahasia per kelompok tanpa login, dengan token ter-hash, pencabutan, dan regenerasi link.
- Menambahkan halaman mobile bagi ketua kelompok untuk memilih nilai dan menyimpannya otomatis tanpa tombol kirim.
- Menambahkan rekap admin seluruh kelompok per field lengkap dengan progress, ringkasan jawaban, pencarian, dan filter.
- Mengubah nonaktif field menjadi arsip: field hilang dari link ketua dan rekap aktif, tetapi definisi serta seluruh nilai lama tetap tersimpan.
- Merapikan halaman admin dengan kartu ringkasan dan modal tambah/edit field agar layar utama lebih ringkas.
- Memisahkan rekap peserta dan link kelompok ke dua tab; navigasi tab tetap terlihat saat scroll dan dapat dibuka langsung melalui hash URL.
- Memindahkan aksi field ke menu titik tiga serta mengganti filter kelompok/jawaban native dengan dropdown custom.
- Menambahkan export PDF per kelompok dengan pilihan 1–6 field, default Nama/Gender/Kelompok, serta layout A4 potret sekitar 40 peserta per halaman.
- Menambahkan judul desa dan highlight kelompok, total muda-mudi, laki-laki, serta perempuan di atas tabel PDF.
- Memasang Logo Absenku sebagai favicon dan Apple touch icon pada seluruh halaman aktif.
- Menambahkan loading pengunci layar saat membuat/membuat ulang/menonaktifkan link kelompok dan membuat PDF.
- Menambahkan export satu PDF gabungan seluruh kelompok dengan pilihan field dinamis, urutan kelompok/nama, dan layout baris rapat yang sama seperti export per kelompok.
- Merapatkan tinggi baris export PDF hasil absensi sesi dari 26 menjadi 18 poin tanpa mengubah gaya visual laporan.
- Membatasi endpoint link agar hanya dapat membaca peserta aktif dan mengubah field peserta pada kelompoknya sendiri.
- Menambahkan migration additive serta regression test; seluruh 28 test lokal lulus.

## Files Being Modified

`api/index.js`, dua halaman baru di `public/`, navigation admin, migration, test, dan dokumentasi telah diperbarui.

## Next Steps

Jalankan migration `20260920000000_add_dynamic_participant_database.sql`, deploy, buat satu field serta link kelompok, lalu uji autosave dari HP.

## Blockers

Migration belum dijalankan dan integrasi Supabase/HP nyata belum diuji. Fitur baru belum dapat dipakai sebelum migration diterapkan.

## Notes for Next Session

Baca `AGENTS.md`, `PROJECT_CONTEXT.md`, `FEATURE_BASELINE.md`, dan `DATABASE.md`. Constraint attendance sudah terverifikasi; jangan membuat migration keunikan yang redundant.
