-- 0002_views.sql — the single source of truth for coverage and pricing.
-- STATUS: written, NOT applied.
-- Every view is security_invoker so the querying user's RLS applies (docs/TECH-STACK.md).

create or replace view public.requirement_line_coverage
with (security_invoker = true) as
with firm as (
  select requirement_line_id, sum(quantity)::int as qty
  from public.commitments where kind = 'firm'
  group by requirement_line_id
),
ind as (
  select requirement_line_id, sum(quantity)::int as qty
  from public.commitments where kind = 'indicative'
  group by requirement_line_id
)
select
  l.id as requirement_line_id,
  l.quantity as required_qty,
  coalesce(f.qty, 0) as firm_committed_qty,
  coalesce(i.qty, 0) as indicative_qty,
  greatest(l.quantity - coalesce(f.qty, 0), 0) as uncovered_qty,
  greatest(coalesce(f.qty, 0) - l.quantity, 0) as over_committed_qty,
  case
    when l.quantity - coalesce(f.qty, 0) <= 0 then 'covered'::coverage_state
    when coalesce(f.qty, 0) > 0 then 'partly_covered'::coverage_state
    else 'no_cover'::coverage_state
  end as state
from public.requirement_lines l
left join firm f on f.requirement_line_id = l.id
left join ind i on i.requirement_line_id = l.id;

create or replace view public.requirement_line_firm_by_oem
with (security_invoker = true) as
select requirement_line_id, oem_id, sum(quantity)::int as quantity
from public.commitments
where kind = 'firm'
group by requirement_line_id, oem_id;

-- Recommended price is ADVISORY and derived only from OEM price + target margin.
-- final_price is never written by this function; it stays a human field.
create or replace function public.recommended_price(oem_price numeric, margin_pct numeric)
returns numeric
language sql
immutable
as $$
  select round(oem_price * (1 + margin_pct / 100.0), 2)
$$;
