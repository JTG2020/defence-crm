-- 0011_followup_tasks.sql — the follow-up reminder queue.
-- A re-runnable generator that turns stale records into tasks. Idempotent: every task carries a
-- dedupe_key with a unique index, so running it twice does not duplicate a task.
-- SECURITY INVOKER: RLS applies to the caller. If run by pg_cron it runs privileged, which is fine.
-- Apply in the SQL editor after 0001-0010. STATUS: written, not yet applied.

alter table public.tasks add column if not exists dedupe_key text;
create unique index if not exists tasks_dedupe_key_idx on public.tasks(dedupe_key);

create or replace function public.generate_followup_tasks()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer := 0;
  v_rows integer;
begin
  -- Quotes silent for 7 days
  insert into public.tasks (kind, title, owner_type, owner_id, due_date, dedupe_key, is_demo)
  select 'quote_followup',
         'Chase quote ' || coalesce(r.ref, q.id::text),
         'quote', q.id, current_date, 'quote:' || q.id || ':7d', false
  from public.quotes q
  join public.requirements r on r.id = q.requirement_id
  where q.status in ('draft', 'pending_approval')
    and q.created_at <= now() - interval '7 days'
  on conflict (dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  -- OEM requests with no response for 7 days
  insert into public.tasks (kind, title, owner_type, owner_id, due_date, dedupe_key, is_demo)
  select 'oem_followup',
         'Chase OEM response (' || o.name || ')',
         'oem_request', req.id, current_date, 'oemreq:' || req.id, false
  from public.oem_requests req
  join public.oems o on o.id = req.oem_id
  where req.responded_at is null
    and req.requested_at <= now() - interval '7 days'
  on conflict (dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  -- Invoices due within 7 days with an outstanding balance
  insert into public.tasks (kind, title, owner_type, owner_id, due_date, dedupe_key, is_demo)
  select 'payment_due',
         'Payment due on ' || i.invoice_no,
         'oem_invoice', i.id, i.due_date, 'invoice:' || i.id || ':' || i.due_date, false
  from public.oem_invoices i
  where i.due_date is not null
    and i.due_date <= current_date + 7
    and i.gross_amount > coalesce(
      (select sum(p.amount) from public.payments p where p.oem_invoice_id = i.id), 0)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  -- Documents expiring within 60 days (or already expired)
  insert into public.tasks (kind, title, owner_type, owner_id, due_date, dedupe_key, is_demo)
  select 'document_expiry',
         'Document expiring: ' || d.title,
         'document', d.id, d.expiry_date, 'doc:' || d.id || ':' || d.expiry_date, false
  from public.documents d
  where d.expiry_date is not null
    and d.expiry_date <= current_date + 60
  on conflict (dedupe_key) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  return v_count;
end;
$$;

-- To run it on a schedule, enable the pg_cron extension (Dashboard -> Database -> Extensions),
-- then run once:
--   select cron.schedule('generate-followups', '0 6 * * *',
--                        $$select public.generate_followup_tasks();$$);
-- and check with: select * from cron.job;
