create table if not exists public.participant_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_token_hash text unique,
  access_token_nonce text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participant_groups_name_not_blank
    check (char_length(trim(name)) > 0)
);

create unique index if not exists participant_groups_name_unique
  on public.participant_groups (lower(trim(name)));

insert into public.participant_groups (name)
select min(trim(kelompok))
from public.participants
where kelompok is not null
  and trim(kelompok) <> ''
group by lower(trim(kelompok))
on conflict do nothing;

create table if not exists public.participant_custom_fields (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participant_custom_fields_label_not_blank
    check (char_length(trim(label)) > 0),
  constraint participant_custom_fields_options_array
    check (jsonb_typeof(options) = 'array')
);

create unique index if not exists participant_custom_fields_label_unique
  on public.participant_custom_fields (lower(trim(label)));

create table if not exists public.participant_custom_values (
  participant_id uuid not null
    references public.participants(id) on delete cascade,
  field_id uuid not null
    references public.participant_custom_fields(id) on delete cascade,
  value text not null,
  updated_via_group_id uuid
    references public.participant_groups(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (participant_id, field_id),
  constraint participant_custom_values_value_not_blank
    check (char_length(trim(value)) > 0)
);

create index if not exists participant_custom_values_field_id_idx
  on public.participant_custom_values(field_id);

alter table public.participant_groups enable row level security;
alter table public.participant_custom_fields enable row level security;
alter table public.participant_custom_values enable row level security;

revoke all on public.participant_groups from anon, authenticated;
revoke all on public.participant_custom_fields from anon, authenticated;
revoke all on public.participant_custom_values from anon, authenticated;

comment on table public.participant_groups is
  'Kelompok peserta, hash token, dan nonce untuk link akses tanpa login.';
comment on table public.participant_custom_fields is
  'Definisi field pilihan dinamis yang berlaku untuk seluruh kelompok.';
comment on table public.participant_custom_values is
  'Nilai field dinamis per peserta yang diisi melalui link kelompok.';
