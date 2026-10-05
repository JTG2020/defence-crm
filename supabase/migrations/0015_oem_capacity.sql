-- 0015_oem_capacity.sql — A1: OEM capacity as explicit data plus a configuration flag.
-- A1 (docs/ASSUMPTIONS.md): capacity is a GLOBAL pool — available = declared − all firm commitments.
-- If Ram overturns that, it is a flag, not a rewrite: `oems.capacity_shared` says whether capacity
-- is shared across all orders (global) or separate to each order.
-- Declared capacity is per OEM product; `available` and `over_committed` are derived here, never
-- stored. Products with no declared capacity report NULL available (unknown) and are never flagged.
-- SECURITY INVOKER: RLS applies to the caller.
-- Apply in the SQL editor after 0001-0014. STATUS: written, not yet applied.

alter table public.oem_products
  add column if not exists declared_capacity integer
  check (declared_capacity is null or declared_capacity >= 0);

alter table public.oems
  add column if not exists capacity_shared boolean not null default true;

create or replace view public.oem_product_capacity
with (security_invoker = true) as
select
  op.id as oem_product_id,
  op.oem_id,
  op.part_number,
  op.declared_capacity,
  coalesce(sum(c.quantity) filter (where rl.id is not null), 0)::int as firm_committed,
  case
    when op.declared_capacity is null then null
    else greatest(
      op.declared_capacity - coalesce(sum(c.quantity) filter (where rl.id is not null), 0), 0
    )::int
  end as available,
  case
    when op.declared_capacity is null then 0
    else greatest(
      coalesce(sum(c.quantity) filter (where rl.id is not null), 0) - op.declared_capacity, 0
    )::int
  end as over_committed
from public.oem_products op
left join public.commitments c
  on c.oem_id = op.oem_id and c.kind = 'firm'
left join public.requirement_lines rl
  on rl.id = c.requirement_line_id and rl.part_number = op.part_number
group by op.id, op.oem_id, op.part_number, op.declared_capacity;
