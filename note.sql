select
  waktu_hadir,
  nama,
  gender,
  kelompok,
  keterangan
from attendance
order by waktu_hadir asc;

-- buat sessi durasi 2 jam
insert into sessions (judul, kelompok, is_active, start_time, end_time)
values (
  'Absensi Testing Semua Kelompok',
  'Semua',
  true,
  now(),
  now() + interval '2 hours'
)
returning *;


-- bersihin qr_tokens lama di supabase
delete from qr_tokens;


-- Waktu Hadir agar Indonesia (WIB)
select
  to_char(
    waktu_hadir at time zone 'Asia/Jakarta',
    'DD/MM/YYYY HH24:MI:SS'
  ) || ' WIB' as waktu_hadir,
  nama,
  gender,
  kelompok,
  keterangan
from attendance
order by waktu_hadir asc;

-- Melihat siapa yg hadir sesuai kelompok dan sesi pengajian
select
  row_number() over (order by waktu_hadir asc) as no,
  to_char(
    waktu_hadir at time zone 'Asia/Jakarta',
    'DD/MM/YYYY HH24:MI:SS'
  ) || ' WIB' as waktu_hadir,
  nama,
  gender,
  kelompok,
  keterangan
from attendance
where session_id = 'ISI_SESSION_ID_KAMU'
  and lower(kelompok) = lower('Kutabumi')
order by waktu_hadir asc;

-- Approved untuk jadi admin --
update admin_users
set
  status = 'approved',
  approved_at = now()
where email = 'emailadmin@example.com';

-- cek admin users --
select
  nama_lengkap,
  email,
  role,
  status,
  created_at,
  approved_at
from admin_users
order by created_at desc;