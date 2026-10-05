-- 0008_create_requirement.sql — create a requirement and its lines atomically.
-- Why a function: the header plus lines must save together or not at all. Two REST calls can
-- leave a header with no lines if the second fails; one function is one transaction.
-- SECURITY INVOKER (the default) means RLS applies to the caller, so a user who cannot insert
-- requirements cannot insert them through this function either.
-- Apply in the SQL editor after 0001-0007. STATUS: written, not yet applied.

create or replace function public.create_requirement_with_lines(
  p_ref text,
  p_customer text,
  p_status public.requirement_status,
  p_submission_deadline date,
  p_lines jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_line jsonb;
  v_no integer := 0;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'A requirement needs at least one line item';
  end if;

  insert into public.requirements (ref, customer, status, submission_deadline, is_demo)
  values (p_ref, p_customer, p_status, p_submission_deadline, false)
  returning id into v_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_no := v_no + 1;
    insert into public.requirement_lines
      (requirement_id, line_no, part_number, description, quantity, uom, deadline, is_demo)
    values (
      v_id,
      v_no,
      v_line ->> 'part_number',
      coalesce(v_line ->> 'description', ''),
      (v_line ->> 'quantity')::integer,
      v_line ->> 'uom',
      (v_line ->> 'deadline')::date,
      false
    );
  end loop;

  return v_id;
end;
$$;
