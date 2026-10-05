-- reset.sql — remove everything the migrations create, for a clean re-run.
-- Use in the Supabase SQL editor before re-applying supabase/apply_all.sql.
-- Safe to run even if nothing exists (every statement is IF EXISTS).
-- Does NOT drop the pgcrypto / pg_trgm extensions (other things may use them).

drop view if exists public.requirement_line_coverage cascade;
drop view if exists public.requirement_line_firm_by_oem cascade;

drop table if exists public.commission_invoices cascade;
drop table if exists public.product_oems cascade;
drop table if exists public.products cascade;
drop table if exists public.customer_contacts cascade;
drop table if exists public.customers cascade;
drop table if exists public.order_lines cascade;
drop table if exists public.material_readiness cascade;
drop table if exists public.payments cascade;
drop table if exists public.deliveries cascade;
drop table if exists public.oem_invoices cascade;
drop table if exists public.pdi_records cascade;
drop table if exists public.order_stages cascade;
drop table if exists public.orders cascade;
drop table if exists public.quote_version_lines cascade;
drop table if exists public.quote_versions cascade;
drop table if exists public.quotes cascade;
drop table if exists public.oem_requests cascade;
drop table if exists public.commitments cascade;
drop table if exists public.oem_products cascade;
drop table if exists public.oems cascade;
drop table if exists public.requirement_lines cascade;
drop table if exists public.requirements cascade;
drop table if exists public.documents cascade;
drop table if exists public.tasks cascade;
drop table if exists public.approvals cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.profiles cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user cascade;
drop function if exists public.check_commission_milestone cascade;
drop function if exists public.check_order_quote_approved cascade;
drop function if exists public.check_line_deadline cascade;
drop function if exists public.write_audit cascade;
drop function if exists public.recommended_price(numeric, numeric) cascade;
drop function if exists public.is_owner cascade;
drop function if exists public.current_app_role cascade;

drop type if exists public.approval_status cascade;
drop type if exists public.coverage_state cascade;
drop type if exists public.document_type cascade;
drop type if exists public.app_role cascade;
drop type if exists public.loss_reason cascade;
drop type if exists public.quote_status cascade;
drop type if exists public.oem_approval_status cascade;
drop type if exists public.commitment_kind cascade;
drop type if exists public.requirement_status cascade;

-- Confirm the slate is clean (should return 0 rows):
-- select tablename from pg_tables where schemaname = 'public';
