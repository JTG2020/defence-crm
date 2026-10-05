-- 0013_add_commitment.sql — record a firm or indicative OEM commitment against a line.
-- Computes the next shipment sequence for the (line, OEM) pair so multiple shipments do not
-- collide. The coverage view reads these rows, so coverage updates immediately.
-- SECURITY INVOKER: RLS applies to the caller.
-- Apply in the SQL editor after 0001-0012. STATUS: written, not yet applied.

create or replace function public.add_commitment(
  p_requirement_line_id uuid,
  p_oem_id uuid,
  p_kind public.commitment_kind,
  p_quantity integer,
  p_unit_price numeric,
  p_expected_date date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_seq integer;
  v_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Commitment quantity must be greater than zero';
  end if;

  select coalesce(max(shipment_seq), 0) + 1 into v_seq
  from public.commitments
  where requirement_line_id = p_requirement_line_id and oem_id = p_oem_id;

  insert into public.commitments
    (requirement_line_id, oem_id, kind, quantity, unit_price, expected_date, shipment_seq, is_demo)
  values
    (p_requirement_line_id, p_oem_id, p_kind, p_quantity, p_unit_price, p_expected_date, v_seq, false)
  returning id into v_id;

  return v_id;
end;
$$;
