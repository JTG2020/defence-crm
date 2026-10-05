-- ============================================================================
-- 004 — seed the related tables for the 12 requirements from 003.
-- Run AFTER 003 (it references the requirements by ref). Safe to re-run.
-- Adds: oems, oem_products, requirement_lines, commitments, oem_requests.
-- Coverage is not stored here: the requirement_line_coverage view derives it.
-- ============================================================================

-- OEM master (guard against duplicates: no unique constraint on name)
insert into public.oems (name, approval_status, lead_time_days, capabilities, is_demo)
select v.name, v.approval_status::oem_approval_status, v.lead_time_days, v.capabilities, true
from (values
  ('OEM A','approved',45,array['Hydraulics','Actuators','Seals']),
  ('OEM B','approved',30,array['Electronics','Power supplies','Encoders']),
  ('OEM C','conditional',60,array['Servo drives','Motion control']),
  ('OEM D','not_approved',90,array['Optics','Machining']),
  ('OEM E','approved',20,array['Cable assemblies','Harnesses'])
) as v(name, approval_status, lead_time_days, capabilities)
where not exists (select 1 from public.oems o where o.name = v.name);

-- OEM products
insert into public.oem_products (oem_id, part_number, description, unit_price, lead_time_days, is_demo)
select o.id, v.part_number, v.description, v.unit_price, v.lead_time_days, true
from (values
  ('OEM A','PN-1001','Hydraulic actuator assembly',42000,45),
  ('OEM A','PN-1002','Seal kit, high pressure',3500,30),
  ('OEM A','PN-2002','Servo drive unit',51000,60),
  ('OEM B','PN-1001','Hydraulic actuator assembly (licensed)',44500,30),
  ('OEM B','PN-2002','Servo drive unit',49500,45),
  ('OEM B','PN-2003','Feedback encoder',7800,25),
  ('OEM B','PN-4001','Power supply module',16500,30),
  ('OEM C','PN-2002','Servo drive unit',52000,60),
  ('OEM C','PN-3003','Signal conditioner',9200,55),
  ('OEM E','PN-7001','Test bench harness',6400,20),
  ('OEM E','PN-9001','Cable loom assembly',2100,20)
) as v(oem_name, part_number, description, unit_price, lead_time_days)
join public.oems o on o.name = v.oem_name
on conflict (oem_id, part_number) do nothing;

-- Requirement lines (deadline must be >= the requirement's submission deadline)
insert into public.requirement_lines
  (requirement_id, line_no, part_number, description, quantity, uom, deadline, is_demo)
select r.id, v.line_no, v.part_number, v.description, v.quantity, v.uom, v.deadline::date, true
from (values
  ('RFI-2026-001',1,'PN-1001','Hydraulic actuator assembly',1000,'nos','2026-09-30'),
  ('RFI-2026-001',2,'PN-1002','Seal kit, high pressure',200,'nos','2026-09-30'),
  ('RFI-2026-002',1,'PN-2001','Control valve, 4-way',300,'nos','2026-10-10'),
  ('RFI-2026-003',1,'PN-2002','Servo drive unit',500,'nos','2026-10-25'),
  ('RFI-2026-003',2,'PN-2003','Feedback encoder',150,'nos','2026-10-25'),
  ('RFI-2026-004',1,'PN-4001','Power supply module',400,'nos','2026-11-10'),
  ('RFI-2026-005',1,'PN-3003','Signal conditioner',250,'nos','2026-11-25'),
  ('RFI-2026-006',1,'PN-1001','Hydraulic actuator assembly',600,'nos','2026-11-01'),
  ('RFI-2026-007',1,'PN-7001','Test bench harness',120,'sets','2026-10-15'),
  ('RFI-2026-008',1,'PN-8001','Optical sight bracket',80,'nos','2026-10-20'),
  ('RFI-2026-009',1,'PN-9001','Cable loom assembly',500,'nos','2026-10-20'),
  ('RFI-2026-010',1,'PN-4001','Power supply module',100,'nos','2026-12-05'),
  ('RFI-2026-011',1,'PN-2002','Servo drive unit',300,'nos','2026-11-20'),
  ('RFI-2026-012',1,'PN-1201','Machined housing',900,'nos','2026-11-15')
) as v(ref, line_no, part_number, description, quantity, uom, deadline)
join public.requirements r on r.ref = v.ref
on conflict (requirement_id, line_no) do nothing;

-- Commitments: firm and indicative as separate facts
insert into public.commitments
  (requirement_line_id, oem_id, kind, quantity, unit_price, expected_date, shipment_seq, is_demo)
select l.id, o.id, v.kind::commitment_kind, v.quantity, v.unit_price, v.expected_date::date, v.shipment_seq, true
from (values
  ('RFI-2026-001',1,'OEM A','firm',600,42000,'2026-09-20',1),
  ('RFI-2026-001',1,'OEM B','firm',400,44500,'2026-09-25',1),
  ('RFI-2026-001',2,'OEM A','firm',200,3500,'2026-09-18',1),
  ('RFI-2026-003',1,'OEM A','firm',300,51000,'2026-10-20',1),
  ('RFI-2026-003',1,'OEM C','indicative',200,52000,'2026-10-22',1),
  ('RFI-2026-003',2,'OEM B','firm',150,7800,'2026-10-18',1),
  ('RFI-2026-004',1,'OEM B','firm',400,16500,'2026-11-05',1),
  ('RFI-2026-006',1,'OEM A','firm',300,42000,'2026-10-25',1),
  ('RFI-2026-006',1,'OEM A','firm',300,42000,'2026-11-05',2),
  ('RFI-2026-007',1,'OEM E','firm',120,6400,'2026-10-10',1),
  ('RFI-2026-010',1,'OEM B','firm',100,16500,'2026-12-01',1),
  ('RFI-2026-011',1,'OEM B','firm',120,49500,'2026-11-10',1),
  ('RFI-2026-011',1,'OEM C','indicative',150,52000,'2026-11-15',1),
  ('RFI-2026-012',1,'OEM A','indicative',900,42000,'2026-11-20',1)
) as v(ref, line_no, oem_name, kind, quantity, unit_price, expected_date, shipment_seq)
join public.requirements r on r.ref = v.ref
join public.requirement_lines l on l.requirement_id = r.id and l.line_no = v.line_no
join public.oems o on o.name = v.oem_name
on conflict (requirement_line_id, oem_id, shipment_seq) do nothing;

-- OEM requests (requested / responded)
insert into public.oem_requests (requirement_line_id, oem_id, requested_at, responded_at, is_demo)
select l.id, o.id, v.requested_at::timestamptz, nullif(v.responded_at, '')::timestamptz, true
from (values
  ('RFI-2026-001',1,'OEM A','2026-08-02','2026-08-05'),
  ('RFI-2026-001',1,'OEM B','2026-08-02','2026-08-09'),
  ('RFI-2026-003',1,'OEM A','2026-09-01','2026-09-04'),
  ('RFI-2026-003',1,'OEM C','2026-09-01',''),
  ('RFI-2026-005',1,'OEM C','2026-09-20',''),
  ('RFI-2026-011',1,'OEM B','2026-09-15','2026-09-18'),
  ('RFI-2026-011',1,'OEM C','2026-09-15','')
) as v(ref, line_no, oem_name, requested_at, responded_at)
join public.requirements r on r.ref = v.ref
join public.requirement_lines l on l.requirement_id = r.id and l.line_no = v.line_no
join public.oems o on o.name = v.oem_name
on conflict (requirement_line_id, oem_id) do nothing;

-- Check coverage straight from the view:
-- select r.ref, l.line_no, c.required_qty, c.firm_committed_qty, c.indicative_qty, c.uncovered_qty, c.state
-- from public.requirement_line_coverage c
-- join public.requirement_lines l on l.id = c.requirement_line_id
-- join public.requirements r on r.id = l.requirement_id
-- order by r.ref, l.line_no;
