-- ============================================================================
-- 010 — declared OEM capacity (A1). Run AFTER 004 and 0015. Safe to re-run.
-- Values are chosen to exercise the model: most products have available headroom,
-- and OEM B / PN-4001 is deliberately OVER capacity (firm 500 vs declared 400) so
-- the requirement screen shows the over-commitment warning.
-- ============================================================================

update public.oem_products op
   set declared_capacity = v.cap
from (values
  ('OEM A','PN-1001',1500),
  ('OEM A','PN-1002', 300),
  ('OEM B','PN-1001', 500),
  ('OEM B','PN-2002', 300),
  ('OEM B','PN-2003', 200),
  ('OEM B','PN-4001', 400),
  ('OEM C','PN-2002', 200),
  ('OEM C','PN-3003', 250),
  ('OEM E','PN-7001', 200),
  ('OEM E','PN-9001', 500)
) as v(oem_name, part_number, cap)
join public.oems o on o.name = v.oem_name
where op.oem_id = o.id and op.part_number = v.part_number;

-- Check: select oem_id, part_number, declared_capacity, firm_committed, available, over_committed
--        from public.oem_product_capacity order by oem_id, part_number;
