alter table public.sessions
  alter column latitude drop not null,
  alter column longitude drop not null,
  alter column radius_meters drop not null;

alter table public.attendance
  alter column user_latitude drop not null,
  alter column user_longitude drop not null,
  alter column distance_meters drop not null;

comment on column public.sessions.latitude is
  'Legacy: tidak lagi digunakan oleh alur absensi aktif.';
comment on column public.sessions.longitude is
  'Legacy: tidak lagi digunakan oleh alur absensi aktif.';
comment on column public.sessions.radius_meters is
  'Legacy: tidak lagi digunakan oleh alur absensi aktif.';
comment on column public.attendance.user_latitude is
  'Legacy: absensi baru tidak lagi menyimpan geolocation.';
comment on column public.attendance.user_longitude is
  'Legacy: absensi baru tidak lagi menyimpan geolocation.';
comment on column public.attendance.distance_meters is
  'Legacy: absensi baru tidak lagi menghitung jarak.';
