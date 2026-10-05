-- 0010_raise_commission.sql — raise a commission invoice from an OEM invoice.
-- The commission percentage and GST are applied in SQL, so the money figure is computed in one
-- place. The check_commission_milestone trigger (0005) already forbids a commission invoice
-- before an OEM payment exists; this function adds a clearer message and computes the amounts.
-- SECURITY INVOKER: RLS applies to the caller.
-- NOTE: the commission rule is assumption A5, not client-confirmed. Implemented as stated.
-- Apply in the SQL editor after 0001-0009. STATUS: written, not yet applied.

create or replace function public.raise_commission_invoice(
  p_oem_invoice_id uuid,
  p_commission_no text,
  p_commission_pct numeric,
  p_invoice_date date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice public.oem_invoices;
  v_base numeric;
  v_commission numeric;
  v_gst numeric;
  v_gross numeric;
  v_id uuid;
begin
  select * into v_invoice from public.oem_invoices where id = p_oem_invoice_id;
  if v_invoice.id is null then
    raise exception 'OEM invoice % not found', p_oem_invoice_id;
  end if;
  if v_invoice.oem_id is null then
    raise exception 'The OEM invoice has no OEM, so a commission cannot be raised against it';
  end if;
  if not exists (select 1 from public.payments where oem_invoice_id = p_oem_invoice_id) then
    raise exception 'Commission cannot be raised before the OEM-payment milestone is met';
  end if;
  if p_commission_pct is null or p_commission_pct < 0 then
    raise exception 'Commission percentage must be zero or greater';
  end if;

  v_base := coalesce(v_invoice.gross_amount, 0);
  v_commission := round(v_base * p_commission_pct / 100.0, 2);
  v_gst := round(v_commission * 0.18, 2);
  v_gross := v_commission + v_gst;

  insert into public.commission_invoices
    (commission_no, oem_invoice_id, oem_id, commission_pct, base_amount, commission_amount,
     gst_amount, gross_value, invoice_date, payment_status, outstanding_amount, is_demo)
  values
    (p_commission_no, p_oem_invoice_id, v_invoice.oem_id, p_commission_pct, v_base, v_commission,
     v_gst, v_gross, p_invoice_date, 'pending', v_gross, false)
  returning id into v_id;

  return v_id;
end;
$$;
