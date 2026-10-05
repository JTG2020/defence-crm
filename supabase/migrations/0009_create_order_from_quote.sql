-- 0009_create_order_from_quote.sql — turn an APPROVED quote into an order and its lines, atomically.
-- The "no orphan PO" rule: only an approved quote can become an order. The orders trigger
-- enforces it too, but this gives a clear message and copies the lines in one transaction.
-- SECURITY INVOKER: RLS applies to the caller.
-- Apply in the SQL editor after 0001-0008. STATUS: written, not yet applied.

create or replace function public.create_order_from_quote(
  p_quote_id uuid,
  p_po_number text,
  p_po_date date,
  p_po_value numeric
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quote public.quotes;
  v_order_id uuid;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if v_quote.id is null then
    raise exception 'Quote % not found', p_quote_id;
  end if;
  if v_quote.status <> 'approved' then
    raise exception 'Only an approved quote can become an order (this quote is %)', v_quote.status;
  end if;

  if exists (
    select 1
    from public.quote_versions qv
    join public.quote_version_lines qvl on qvl.quote_version_id = qv.id
    where qv.quote_id = p_quote_id
      and qv.version_no = v_quote.current_version
      and qvl.final_price is null
  ) then
    raise exception 'Every quote line needs a final price before an order can be created';
  end if;

  insert into public.orders
    (quote_id, requirement_id, po_number, po_date, po_value, status,
     partial_allowed, pdi_required, is_demo)
  values
    (p_quote_id, v_quote.requirement_id, p_po_number, p_po_date, p_po_value, 'processing',
     true, true, false)
  returning id into v_order_id;

  insert into public.order_lines
    (order_id, requirement_line_id, part_number, quantity_ordered, unit_price, is_demo)
  select v_order_id, qvl.requirement_line_id, rl.part_number, rl.quantity, qvl.final_price, false
  from public.quote_versions qv
  join public.quote_version_lines qvl on qvl.quote_version_id = qv.id
  join public.requirement_lines rl on rl.id = qvl.requirement_line_id
  where qv.quote_id = p_quote_id and qv.version_no = v_quote.current_version;

  if not exists (select 1 from public.order_lines where order_id = v_order_id) then
    raise exception 'The approved quote has no line items to order';
  end if;

  return v_order_id;
end;
$$;
