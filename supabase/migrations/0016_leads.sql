-- 0016_leads.sql — the front of the funnel: a lead captured from a call, WhatsApp or referral.
-- A lead is a pre-RFI opportunity. When it matures it converts to a requirement (the tender system).
-- Apply in the SQL editor after 0001-0015. STATUS: written, not yet applied.

create type lead_source as enum
  ('call','whatsapp','referral','gem','portal','direct','other');
create type lead_stage as enum
  ('new','contacted','qualified','quoted','won','lost');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source lead_source not null default 'call',
  name text not null,
  company text,
  phone text,
  email text,
  product_note text,
  stage lead_stage not null default 'new',
  next_follow_up date,
  owner text,
  converted_requirement_id uuid references public.requirements(id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index leads_followup_idx on public.leads(next_follow_up);
create index leads_stage_idx on public.leads(stage);

alter table public.leads enable row level security;

create policy owner_all on public.leads
  for all using (public.is_owner()) with check (public.is_owner());

create policy sales_rw on public.leads
  for all using (public.current_app_role() = 'sales')
  with check (public.current_app_role() = 'sales');

create trigger audit_leads
  after insert or update or delete on public.leads
  for each row execute function public.write_audit();
