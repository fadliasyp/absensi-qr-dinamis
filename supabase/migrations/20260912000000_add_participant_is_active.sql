alter table public.participants
add column if not exists is_active boolean not null default true;

comment on column public.participants.is_active is
  'Peserta aktif dapat mengikuti absensi dan menerima tindak lanjut WhatsApp.';
