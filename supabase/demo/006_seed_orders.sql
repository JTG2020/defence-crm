-- ============================================================================
-- 006 — seed the post-quote chain for two approved quotes:
--       RFI-2026-001 (processing, PDI pending) and RFI-2026-007 (completed, delivered).
-- Run AFTER 003/004/005. Safe to re-run.
-- Adds: orders, order_lines, order_stages, pdi_records, deliveries.
-- ============================================================================

insert into public.orders
  (quote_id, requirement_id, po_number, po_date, po_value, status, partial_allowed,
   pdi_required, pdi_mode, payment_terms, is_demo)
select q.id, r.id, v.po_number, v.po_date::date, v.po_value, v.status, true, true, 'physical',
       '30 days', true
from (values
  ('RFI-2026-001','PO-HAL-2026-001','2026-08-12',49105000,'processing'),
  ('RFI-2026-007','PO-BEML-2026-007','2026-09-05',883200,'completed')
) as v(ref, po_number, po_date, po_value, status)
join public.requirements r on r.ref = v.ref
join public.quotes q on q.requirement_id = r.id
on conflict (po_number) do nothing;

insert into public.order_lines
  (order_id, requirement_line_id, part_number, quantity_ordered, unit_price, delivery_schedule, is_demo)
select o.id, l.id, l.part_number, v.quantity_ordered, v.unit_price, v.delivery_schedule::date, true
from (values
  ('PO-HAL-2026-001','PN-1001',1000,48300,'2026-10-30'),
  ('PO-HAL-2026-001','PN-1002',200,4025,'2026-10-30'),
  ('PO-BEML-2026-007','PN-7001',120,7360,'2026-10-10')
) as v(po_number, part_number, quantity_ordered, unit_price, delivery_schedule)
join public.orders o on o.po_number = v.po_number
join public.requirements r on r.id = o.requirement_id
join public.requirement_lines l on l.requirement_id = r.id and l.part_number = v.part_number
where not exists (
  select 1 from public.order_lines ol where ol.order_id = o.id and ol.part_number = v.part_number
);

insert into public.order_stages
  (order_id, stage, owner, expected_date, committed_date, completed_at, is_demo)
select o.id, v.stage, v.owner, nullif(v.expected_date,'')::date, nullif(v.committed_date,'')::date,
       nullif(v.completed_at,'')::timestamptz, true
from (values
  ('PO-HAL-2026-001','po_placed','Sales','2026-08-12','2026-08-12','2026-08-12'),
  ('PO-HAL-2026-001','in_production','Operations','2026-09-20','2026-09-30',''),
  ('PO-HAL-2026-001','ready','Operations','2026-10-05','2026-10-10',''),
  ('PO-HAL-2026-001','pdi','Operations','2026-10-18','2026-10-15',''),
  ('PO-HAL-2026-001','dispatch','Operations','2026-10-25','2026-10-30',''),
  ('PO-BEML-2026-007','po_placed','Sales','2026-09-05','2026-09-05','2026-09-05'),
  ('PO-BEML-2026-007','in_production','Operations','2026-09-15','2026-09-20','2026-09-18'),
  ('PO-BEML-2026-007','ready','Operations','2026-09-22','2026-09-25','2026-09-24'),
  ('PO-BEML-2026-007','pdi','Operations','2026-09-28','2026-09-30','2026-09-28'),
  ('PO-BEML-2026-007','dispatched','Operations','2026-10-03','2026-10-05','2026-10-03'),
  ('PO-BEML-2026-007','delivered','Operations','2026-10-05','2026-10-05','2026-10-05'),
  ('PO-BEML-2026-007','accepted','Sales','2026-10-07','2026-10-07','2026-10-06')
) as v(po_number, stage, owner, expected_date, committed_date, completed_at)
join public.orders o on o.po_number = v.po_number
where not exists (
  select 1 from public.order_stages s where s.order_id = o.id and s.stage = v.stage
);

insert into public.pdi_records
  (order_id, part_number, offered_qty, cleared_qty, rejected_qty, held,
   inspection_type, inspection_date, status, dispatch_clearance, is_demo)
select o.id, v.part_number, v.offered_qty, v.cleared_qty, v.rejected_qty, false,
       'physical', v.inspection_date::date, v.status, v.dispatch_clearance, true
from (values
  ('PO-HAL-2026-001','PN-1001',1000,0,0,'2026-10-12','pending','hold'),
  ('PO-BEML-2026-007','PN-7001',120,120,0,'2026-09-28','passed','approved')
) as v(po_number, part_number, offered_qty, cleared_qty, rejected_qty, inspection_date, status, dispatch_clearance)
join public.orders o on o.po_number = v.po_number
where not exists (
  select 1 from public.pdi_records p where p.order_id = o.id and p.part_number = v.part_number
);

insert into public.deliveries
  (order_id, quantity, delivered_on, delivery_ref, grn_number, status, acceptance, closure_status, is_demo)
select o.id, v.quantity, v.delivered_on::date, v.delivery_ref, v.grn_number,
       v.status, v.acceptance, v.closure_status, true
from (values
  ('PO-BEML-2026-007',120,'2026-10-05','DLV-001','GRN-001','delivered','accepted','closed')
) as v(po_number, quantity, delivered_on, delivery_ref, grn_number, status, acceptance, closure_status)
join public.orders o on o.po_number = v.po_number
where not exists (
  select 1 from public.deliveries d where d.order_id = o.id and d.delivery_ref = v.delivery_ref
);
