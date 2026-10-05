-- 0003_audit.sql — append-only audit trail + the deadline guard.
-- STATUS: written, NOT applied.
-- The audit function is SECURITY DEFINER so a signed-in user can write an audit row without
-- holding INSERT rights on audit_log. actor is always auth.uid(); no app code supplies it.

create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id text;
begin
  row_id := coalesce(
    (to_jsonb(new) ->> 'id'),
    (to_jsonb(old) ->> 'id')
  );
  insert into public.audit_log(entity_type, entity_id, action, before, after, actor)
  values (
    tg_table_name,
    row_id,
    lower(tg_op),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

-- Attach the trigger to every material table. Extend this list as tables are added.
do $$
declare
  t text;
begin
  foreach t in array array[
    'requirements','requirement_lines','oems','oem_products','commitments','oem_requests',
    'quotes','quote_versions','quote_version_lines','orders','order_stages','pdi_records',
    'deliveries','oem_invoices','payments','documents','approvals'
  ] loop
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I
       for each row execute function public.write_audit()', t);
  end loop;
end $$;

-- deadline >= requirement.submission_deadline (Postgres forbids a subquery in CHECK).
create or replace function public.check_line_deadline()
returns trigger
language plpgsql
as $$
declare
  sub date;
begin
  select submission_deadline into sub
  from public.requirements where id = new.requirement_id;
  if new.deadline < sub then
    raise exception 'Line deadline % is before submission deadline %', new.deadline, sub;
  end if;
  return new;
end;
$$;

create trigger requirement_lines_deadline
  before insert or update on public.requirement_lines
  for each row execute function public.check_line_deadline();
