# PLAN — working entry point

This file is the short index AGENTS.md §13 asks for. It does not repeat the documents it points to.

- **What to build and in what order:** `docs/IMPLEMENTATION-PLAN.md` (Phases 0–11).
- **How to build it (technology):** `docs/TECH-STACK.md`.
- **What the business needs, and the open questions:** `docs/PRD.md` and `docs/ASSUMPTIONS.md`.
- **UI completeness contract and parity vs the reference:** `docs/UI-SPEC.md`, `docs/UI-PARITY.md`.
- **How the build is tested:** `docs/test-plan.md`.
- **Theme and colour tokens:** `docs/DESIGN.md`.
- **What was actually run and proven:** `docs/WORKLOG.md` and `docs/REPORT.md`.
- **SQL:** all of it lives in `supabase/` (`migrations/0001-0015`, `demo/001-010`, `apply_all.sql`, `reset.sql`).

## Where the build actually is (2026-10-05)

Live against Supabase (project `ekenmwvyrjtkvlmjecbl`): schema applied (RLS on), auth (invite-only,
signed-in cookie sessions), and every screen reads Postgres. Working end to end: Today, Requirements
(list/detail/edit, coverage, commitments, draft quote, OEM request, loss), OEMs (list/detail/edit,
products, capacity), Quotes (draft → set final price → approve → order), Orders (PDI, delivery),
Payments (invoice, payment, commission), Documents, Follow-ups, History, Ask, Activity.

Run: `npm install`, `npm test`, `npm run build`, `npm start`; or `npm run dev` then
http://localhost:3000. SQL syntax check: `npm run sql:check`.

## Pending list — deferred on purpose, with reasons

| # | Item | Why deferred | Owner / trigger |
|---|---|---|---|
| P1 | **`pg_cron` reminder scheduling** (run `generate_followup_tasks()` daily) | Deferred by the owner 2026-10-05. The generator works but runs only via the "Run reminders now" button. `pg_cron` runs inside Supabase Postgres (UTC); Vercel Cron is the alternative. | Owner decides scheduler; one line to enable (commented in `migrations/0011`) |
| P2 | **A1 per-order capacity mode** | The `capacity_shared` flag is stored and shown, but only the assumed **global pool** semantics are computed. Implementing a mode before Ram confirms A1 would code a guess. | Change scope in the `oem_product_capacity` view once Ram confirms |
| P3 | **Capacity as a quote gate** (block vs flag) | Business decision, not a build decision. Over-capacity is flagged today, not blocking. | Owner / Ram |
| P4 | **Quote versioning guard** | An edit after approval must create a new version with the old one intact (PRD). The UI only edits drafts, but the actions lack a status guard. | Build (small) |
| P5 | **Quotation PDF export** | The client's most expensive manual step (A10). `@react-pdf/renderer` is the chosen stack. | Build |
| P6 | **Delete a requirement line** | Blocked by commitments/quotes referencing line ids; needs a guarded delete. | Build |
| P7 | **Excel export; document upload (Storage)** | Not yet built; the brief asks for both. | Build |
| P8 | **Role-conditional UI** | Screens offer actions RLS may refuse; the plan's RLS-06 test. | Build |
| P9 | **Needs-attention feed; coverage list; per-KPI sparklines** | UX finish for Today. | Build |
| P10 | **Order/invoice/commission status transitions; tabs; paste-from-Excel; top-bar search; OEM contacts/notes/KPIs; demo-data removal; backups** | Completeness layer. | Build, prioritised |

## Next actions, in order

1. Clear **P4** (correctness guard) and **P5** (PDF) — neither needs a decision.
2. Ask Ram to confirm **A1** with one real example, then do **P2/P3**.
3. Decide **P1** (scheduler) — it is the client's largest recurring cost once there is real data.
4. Work **P6-P10** and deploy (env vars + Supabase URL configuration).
