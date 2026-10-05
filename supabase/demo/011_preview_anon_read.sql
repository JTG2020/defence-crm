-- ============================================================================
-- 011 — PREVIEW MODE: let anonymous visitors READ the data, so the app is usable
--        without signing in (pair with AUTH_DISABLED=true).
--
-- WARNING: this exposes every row in these tables to anyone who has the URL.
-- Use it on a private or Deployment-Protected deployment only, and remove it when
-- the demo is over (statements at the bottom). It grants READ only; writes stay
-- denied, so the app's forms will report a permission error in preview.
-- audit_log and profiles are deliberately NOT opened.
-- Apply in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'requirements','requirement_lines','oems','oem_products','commitments','oem_requests',
    'quotes','quote_versions','quote_version_lines','orders','order_lines','order_stages',
    'pdi_records','deliveries','oem_invoices','payments','commission_invoices','documents','tasks'
  ] loop
    execute format('drop policy if exists anon_read on public.%I', t);
    execute format('create policy anon_read on public.%I for select to anon using (true)', t);
  end loop;
end $$;

-- Views are security_invoker, so the base-table policies above let anon read them too.
grant select on public.requirement_line_coverage to anon;
grant select on public.requirement_line_firm_by_oem to anon;
grant select on public.oem_product_capacity to anon;

-- ============================================================================
-- TO REVERSE (run this, and remove AUTH_DISABLED in Vercel):
--
-- do $$
-- declare
--   t text;
-- begin
--   foreach t in array array[
--     'requirements','requirement_lines','oems','oem_products','commitments','oem_requests',
--     'quotes','quote_versions','quote_version_lines','orders','order_lines','order_stages',
--     'pdi_records','deliveries','oem_invoices','payments','commission_invoices','documents','tasks'
--   ] loop
--     execute format('drop policy if exists anon_read on public.%I', t);
--   end loop;
-- end $$;
--
-- revoke select on public.requirement_line_coverage from anon;
-- revoke select on public.requirement_line_firm_by_oem from anon;
-- revoke select on public.oem_product_capacity from anon;
-- ============================================================================
