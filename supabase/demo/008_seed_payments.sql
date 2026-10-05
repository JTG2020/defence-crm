-- ============================================================================
-- 008 — seed OEM invoices, partial payments and one commission invoice.
-- Run AFTER 003/004/006. Safe to re-run.
-- The commission invoice for OEMINV-002 exists only because that invoice has a payment;
-- the check_commission_milestone trigger allows nothing else.
-- ============================================================================

insert into public.oem_invoices
  (order_id, invoice_no, gross_amount, due_date, invoice_date, oem_id, status, is_demo)
select o.id, v.invoice_no, v.gross_amount, v.due_date::date, v.invoice_date::date, oem.id, v.status, true
from (values
  ('PO-HAL-2026-001','OEMINV-001',4500000,'2026-11-30','2026-10-10','submitted','OEM A'),
  ('PO-BEML-2026-007','OEMINV-002',800000,'2026-10-20','2026-10-04','paid','OEM E')
) as v(po_number, invoice_no, gross_amount, due_date, invoice_date, status, oem_name)
join public.orders o on o.po_number = v.po_number
join public.oems oem on oem.name = v.oem_name
where not exists (select 1 from public.oem_invoices i where i.invoice_no = v.invoice_no);

insert into public.payments (oem_invoice_id, amount, paid_on, mode, payment_ref, kind, is_demo)
select i.id, v.amount, v.paid_on::date, v.mode, v.payment_ref, 'oem_payment', true
from (values
  ('OEMINV-002',800000,'2026-10-08','rtgs','UTR-1001'),
  ('OEMINV-001',2000000,'2026-10-15','neft','UTR-1002')
) as v(invoice_no, amount, paid_on, mode, payment_ref)
join public.oem_invoices i on i.invoice_no = v.invoice_no
where not exists (select 1 from public.payments p where p.payment_ref = v.payment_ref);

insert into public.commission_invoices
  (commission_no, oem_invoice_id, oem_id, commission_pct, base_amount, commission_amount,
   gst_amount, gross_value, invoice_date, payment_status, outstanding_amount, is_demo)
select 'COMM-001', i.id, i.oem_id, 5, 800000, 40000, 7200, 47200, '2026-10-09'::date, 'pending', 47200, true
from public.oem_invoices i
where i.invoice_no = 'OEMINV-002'
  and not exists (select 1 from public.commission_invoices c where c.commission_no = 'COMM-001');
