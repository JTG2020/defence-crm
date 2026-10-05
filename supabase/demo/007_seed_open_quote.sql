-- ============================================================================
-- 007 — an APPROVED quote with no order yet, so the "create order" write path has
--       something to convert. (RFI-2026-001 and 007 already have orders.)
-- Run AFTER 003/004/005. Safe to re-run.
-- ============================================================================

insert into public.quotes (requirement_id, status, current_version, is_demo, created_at)
select r.id, 'approved', 1, true, '2026-10-02'::timestamptz
from public.requirements r
where r.ref = 'RFI-2026-004'
  and not exists (select 1 from public.quotes q where q.requirement_id = r.id);

insert into public.quote_versions (quote_id, version_no, status, approved_at, is_demo)
select q.id, 1, 'approved', '2026-10-02'::timestamptz, true
from public.quotes q
join public.requirements r on r.id = q.requirement_id
where r.ref = 'RFI-2026-004'
on conflict (quote_id, version_no) do nothing;

insert into public.quote_version_lines
  (quote_version_id, requirement_line_id, oem_price, lead_time_days, target_margin_pct, final_price, is_demo)
select qv.id, l.id, 16500, 30, 15, 19000, true
from public.quote_versions qv
join public.quotes q on q.id = qv.quote_id
join public.requirements r on r.id = q.requirement_id
join public.requirement_lines l on l.requirement_id = r.id and l.part_number = 'PN-4001'
where r.ref = 'RFI-2026-004' and qv.version_no = 1
on conflict (quote_version_id, requirement_line_id) do nothing;
