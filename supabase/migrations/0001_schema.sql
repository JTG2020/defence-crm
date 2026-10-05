-- 0001_schema.sql — the frozen data model.
-- STATUS: written, NOT applied. No Supabase secret key / CLI was available in this session
-- (see docs/RELEASE-SCOPE.md §6). It is the source of truth for the table shapes mirrored in
-- lib/types.ts. Apply with `supabase db push` once the secret key exists, then run the test suite.

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create type requirement_status as enum
  ('received','qualifying','quoted','submitted','won','lost','cancelled');
create type commitment_kind as enum ('firm','indicative');
create type oem_approval_status as enum ('approved','conditional','not_approved');
create type quote_status as enum ('draft','pending_approval','approved','rejected','superseded');
create type loss_reason as enum
  ('price','technical_non_compliance','delivery_timeline','competitor_preference',
   'quantity_or_capacity','cancelled','not_pursued','other');
create type app_role as enum ('owner','sales','operations','finance');
create type document_type as enum
  ('quotation','invoice','compliance_certificate','technical_drawing','pdi_report','other');
create type coverage_state as enum ('covered','partly_covered','no_cover');
create type approval_status as enum ('requested','approved','rejected');

-- One app profile per auth user, carrying the four-role claim.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null default 'sales',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer text not null,
  status requirement_status not null default 'received',
  submission_deadline date not null,
  loss_reason loss_reason,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint lost_needs_reason check (status <> 'lost' or loss_reason is not null)
);

create table public.requirement_lines (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  line_no integer not null,
  part_number text not null,
  description text not null default '',
  quantity integer not null check (quantity > 0),
  uom text not null,
  deadline date not null,
  is_demo boolean not null default false,
  unique (requirement_id, line_no)
  -- deadline >= requirement.submission_deadline is enforced by trigger in 0003, because
  -- Postgres does not allow a subquery inside a CHECK constraint.
);

create table public.oems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  approval_status oem_approval_status not null default 'not_approved',
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  capabilities text[] not null default '{}',
  contact_name text,
  contact_email text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.oem_products (
  id uuid primary key default gen_random_uuid(),
  oem_id uuid not null references public.oems(id) on delete cascade,
  part_number text not null,
  description text not null default '',
  unit_price numeric(14,2) not null check (unit_price >= 0),
  currency char(3) not null default 'INR',
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  is_demo boolean not null default false,
  unique (oem_id, part_number)
);

-- Firm and indicative are separate facts. Nothing in the schema lets them be summed together.
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  requirement_line_id uuid not null references public.requirement_lines(id) on delete cascade,
  oem_id uuid not null references public.oems(id),
  kind commitment_kind not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  expected_date date not null,
  shipment_seq integer not null default 1 check (shipment_seq > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (requirement_line_id, oem_id, shipment_seq)
);

create table public.oem_requests (
  id uuid primary key default gen_random_uuid(),
  requirement_line_id uuid not null references public.requirement_lines(id) on delete cascade,
  oem_id uuid not null references public.oems(id),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  response_notes text,
  is_demo boolean not null default false,
  unique (requirement_line_id, oem_id)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  status quote_status not null default 'draft',
  current_version integer not null default 1 check (current_version > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  status quote_status not null default 'draft',
  approved_at timestamptz,
  is_demo boolean not null default false,
  unique (quote_id, version_no)
);

create table public.quote_version_lines (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  requirement_line_id uuid not null references public.requirement_lines(id),
  oem_price numeric(14,2) not null check (oem_price >= 0),
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  target_margin_pct numeric(6,2) not null default 15,
  final_price numeric(14,2) check (final_price is null or final_price >= 0),
  is_demo boolean not null default false,
  unique (quote_version_id, requirement_line_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id),
  requirement_id uuid not null references public.requirements(id),
  po_ref text,
  supplier_po_ref text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.order_stages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage text not null,
  owner text,
  expected_date date,
  committed_date date,
  completed_at timestamptz,
  is_demo boolean not null default false
);

create table public.pdi_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  offered_qty integer not null default 0 check (offered_qty >= 0),
  cleared_qty integer not null default 0 check (cleared_qty >= 0),
  rejected_qty integer not null default 0 check (rejected_qty >= 0),
  held boolean not null default false,
  is_demo boolean not null default false,
  constraint pdi_split check (cleared_qty + rejected_qty <= offered_qty)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  delivered_on date not null,
  is_demo boolean not null default false
);

create table public.oem_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  invoice_no text not null,
  gross_amount numeric(14,2) not null default 0 check (gross_amount >= 0),
  due_date date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  oem_invoice_id uuid not null references public.oem_invoices(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null,
  kind text not null default 'customer_receipt',
  is_demo boolean not null default false
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  type document_type not null,
  owner_type text not null check (owner_type in ('requirement','oem','order')),
  owner_id uuid not null,
  title text not null,
  issue_date date,
  expiry_date date,
  storage_path text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  owner_type text,
  owner_id uuid,
  due_date date,
  completed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  status approval_status not null default 'requested',
  actor uuid references auth.users(id),
  reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before jsonb,
  after jsonb,
  actor uuid,
  at timestamptz not null default now()
);

create index requirement_lines_requirement_idx on public.requirement_lines(requirement_id);
create index commitments_line_idx on public.commitments(requirement_line_id);
create index commitments_kind_idx on public.commitments(kind);
create index oem_requests_line_idx on public.oem_requests(requirement_line_id);
create index documents_expiry_idx on public.documents(expiry_date);
