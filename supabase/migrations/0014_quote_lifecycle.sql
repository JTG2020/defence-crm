-- 0014_quote_lifecycle.sql — create a draft quote from a requirement, and approve a quote.
-- Price source: the cheapest firm commitment on the line, else the cheapest OEM product price,
-- else 0; the recommended price is generated from it (0007) and the final price stays human.
-- SECURITY INVOKER: RLS applies to the caller.
-- Apply in the SQL editor after 0001-0013. STATUS: written, not yet applied.

create or replace function public.create_quote_for_requirement(
  p_requirement_id uuid,
  p_margin_pct numeric default 15
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quote uuid;
  v_version uuid;
begin
  if not exists (select 1 from public.requirements where id = p_requirement_id) then
    raise exception 'Requirement % not found', p_requirement_id;
  end if;
  if not exists (select 1 from public.requirement_lines where requirement_id = p_requirement_id) then
    raise exception 'The requirement has no line items to quote';
  end if;

  insert into public.quotes (requirement_id, status, current_version, is_demo)
  values (p_requirement_id, 'draft', 1, false)
  returning id into v_quote;

  insert into public.quote_versions (quote_id, version_no, status, is_demo)
  values (v_quote, 1, 'draft', false)
  returning id into v_version;

  insert into public.quote_version_lines
    (quote_version_id, requirement_line_id, oem_price, lead_time_days, target_margin_pct, is_demo)
  select
    v_version,
    l.id,
    coalesce(
      (select min(c.unit_price) from public.commitments c
        where c.requirement_line_id = l.id and c.kind = 'firm'),
      (select min(op.unit_price) from public.oem_products op where op.part_number = l.part_number),
      0
    ),
    coalesce(
      (select min(op.lead_time_days) from public.oem_products op where op.part_number = l.part_number),
      0
    ),
    p_margin_pct,
    false
  from public.requirement_lines l
  where l.requirement_id = p_requirement_id;

  update public.requirements set status = 'quoted' where id = p_requirement_id and status = 'received';

  return v_quote;
end;
$$;

create or replace function public.approve_quote(p_quote_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_version integer;
begin
  select current_version into v_version from public.quotes where id = p_quote_id;
  if v_version is null then
    raise exception 'Quote % not found', p_quote_id;
  end if;

  update public.quotes set status = 'approved' where id = p_quote_id;
  update public.quote_versions
     set status = 'approved', approved_at = now()
   where quote_id = p_quote_id and version_no = v_version;
end;
$$;
