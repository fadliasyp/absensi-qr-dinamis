-- Audit baca-saja untuk aturan satu peserta/perangkat per sesi.
-- Jalankan di Supabase SQL Editor, lalu simpan/kirim hasil tabelnya.
-- Query ini tidak mengubah schema atau data.

with
participant_duplicates as (
  select
    count(*) as duplicate_groups,
    coalesce(sum(row_count - 1), 0) as extra_rows
  from (
    select count(*) as row_count
    from public.attendance
    where participant_id is not null
    group by session_id, participant_id
    having count(*) > 1
  ) duplicates
),
local_device_duplicates as (
  select
    count(*) as duplicate_groups,
    coalesce(sum(row_count - 1), 0) as extra_rows
  from (
    select count(*) as row_count
    from public.attendance
    where local_device_id is not null
    group by session_id, local_device_id
    having count(*) > 1
  ) duplicates
),
cookie_device_duplicates as (
  select
    count(*) as duplicate_groups,
    coalesce(sum(row_count - 1), 0) as extra_rows
  from (
    select count(*) as row_count
    from public.attendance
    where cookie_device_id is not null
    group by session_id, cookie_device_id
    having count(*) > 1
  ) duplicates
),
duplicate_summary as (
  select
    'session_id + participant_id' as rule_name,
    duplicate_groups,
    extra_rows
  from participant_duplicates

  union all

  select
    'session_id + local_device_id',
    duplicate_groups,
    extra_rows
  from local_device_duplicates

  union all

  select
    'session_id + cookie_device_id',
    duplicate_groups,
    extra_rows
  from cookie_device_duplicates
),
audit_result as (
  select
    'column'::text as section,
    column_name::text as item,
    format('type=%s; nullable=%s', data_type, is_nullable) as detail
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'attendance'
    and column_name in (
      'session_id',
      'participant_id',
      'local_device_id',
      'cookie_device_id'
    )

  union all

  select
    'constraint',
    constraint_record.conname,
    pg_get_constraintdef(constraint_record.oid)
  from pg_constraint constraint_record
  join pg_class table_record
    on table_record.oid = constraint_record.conrelid
  join pg_namespace schema_record
    on schema_record.oid = table_record.relnamespace
  where schema_record.nspname = 'public'
    and table_record.relname = 'attendance'

  union all

  select
    'index',
    indexname,
    indexdef
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'attendance'

  union all

  select
    'duplicate',
    rule_name,
    format('duplicate_groups=%s; extra_rows=%s', duplicate_groups, extra_rows)
  from duplicate_summary
)
select section, item, detail
from audit_result
order by section, item;
