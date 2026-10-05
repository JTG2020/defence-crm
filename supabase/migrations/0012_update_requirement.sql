-- 0012_update_requirement.sql — edit a requirement header and its lines in one transaction.
-- Existing lines are updated in place (by id); new lines (no id) are appended. Deleting a line is
-- deliberately not offered yet, because commitments and quote lines reference line ids.
-- SECURITY INVOKER: RLS applies to the caller.
-- Apply in the SQL editor after 0001-0011. STATUS: written, not yet applied.

create or replace function public.update_requirement_with_lines(
  p_id uuid,
  p_ref text,
  p_customer text,
  p_status public.requirement_status,
  p_submission_deadline date,
  p_loss_reason public.loss_reason,
  p_notes text,
  p_lines jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_line jsonb;
  v_no integer;
begin
  update public.requirements
     set ref = p_ref,
         customer = p_customer,
         status = p_status,
         submission_deadline = p_submission_deadline,
         loss_reason = p_loss_reason,
         notes = p_notes
   where id = p_id;
  if not found then
    raise exception 'Requirement % not found', p_id;
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'A requirement needs at least one line item';
  end if;

  select coalesce(max(line_no), 0) into v_no
  from public.requirement_lines where requirement_id = p_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    if (v_line ->> 'id') is not null and (v_line ->> 'id') <> '' then
      update public.requirement_lines
         set part_number = v_line ->> 'part_number',
             description = coalesce(v_line ->> 'description', ''),
             quantity = (v_line ->> 'quantity')::integer,
             uom = v_line ->> 'uom',
             deadline = (v_line ->> 'deadline')::date
       where id = (v_line ->> 'id')::uuid and requirement_id = p_id;
      if not found then
        raise exception 'Line % does not belong to this requirement', v_line ->> 'id';
      end if;
    else
      v_no := v_no + 1;
      insert into public.requirement_lines
        (requirement_id, line_no, part_number, description, quantity, uom, deadline, is_demo)
      values (
        p_id, v_no, v_line ->> 'part_number', coalesce(v_line ->> 'description', ''),
        (v_line ->> 'quantity')::integer, v_line ->> 'uom', (v_line ->> 'deadline')::date, false
      );
    end if;
  end loop;
end;
$$;
