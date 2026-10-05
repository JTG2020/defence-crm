-- 0004_rls.sql — Row-Level Security: the authorization boundary.
-- STATUS: written, NOT applied. This is the highest-consequence file in the repo.
-- With a public anon key, RLS is the authorization. A table with RLS enabled and no matching
-- policy returns zero rows (default deny). Every table must be listed below.

alter table public.profiles            enable row level security;
alter table public.requirements        enable row level security;
alter table public.requirement_lines   enable row level security;
alter table public.oems                enable row level security;
alter table public.oem_products        enable row level security;
alter table public.commitments         enable row level security;
alter table public.oem_requests        enable row level security;
alter table public.quotes              enable row level security;
alter table public.quote_versions      enable row level security;
alter table public.quote_version_lines enable row level security;
alter table public.orders              enable row level security;
alter table public.order_stages        enable row level security;
alter table public.pdi_records         enable row level security;
alter table public.deliveries          enable row level security;
alter table public.oem_invoices        enable row level security;
alter table public.payments            enable row level security;
alter table public.documents           enable row level security;
alter table public.tasks               enable row level security;
alter table public.approvals           enable row level security;
alter table public.audit_log           enable row level security;

-- The caller's role, read without recursive RLS.
create or replace function public.current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$ select public.current_app_role() = 'owner' $$;

-- Profiles: a user sees their own row; owner sees all.
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_owner());
create policy profiles_owner_write on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- Owner/management: full access to every material table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'requirements','requirement_lines','oems','oem_products','commitments','oem_requests',
    'quotes','quote_versions','quote_version_lines','orders','order_stages','pdi_records',
    'deliveries','oem_invoices','payments','documents','tasks','approvals'
  ] loop
    execute format(
      'create policy owner_all on public.%1$I for all
       using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;

-- Sales: the front of the funnel. No access to payments.
do $$
declare
  t text;
begin
  foreach t in array array[
    'requirements','requirement_lines','oems','oem_products','commitments','oem_requests',
    'quotes','quote_versions','quote_version_lines','documents','tasks'
  ] loop
    execute format(
      'create policy sales_rw on public.%1$I for all
       using (public.current_app_role() = ''sales'')
       with check (public.current_app_role() = ''sales'')', t);
  end loop;
end $$;

-- Operations: fulfilment. May read requirements and write order/PDI/delivery/documents.
do $$
declare
  t text;
begin
  foreach t in array array[
    'orders','order_stages','pdi_records','deliveries','documents','tasks','oems'
  ] loop
    execute format(
      'create policy ops_rw on public.%1$I for all
       using (public.current_app_role() = ''operations'')
       with check (public.current_app_role() = ''operations'')', t);
  end loop;
end $$;
create policy ops_read_requirements on public.requirements
  for select using (public.current_app_role() = 'operations');

-- Finance: invoices, payments, documents, and read of orders.
do $$
declare
  t text;
begin
  foreach t in array array['oem_invoices','payments','documents','tasks'] loop
    execute format(
      'create policy finance_rw on public.%1$I for all
       using (public.current_app_role() = ''finance'')
       with check (public.current_app_role() = ''finance'')', t);
  end loop;
end $$;
create policy finance_read_orders on public.orders
  for select using (public.current_app_role() = 'finance');

-- Audit: owner may read; nobody may write except the SECURITY DEFINER trigger (no INSERT/
-- UPDATE/DELETE policy is created, so the table is append-only through the trigger alone).
create policy audit_owner_read on public.audit_log
  for select using (public.is_owner());
