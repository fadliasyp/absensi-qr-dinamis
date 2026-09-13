# Current Task

## Task

Belum ada task aktif.

## Status

Penyaringan nama peserta yang sudah hadir selesai diperkuat pada 2026-09-13. Daftar diperbarui dari server setiap kali pemilih Nama Peserta dibuka.

## Completed

- Mempertahankan filter `isPresent` yang mengeluarkan peserta hadir dari custom picker.
- Mengambil ulang daftar peserta/status kehadiran sebelum pemilih Nama Peserta ditampilkan.
- Menampilkan status memuat dan menolak menampilkan daftar lama bila refresh gagal.
- Menghapus pilihan yang menjadi tidak tersedia dan memperbarui jumlah peserta belum hadir.
- Menandai peserta hadir secara lokal setelah submit sukses atau respons `PARTICIPANT_ALREADY_PRESENT`.
- Tidak menambahkan polling terus-menerus atau dependency realtime.
- Menambahkan regression test untuk refresh serta penghilangan peserta hadir; seluruh 18 test lokal lulus.

## Files Being Modified

Tidak ada pekerjaan source code lanjutan yang direncanakan.

## Next Steps

Setelah deploy, buka QR yang sama di dua perangkat. Absenkan satu nama pada perangkat pertama, lalu buka pilihan Nama Peserta di perangkat kedua dan pastikan nama tersebut sudah hilang.

## Blockers

URL/HTTPS deployment, log Vercel/Supabase, dan pengujian Android/iPhone/Huawei nyata belum tersedia.

## Notes for Next Session

Baca `AGENTS.md`, `PROJECT_CONTEXT.md`, `FEATURE_BASELINE.md`, dan `DATABASE.md`. Constraint attendance sudah terverifikasi; jangan membuat migration keunikan yang redundant.
