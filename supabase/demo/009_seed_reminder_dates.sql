-- ============================================================================
-- 009 — nudge two dates so the reminder generator has something to find:
--       one invoice due within the window, with an outstanding balance.
-- Run AFTER 008. Safe to re-run.
-- ============================================================================

update public.oem_invoices set due_date = '2026-10-08' where invoice_no = 'OEMINV-001';
update public.oem_invoices set due_date = '2026-06-30' where invoice_no = 'OEMINV-002';
