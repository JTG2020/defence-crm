-- 0005_extended_modules.sql — close the gaps between the Odoo "Input Sheet" and the schema.
-- STATUS: written, NOT applied (no Supabase secret key / CLI in this session — see REPORT.md).
-- Source of the field list: docs/DATA-MAP.md, from Inverbrass Odoo Order Management sheet (1).
-- This extends the Phase-1 model with the modules the client's sheet defines but the plan's
-- original table list did not enumerate. It does not change any screen by itself.

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  division text,
  sub_division text,
  billing_address text,
  delivery_address text,
  gst_number text,
  gem_registration text,
  vendor_registration text,
  portal_login_mapping text,
  payment_terms text,
  approval_requirements text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  is_demo boolean not null default false
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  part_number text not null,
  client_part_number text,
  description text not null default '',
  hsn_code text,
  uom text not null default 'nos',
  category text,
  technical_specifications text,
  compliance_certifications text[] not null default '{}', -- RCMA, CEMILAC, DGQA, LCSO, MIL
  standard_price numeric(14,2),
  currency char(3) not null default 'INR',
  lead_time_days integer check (lead_time_days >= 0),
  moq integer check (moq >= 0),
  shelf_life_days integer,
  export_restriction text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (part_number, client_part_number)
);

create table public.product_oems (
  product_id uuid not null references public.products(id) on delete cascade,
  oem_id uuid not null references public.oems(id) on delete cascade,
  primary key (product_id, oem_id)
);

alter table public.oems
  add column brand_category text,
  add column country_of_origin text,
  add column product_portfolio text,
  add column moq_rules text,
  add column pricing_validity text,
  add column freight_terms text,
  add column warranty_terms text,
  add column payment_terms text,
  add column commission_pct numeric(6,2),
  add column nda_status text,
  add column bank_details text;

-- ---------------------------------------------------------------------------
-- RFI / Quotation extensions
-- ---------------------------------------------------------------------------

alter table public.requirements
  add column customer_id uuid references public.customers(id),
  add column project_name text,
  add column bid_type text check (bid_type in ('single','double')),
  add column submission_type text check (submission_type in ('hard','soft','both')),
  add column source text check (source in ('gem','client_portal','direct','oem')),
  add column gem_tender_no text,
  add column quotation_validity_days integer,
  add column assigned_to uuid references auth.users(id),
  add column regret_letter_date date,
  add column competitor_note text;

alter table public.requirement_lines
  add column client_part_number text,
  add column oem_id uuid references public.oems(id),
  add column staggered boolean not null default false,
  add column approval_requirements text[] not null default '{}';

alter table public.quotes add column quote_no text unique;

alter table public.quote_versions
  add column valid_until date,
  add column notes text,
  add column created_at timestamptz not null default now();

alter table public.quote_version_lines
  add column oem_id uuid references public.oems(id),
  add column currency char(3) not null default 'INR',
  add column freight numeric(14,2) not null default 0,
  add column taxes numeric(14,2) not null default 0,
  add column delivery_terms text,
  add column payment_terms text,
  add column discount numeric(14,2) not null default 0,
  add column pnc_status text,
  add column tech_compliant boolean,
  add column comm_compliant boolean;

-- ---------------------------------------------------------------------------
-- Purchase Order, readiness, PDI, delivery
-- ---------------------------------------------------------------------------

alter table public.orders
  add column po_number text unique,
  add column po_date date,
  add column po_value numeric(14,2),
  add column taxes numeric(14,2),
  add column material_readiness_required boolean not null default false,
  add column partial_allowed boolean not null default true,
  add column pdi_required boolean not null default false,
  add column pdi_mode text check (pdi_mode in ('vc','physical')),
  add column pdi_inspector_oem text,
  add column pdi_inspector_client text,
  add column docs_required text,
  add column special_conditions text,
  add column warranty_terms text,
  add column payment_terms text,
  add column status text not null default 'open' check (status in ('open','processing','completed'));
-- (is_demo already exists on orders from 0001 — not added again.)

-- "No orphan PO": a PO may only exist against an APPROVED quote. quote_id is already NOT NULL,
-- so the rule that needs enforcing is the quote's status, which a CHECK cannot see.
create or replace function public.check_order_quote_approved()
returns trigger
language plpgsql
as $$
declare
  q public.quote_status;
begin
  select status into q from public.quotes where id = new.quote_id;
  if q is distinct from 'approved' then
    raise exception 'Order requires an approved quote; quote % is %', new.quote_id, coalesce(q::text, 'missing');
  end if;
  return new;
end;
$$;

create trigger order_requires_approved_quote
  before insert or update on public.orders
  for each row execute function public.check_order_quote_approved();

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  requirement_line_id uuid references public.requirement_lines(id),
  part_number text not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  delivery_schedule date,
  is_demo boolean not null default false
);

create table public.material_readiness (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  oem_id uuid not null references public.oems(id),
  part_number text not null,
  quantity_ready integer not null default 0 check (quantity_ready >= 0),
  manufacturing_status text not null default 'in_production'
    check (manufacturing_status in ('in_production','ready')),
  internal_qc_status text not null default 'pending'
    check (internal_qc_status in ('pending','approved')),
  batch_number text,
  serial_numbers text,
  tentative_pdi_date date,
  remarks text,
  is_demo boolean not null default false
);

alter table public.pdi_records
  add column part_number text,
  add column oem_id uuid references public.oems(id),
  add column customer_id uuid references public.customers(id),
  add column inspection_type text check (inspection_type in ('physical','vc','third_party')),
  add column agency text,
  add column inspection_date date,
  add column inspector text,
  add column rejection_reason text,
  add column re_pdi_required boolean not null default false,
  add column status text not null default 'pending'
    check (status in ('pending','passed','failed')),
  add column dispatch_clearance text not null default 'hold'
    check (dispatch_clearance in ('approved','hold'));

alter table public.oem_invoices
  add column invoice_date date,
  add column pdi_id uuid references public.pdi_records(id),
  add column customer_id uuid references public.customers(id),
  add column oem_id uuid references public.oems(id),
  add column part_number text,
  add column quantity_invoiced integer,
  add column invoice_type text check (invoice_type in ('full','partial')),
  add column balance_qty integer,
  add column net_amount numeric(14,2),
  add column gst_amount numeric(14,2),
  add column dispatch_date date,
  add column lr_awb text,
  add column courier text,
  add column eway_bill text,
  add column documents_submitted text,
  add column multiple_against_po boolean not null default false,
  add column status text not null default 'raised'
    check (status in ('raised','submitted','approved','paid'));

alter table public.payments
  add column payment_ref text,
  add column payment_terms text,
  add column mode text check (mode in ('rtgs','neft','wire','other')),
  add column proof_path text,
  add column followup_status text not null default 'pending'
    check (followup_status in ('pending','escalated','closed'));

alter table public.deliveries
  add column delivery_ref text,
  add column oem_invoice_id uuid references public.oem_invoices(id),
  add column location text,
  add column status text not null default 'in_transit'
    check (status in ('in_transit','delivered')),
  add column acceptance text check (acceptance in ('accepted','rejected')),
  add column grn_number text,
  add column pod_path text,
  add column closure_status text not null default 'pending'
    check (closure_status in ('pending','closed')),
  add column remarks text;

-- ---------------------------------------------------------------------------
-- Commission (only after the OEM-payment milestone)
-- ---------------------------------------------------------------------------

create table public.commission_invoices (
  id uuid primary key default gen_random_uuid(),
  commission_no text not null unique,
  oem_invoice_id uuid not null references public.oem_invoices(id),
  oem_id uuid not null references public.oems(id),
  customer_id uuid references public.customers(id),
  commission_pct numeric(6,2) not null check (commission_pct >= 0),
  base_amount numeric(14,2) not null check (base_amount >= 0),
  commission_amount numeric(14,2) not null check (commission_amount >= 0),
  gst_amount numeric(14,2) not null default 0,
  gross_value numeric(14,2) not null default 0,
  invoice_date date not null,
  due_date date,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid')),
  received_on date,
  tds_deducted boolean not null default false,
  outstanding_amount numeric(14,2),
  attachment_path text,
  remarks text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- The milestone rule, made structural: a commission invoice needs a real payment on its OEM invoice.
create or replace function public.check_commission_milestone()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.payments
    where oem_invoice_id = new.oem_invoice_id
  ) then
    raise exception 'Commission cannot be raised before the OEM-payment milestone (invoice %)',
      new.oem_invoice_id;
  end if;
  return new;
end;
$$;

create trigger commission_milestone
  before insert or update on public.commission_invoices
  for each row execute function public.check_commission_milestone();

-- ---------------------------------------------------------------------------
-- Audit + RLS for the new tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','customer_contacts','products','product_oems','order_lines',
    'material_readiness','commission_invoices'
  ] loop
    execute format('alter table public.%1$I enable row level security', t);
    execute format(
      'create policy owner_all on public.%1$I for all
       using (public.is_owner()) with check (public.is_owner())', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I
       for each row execute function public.write_audit()', t);
  end loop;
end $$;

create index order_lines_order_idx on public.order_lines(order_id);
create index material_readiness_order_idx on public.material_readiness(order_id);
create index oem_invoices_order_idx on public.oem_invoices(order_id);
create index payments_oem_invoice_idx on public.payments(oem_invoice_id);
create index commission_oem_invoice_idx on public.commission_invoices(oem_invoice_id);
create index products_part_idx on public.products using gin (part_number gin_trgm_ops);
