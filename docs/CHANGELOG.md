# Changelog

Perubahan dicatat sejak bootstrap dokumentasi; tidak ada sejarah fitur lama yang direkonstruksi tanpa bukti.

## 2026-09-12

### Documentation

- Menambahkan README sebagai pintu masuk project.
- Menambahkan aturan permanen agent di `AGENTS.md`.
- Menambahkan project context, current task, feature baseline, architecture, database notes, dan decision log.
- Mendokumentasikan fitur yang ditemukan beserta status `WORKING`, `PARTIAL`, `BROKEN`, dan `DEPRECATED`.
- Mencatat ketidakpastian schema/RLS dan risiko authorization tanpa mengubah source code.

### Technical

- Memverifikasi sintaks `api/index.js`, `server.js`, dan `public/admin-auth.js` dengan `node --check`.
- Menjalankan `npm test` dan mengonfirmasi bahwa script masih placeholder yang keluar gagal.

