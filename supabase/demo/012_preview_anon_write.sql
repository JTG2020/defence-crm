-- ============================================================================
-- 012 — PREVIEW MODE: let anonymous visitors READ, INSERT and UPDATE (judging demo).
--        Pair with AUTH_DISABLED=true so there is no sign-in. Supersedes 011 (includes read).
--
-- WARNING: anyone who has the URL can read AND change these rows. Use it on a private or
-- Deployment-Protected deployment, on demo data, and remove it when judging is over.
-- No DELETE policy is created: the app has no delete actions, so nobody can remove rows.
-- audit_log and profiles stay closed.
--
-- Why read is included: the RPCs insert with `returning id`, and RETURNING is governed by the
-- read policy. Without a select policy the RPCs would insert nothing usable.
-- Apply in the Supabase SQL editor after 0001-0015. Safe to re-run.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'requirements','requirement_lines','oems','oem_products','commitments','oem_requests',
    'quotes','quote_versions','quote_version_lines','orders','order_lines','pdi_records',
    'deliveries','payments','commission_invoices','tasks'
  ] loop
    -- privileges (RLS is the row filter on top of these)
    execute format('grant select, insert, update on public.%I to anon', t);

    execute format('drop policy if exists anon_read on public.%I', t);
    execute format('create policy anon_read on public.%I for select to anon using (true)', t);

    execute format('drop policy if exists anon_insert on public.%I', t);
    execute format('create policy anon_insert on public.%I for insert to anon with check (true)', t);

    execute format('drop policy if exists anon_update on public.%I', t);
    execute format('create policy anon_update on public.%I for update to anon using (true) with check (true)', t);
  end loop;
end $$;

-- Views are security_invoker, so the base-table policies above let anon read them.
grant select on public.requirement_line_coverage to anon;
grant select on public.requirement_line_firm_by_oem to anon;
grant select on public.oem_product_capacity to anon;

-- After applying, restore the demo to a clean state with:
--   supabase/demo/003 .. 010   (the seeds are idempotent; re-running tops data back up)
-- or, for a full wipe:
--   supabase/reset.sql then supabase/apply_all.sql then supabase/demo/003 .. 010

-- ============================================================================
-- TO REVERSE (run this, and remove AUTH_DISABLED in Vercel):
--
-- do $$
-- declare
--   t text;
-- begin
--   foreach t in array array[
--     'requirements','requirement_lines','oems','oem_products','commitments','oem_requests',
--     'quotes','quote_versions','quote_version_lines','orders','order_lines','pdi_records',
--     'deliveries','payments','commission_invoices','tasks'
--   ] loop
--     execute format('drop policy if exists anon_read on public.%I', t);
--     execute format('drop policy if exists anon_insert on public.%I', t);
--     execute format('drop policy if exists anon_update on public.%I', t);
--     execute format('revoke insert, update on public.%I from anon', t);
--   end loop;
-- end $$;
--
-- revoke select on public.requirement_line_coverage from anon;
-- revoke select on public.requirement_line_firm_by_oem from anon;
-- revoke select on public.oem_product_capacity from anon;
-- ============================================================================
