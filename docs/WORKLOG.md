# WORKLOG

One line per slice: `<what I did> -> <the command I ran> -> <what it actually printed`.

- Extracted asset zip -> `unzip -o "Ram Prasad Assets-20261004T221206Z-1-001.zip" -d "_extracted"` -> inflated 9 workbooks (enquiries, quotation, orders, sales, payments, approvals, OEM, customers, Odoo order-management).
- Extracted requirement brief to text -> `python3 -c "from pypdf import PdfReader; ..."` -> "pages: 6", "chars: 7223"; saved `_extracted/requirements.txt`.
- Read all 9 workbooks (sheet names, dimensions, cell values) -> `openpyxl.load_workbook(...)` / `xlrd.open_workbook(...)` -> confirmed anonymised sample data (OEM A/B, OEM-ABC, Inverbrass, HAL/BEL/BEML); real column shapes (QTN TV, PNC ladder, QTY BAL, TDS/LD, VALID TILL, commission %, roles).
- Wrote requirements-only PRD -> `write PRD.md` -> file created; no technology choices, no build order; all quotes verbatim from `Requirements.pdf`.
- Moved project docs into `docs/` -> `mkdir -p docs && mv PRD.md WORKLOG.md REPORT.md docs/` -> `docs/` now holds PRD.md, WORKLOG.md, REPORT.md; `AGENTS.md` left at root (harness auto-read).
- Closed the 15 open questions by assumption -> `write docs/ASSUMPTIONS.md` + edit `docs/PRD.md` §6 -> A1–A15 recorded with risk and mitigation; PRD §6 retitled "Open questions — closed by assumption", each question now names its closing assumption (A#). Status: CLOSED-BY-ASSUMPTION, none client-confirmed.
- Checked the friend's reference app -> `curl -sL https://pixel-perfect-display-4154.lovable.app/` + fetched `/assets/*.js` -> HTTP 200; Vite+React SPA with Supabase data layer (`from('requirements').select('*')`), TanStack Query, shadcn/Radix chunks, Google Fonts CDN; tables: requirements, requirement_lines, oems, oem_products, commitments, oem_requests, quotes, quote_versions, quote_version_lines, orders, documents, gov_log, tasks, audit_log.
- Wrote the stack decision -> `write docs/TECH-STACK.md` -> 3-column table (LAYER/CHOICE/CONSTRAINT), 24 rows, hard-exclusions table, flagged deps; recorded that C2 (no backend/DB/auth) conflicts with PRD persistence/roles/audit and is only acceptable with mandatory JSON export/import.
- Revised the stack after the constraint change -> `write docs/TECH-STACK.md` (rewrite) -> constraints now C1 deploy to Vercel/Netlify, C2 Supabase; browser-local IndexedDB dropped, Supabase Postgres/Auth/Storage + RLS adopted, TanStack Query cache for hotel-wifi resilience; revision note added inside the file (AGENTS.md §3b); new top risks: RLS policy correctness and network dependence.
- Corrected a wrong claim about charts -> downloaded all 34 `/assets/*.js` chunks and grepped -> `BarChart-BdthwJed.js` contains 70 `recharts` refs (imported by `routes-*.js`, `history-*.js`) and `lucide` refs in `button-*.js`; added Recharts + lucide-react rows and exclusions, and a correction note in `docs/TECH-STACK.md`.
- Reviewed the client's proposed stack -> edit `docs/TECH-STACK.md` -> adopted coverage-in-Postgres (plain `security_invoker` views for live coverage; matviews only for historical aggregates) and the user-scoped Edge Function Ask layer; added exclusions for non-invoker views, matviews-for-live-coverage, and service-role use on user paths; kept Vite over Next.js with the switch condition (Vercel-only + cookie auth).
- Switched the frontend to Next.js and fixed the theme -> rewrite rows in `docs/TECH-STACK.md` (Vite -> Next.js App Router on Vercel; `@supabase/ssr` cookie auth; Ask layer -> Next route handler; `NEXT_PUBLIC_`/Vercel env; C1 now Vercel-only) + `write docs/DESIGN.md` -> light/dark tokens, semantic status palette, chart tokens, 8 usage rules; `next-themes` + CSS variables with system default. Vite retained only as the rejected alternative and its build noted as non-transferable.
- Closed stack gaps against the PRD -> edit `docs/TECH-STACK.md` -> added rows for Approvals (table + state machine), Audit (Postgres triggers -> append-only `audit_log`), PDF generation (`@react-pdf/renderer`), History search (`tsvector` + `pg_trgm`), Pricing/margin (SQL view), and Scheduled jobs (`pg_cron` + Vercel Cron).
- Recorded the owner's answers -> edit `docs/ASSUMPTIONS.md` (A7 entity/brand closed, A8 fuzzy match, A9 2–3 months mock history, A10 standard quotation/invoice, plus an "Owner decisions 2026-10-05" table) + edit `docs/TECH-STACK.md` (four roles from the brief; in-app-only reminders; no-letterhead PDF; fuzzy search) + edit `docs/DESIGN.md` (brand/re-skin hook and professionalism rules) -> personas confirmed from `_extracted/requirements.txt` line 92 and the Odoo "User Roles & Permissions" column.
- Wrote the build order -> `write docs/IMPLEMENTATION-PLAN.md` -> 12 phases (0 toolchain/theme, 1 data-model freeze, 2 auth+shell, 3 RFI+line items, 4 OEM+sourcing, 5 coverage, 6 quote+pricing+approvals, 7 order/PDI/delivery, 8 payments/docs/jobs, 9 search/losses, 10 dashboard+Ask, 11 optional LLM), each with what/why/visible/if-wrong; named the data model as the irreversible decision and the coverage/RLS/audit/PDF/demo-data half-work risks; flagged the "front end first" sequencing risk and reconciliation.
- Wrote the test plan -> `write docs/test-plan.md` -> scope, 3 test types (Vitest/Testing Library + Supabase branch), ~80% coverage policy on pure logic, four run gates (G0–G3), and a catalogue of 102 cases across AUTH/RLS/VALID/RFI/OEM/COV/PRICE/QUOTE/APPROVE/ORDER/PDI/DELIV/PAY/COMM/DOC/JOB/SRCH/LOSS/ASK/AUD/UI/DEMO with traceability.









