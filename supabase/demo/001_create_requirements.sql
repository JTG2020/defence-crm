-- ============================================================================
-- BLOCK 1 — create the table, switch RLS on, add four policies.
-- Run this whole block in the Supabase SQL editor.
--
-- NOTE: this table is named `public.requirements`, the same name the full
-- migration set (supabase/migrations/0001) uses. If you later run
-- supabase/apply_all.sql, drop this one first:  drop table public.requirements cascade;
-- ============================================================================

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ref text not null unique,
  customer text not null,
  status text not null default 'received'
    check (status in ('received','qualifying','quoted','submitted','won','lost','cancelled')),
  submission_deadline date,
  notes text
);

alter table public.requirements enable row level security;

drop policy if exists requirements_select_authenticated on public.requirements;
create policy requirements_select_authenticated on public.requirements
  for select to authenticated using (true);

drop policy if exists requirements_insert_authenticated on public.requirements;
create policy requirements_insert_authenticated on public.requirements
  for insert to authenticated with check (true);

drop policy if exists requirements_update_authenticated on public.requirements;
create policy requirements_update_authenticated on public.requirements
  for update to authenticated using (true) with check (true);

drop policy if exists requirements_delete_authenticated on public.requirements;
create policy requirements_delete_authenticated on public.requirements
  for delete to authenticated using (true);

-- In plain words: these four policies let any signed-in user read every row and
-- add, change or delete any row; anyone using only the public key, with no
-- signed-in session, sees and changes nothing.
