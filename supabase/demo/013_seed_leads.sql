-- ============================================================================
-- 013 — demo leads captured from calls, WhatsApp and referrals, so the Leads
--        screen and "Lead follow-ups due today" have something to show.
-- Run AFTER 0016. Safe to re-run (matched on name + phone).
-- ============================================================================

insert into public.leads (source, name, company, phone, product_note, stage, next_follow_up, owner, is_demo)
select v.source::lead_source, v.name, v.company, v.phone, v.note, v.stage::lead_stage,
       v.next_follow_up::date, v.owner, true
from (values
  ('call','Ramesh Iyer','Bharat Dynamics','+91 98100 11223','Enquiry for actuator spares','contacted','2026-10-05','Ram'),
  ('whatsapp','Sunita Rao','Ashok Leyland Defence','+91 99400 55667','Wants a quote for power supplies','qualified','2026-10-05','Ram'),
  ('referral','Col. Menon (retd)','','+91 98450 77889','Referred by BEL; HVAC for shelters','new','2026-10-04','Ram'),
  ('call','Anil Kumar','','+91 90000 33445','Follow up on servo drive pricing','contacted','2026-10-08','Ram'),
  ('gem','GeM tender 2026/8891','','','Power module tender','quoted','2026-10-12','Ram'),
  ('portal','HAL portal enquiry','HAL','','Encoders, qty 150','new','2026-10-06','Ram'),
  ('referral','Deepa Nair','Tata Advanced Systems','+91 98200 66554','Referral: cable looms','qualified','2026-10-20','Ram'),
  ('direct','Walk-in enquiry','','','General capability discussion','won',null,'Ram')
) as v(source, name, company, phone, note, stage, next_follow_up, owner)
where not exists (
  select 1 from public.leads l where l.name = v.name and coalesce(l.phone, '') = coalesce(v.phone, '')
);

-- Check: select source, name, stage, next_follow_up from public.leads order by next_follow_up nulls last;
