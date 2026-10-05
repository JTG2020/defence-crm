-- ============================================================================
-- 003 — seed the REAL public.requirements table (created by 0001_schema.sql).
-- Run in the SQL editor after 0001-0005. Safe to re-run (ON CONFLICT DO NOTHING).
-- Customer names are the anonymised placeholders from the client's own workbooks.
-- The signed-in role must be owner (or a role whose policy allows read) to see these.
-- ============================================================================

insert into public.requirements
  (ref, customer, status, submission_deadline, loss_reason, notes, is_demo)
values
  ('RFI-2026-001', 'HAL',   'won',        '2026-08-15', null,                       'Hydraulic actuator assembly PN-1001, qty 1000; firm cover OEM A 600 + OEM B 400.', true),
  ('RFI-2026-002', 'BEL',   'lost',       '2026-08-28', 'price',                    'Power supply module PN-4001, qty 400; lost on price.', true),
  ('RFI-2026-003', 'HAL',   'quoted',     '2026-09-30', null,                       'Servo drive unit PN-2002, qty 500; 300 firm + 200 indicative, uncovered 200.', true),
  ('RFI-2026-004', 'BEML',  'submitted',  '2026-10-20', null,                       'Power supply module PN-4001, qty 400; fully covered by OEM B.', true),
  ('RFI-2026-005', 'BEL',   'received',   '2026-11-05', null,                       'Signal conditioner PN-3003, qty 250; only an indication so far.', true),
  ('RFI-2026-006', 'DRDO',  'qualifying', '2026-10-12', null,                       'Hydraulic actuator assembly PN-1001, qty 600; two shipments from OEM A.', true),
  ('RFI-2026-007', 'BEML',  'won',        '2026-09-10', null,                       'Test bench harness PN-7001, qty 120 sets; PDI cleared.', true),
  ('RFI-2026-008', 'BEL',   'lost',       '2026-09-22', 'technical_non_compliance', 'Optical sight bracket PN-8001, qty 80; technical non-compliance.', true),
  ('RFI-2026-009', 'HAL',   'cancelled',  '2026-10-01', null,                       'Cable loom assembly PN-9001, qty 500; requirement withdrawn.', true),
  ('RFI-2026-010', 'DRDO',  'submitted',  '2026-11-18', null,                       'Power supply module PN-4001, qty 100; awaiting tender result.', true),
  ('RFI-2026-011', 'BEL',   'quoted',     '2026-10-25', null,                       'Servo drive unit PN-2002, qty 300; 120 firm, 150 indicative, uncovered 180.', true),
  ('RFI-2026-012', 'HAL',   'lost',       '2026-10-30', 'competitor_preference',    'Machined housing PN-1201, qty 900; competitor preference.', true)
on conflict (ref) do nothing;

-- Check: select ref, customer, status from public.requirements order by ref;   -- expect 12 rows
