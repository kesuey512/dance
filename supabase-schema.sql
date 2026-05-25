create table if not exists public.dance_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  date date not null,
  studio text not null,
  duration integer not null check (duration > 0),
  note text default '',
  created_at timestamptz not null default now()
);

create index if not exists dance_records_user_date_idx
on public.dance_records (user_id, date desc, created_at desc);

alter table public.dance_records enable row level security;

drop policy if exists "allow anon read own dance records" on public.dance_records;
drop policy if exists "allow anon insert own dance records" on public.dance_records;
drop policy if exists "allow anon delete own dance records" on public.dance_records;

-- This is a simple personal-app policy. It allows public anon access to rows,
-- separated only by user_id from VITE_DANCE_USER_ID in the frontend.
-- Do not store sensitive private data here.
create policy "allow anon read own dance records"
on public.dance_records for select
to anon
using (true);

create policy "allow anon insert own dance records"
on public.dance_records for insert
to anon
with check (true);

create policy "allow anon delete own dance records"
on public.dance_records for delete
to anon
using (true);
