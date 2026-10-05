-- ============================================================================
-- BLOCK 2 — realistic demo data for a defence contract CRM.
-- Run after BLOCK 1. Safe to re-run (ON CONFLICT DO NOTHING).
-- Customer names are the anonymised placeholders used in the client's own
-- workbooks (HAL / BEL / BEML / DRDO); change them before any real use.
-- ============================================================================

insert into public.requirements (ref, customer, status, submission_deadline, notes) values
  ('RFI-2026-001', 'HAL',   'won',        '2026-08-15', 'Hydraulic actuator assembly PN-1001, qty 1000; firm cover OEM A 600 + OEM B 400.'),
  ('RFI-2026-002', 'BEL',   'lost',       '2026-08-28', 'Power supply module PN-4001, qty 400; lost on price.'),
  ('RFI-2026-003', 'HAL',   'quoted',     '2026-09-30', 'Servo drive unit PN-2002, qty 500; 300 firm + 200 indicative, uncovered 200.'),
  ('RFI-2026-004', 'BEML',  'submitted',  '2026-10-20', 'Power supply module PN-4001, qty 400; fully covered by OEM B.'),
  ('RFI-2026-005', 'BEL',   'received',   '2026-11-05', 'Signal conditioner PN-3003, qty 250; only an indication so far.'),
  ('RFI-2026-006', 'DRDO',  'qualifying', '2026-10-12', 'Hydraulic actuator assembly PN-1001, qty 600; two shipments from OEM A.'),
  ('RFI-2026-007', 'BEML',  'won',        '2026-09-10', 'Test bench harness PN-7001, qty 120 sets; PDI cleared.'),
  ('RFI-2026-008', 'BEL',   'lost',       '2026-09-22', 'Optical sight bracket PN-8001, qty 80; technical non-compliance.'),
  ('RFI-2026-009', 'HAL',   'cancelled',  '2026-10-01', 'Cable loom assembly PN-9001, qty 500; requirement withdrawn.'),
  ('RFI-2026-010', 'DRDO',  'submitted',  '2026-11-18', 'Power supply module PN-4001, qty 100; awaiting tender result.'),
  ('RFI-2026-011', 'BEL',   'quoted',     '2026-10-25', 'Servo drive unit PN-2002, qty 300; 120 firm, 150 indicative, uncovered 180.'),
  ('RFI-2026-012', 'HAL',   'lost',       '2026-10-30', 'Machined housing PN-1201, qty 900; competitor preference.')
on conflict (ref) do nothing;

-- Check what landed:
-- select ref, customer, status, submission_deadline from public.requirements order by ref;
