-- 0007_quote_line_pricing.sql — expose the recommended price on quote lines, computed in SQL.
-- Why: the pricing rule must live once, in SQL (docs/TECH-STACK.md), not be recomputed in the app.
-- recommended_price() is IMMUTABLE, so it can back a generated column.
-- Apply in the SQL editor after 0001-0006. STATUS: written, not yet applied.

alter table public.quote_version_lines
  add column if not exists recommended_price numeric(14,2)
  generated always as (public.recommended_price(oem_price, target_margin_pct)) stored;

-- Check: select oem_price, target_margin_pct, recommended_price from public.quote_version_lines limit 5;
