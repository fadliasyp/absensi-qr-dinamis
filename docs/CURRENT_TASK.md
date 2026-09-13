# Current Task

## Task

Belum ada task aktif.

## Status

Tata letak custom picker Kelompok dan Nama Peserta selesai dirapikan pada 2026-09-13 berdasarkan hasil penggunaan mobile.

## Completed

- Menghapus kolom pencarian dari pemilih Kelompok maupun Nama Peserta.
- Mengubah bottom sheet yang menempel ke bawah menjadi modal mengambang di tengah dengan jarak aman atas/bawah.
- Membulatkan seluruh sudut modal dan membatasi tingginya terhadap dynamic viewport mobile.
- Membuat daftar scroll di dalam modal serta selalu kembali ke posisi paling atas saat dibuka.
- Menghilangkan keterangan kelompok yang berulang pada setiap kartu nama peserta.
- Mempertahankan refresh status dan filter peserta yang sudah hadir.
- Memperbarui regression test tata letak; seluruh 18 test lokal lulus.

## Files Being Modified

Tidak ada pekerjaan source code lanjutan yang direncanakan.

## Next Steps

Setelah deploy, periksa posisi dan scrolling modal pada Android Chrome/in-app browser, iPhone Safari, serta Huawei Browser/WebView.

## Blockers

URL/HTTPS deployment, log Vercel/Supabase, dan pengujian Android/iPhone/Huawei nyata belum tersedia.

## Notes for Next Session

Baca `AGENTS.md`, `PROJECT_CONTEXT.md`, `FEATURE_BASELINE.md`, dan `DATABASE.md`. Constraint attendance sudah terverifikasi; jangan membuat migration keunikan yang redundant.
