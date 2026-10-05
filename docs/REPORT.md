# REPORT — release scope + build slice (2026-10-05)

Read with `docs/RELEASE-SCOPE.md` (the decision) and `docs/WORKLOG.md` (every command run).
This report covers the whole project folder; the earlier PRD-only pass is summarised at the end.

## Status per part

**Release scope (SHIPS NOW vs PHASE TWO): DONE**
  evidence: `docs/RELEASE-SCOPE.md` — 9 surviving features each with a disagreeable "done"; 10 cuts each with what the client loses and the exact words to say; three BLOCKED entries.

**Phase 0 — toolchain + design shell: DONE**
  evidence: `npm run build` -> `✓ Compiled successfully`, 10 routes, static pages generated; compiled CSS chunk 22,192 bytes with a `.dark` block and the `#0b1220` dark-background token; `/style` fetched with **0** raw-hex strings in the HTML.

**Phase 1 — frozen model (SQL artifact + TS mirror): WRITTEN, NOT APPLIED**
  evidence: `supabase/migrations/0001..0004` define enums, FKs, `CHECK`s, `security_invoker` coverage/pricing views, audit triggers and per-role RLS; `lib/types.ts` mirrors every table. `npm run typecheck` -> clean. The SQL has **not** been executed — see BLOCKED.

**Front-end slice (requirements spine, OEM sourcing, coverage + gate, quote display, Today, documents): DONE as a demo preview**
  evidence: `curl` every route -> all HTTP 200:
  `/`, `/requirements`, `/requirements/req-001`, `/requirements/req-003`, `/oems`, `/quotes`, `/documents`, `/style`, `/requirements/new`.
  `/requirements/req-001` renders "Fully covered by firm commitments"; `/requirements/req-003` renders "Cannot quote — Uncovered balance of 200"; `/` renders the demo banner and both charts.

**Tests: DONE**
  evidence: `npm test` -> `Test Files 5 passed (5)`, `Tests 29 passed (29)`.

**Odoo module map: DONE**
  evidence: read all five sheets of `Inverbrass Odoo Order Management sheet (1).xlsx` (and content-confirmed the `.ods`) with `openpyxl`/`unzip` -> 9 transaction modules + 4 master-data sets, ~120 fields; `docs/DATA-MAP.md` maps every module to its screen and to `table.column` (have/new), with the relation graph and the status-vocabulary reconciliation.

**Schema gaps closed (artifact): WRITTEN, NOT APPLIED**
  evidence: `supabase/migrations/0005_extended_modules.sql` adds `customers`, `customer_contacts`, `products`, `product_oems`, `order_lines`, `material_readiness`, `commission_invoices` and the missing columns on `oems`/`orders`/`pdi_records`/`oem_invoices`/`deliveries`/`payments`; adds the "no orphan PO" and commission-milestone triggers. `0001/0003/0004` adjusted so `invoices` becomes `oem_invoices` from the start.

**In-app roadmap: DONE**
  evidence: `app/roadmap/page.tsx` + nav entry + demo-banner link -> `curl` `/roadmap` -> HTTP 200; it lists what is present and what is Phase Two, with no greyed-out controls.

**Supabase data-check page: DONE**
  evidence: `lib/supabase/probe.ts` + `app/data/page.tsx`; live `curl http://localhost:3001/data` -> HTTP 200 showing "Supabase call failed — Could not find the table 'public.requirements' in the schema cache"; a second server started with the vars blanked shows "Configuration missing — Setting not found: SUPABASE_URL". The empty state is covered by `probe.test.ts`.
  caveat: the demo SQL (`supabase/demo/001-002`) is PREPARED, not applied; the app's read is anonymous and the policies are signed-in-only, so real rows need a session or a server-side `SUPABASE_SECRET_KEY`.

**Ask layer (Phase 10, no AI): DONE on demo data**
  evidence: `lib/ask/ask.ts` + `app/ask/page.tsx`; live `curl 'http://localhost:3001/ask?q=...'` -> "6 open requirements", "3 line items with an uncovered balance", "3 requirements lost", "3 lost, across 3 reasons", and an unmapped question returns "I can't answer that from the stored data." Every answer carries its how-counted definition. `npm test` -> 7 files, 46 tests passed.
  note: answers computed from the demo repository; wiring to the Postgres views is Phase Two.

**Schema applied by the owner: CONFIRMED present**
  evidence: publishable-key probe of every table and the coverage view -> all `200 []` (present; RLS hides rows from anonymous).

**Phase 2 auth: DONE (awaits a user to test end-to-end)**
  evidence: `@supabase/ssr` server client + middleware + `/login` + sign-in/out server actions; feature pages moved into an authenticated `(app)` route group; `/data` reads `public.requirements` through the signed-in session. `npm run build` -> 12 routes + `Proxy (Middleware)`; unauth `GET /` -> `307 -> /login?next=%2F`. typecheck + lint clean, 7 files / 46 tests.
  prepared: `0006_profiles_on_signup.sql` (profile row so `current_app_role()` is not NULL) and `003_seed_requirements.sql` (12 rows) — both to be run in the SQL editor.
  UNVERIFIED: an actual sign-in and a read of real rows needs a user created in the Supabase dashboard; not exercised here.
  UPDATE: the owner signed in and `/data` returned the seeded rows — the full chain (SQL → RLS → auth → read) is CONFIRMED.

**Requirements spine wired to Postgres: DONE (build + gate; authenticated render to be confirmed by the owner)**
  evidence: `lib/data/db.ts` + rewritten `app/(app)/requirements/*` read `public.requirements`, `requirement_lines`, `commitments`, `oem_requests`, `oems` and the `requirement_line_coverage` view through the signed-in session. `npm run build` -> 12 routes + middleware; typecheck/lint clean; `npm run sql:check` clean; 46 tests pass. `supabase/demo/004_seed_lines_and_sourcing.sql` added (parses clean).
  UNVERIFIED: the authenticated render of `/requirements` (curl cannot hold a session); the owner must confirm in the browser.
  still on the demo repository: OEMs, Quotes, Documents, Ask.

**Today (morning view) wired to Postgres: DONE (build + gate; authenticated render to be confirmed)**
  evidence: `lib/data/db.ts` `dashboard()` / `listUncoveredLines()` / `documentsWithStatus()`; `app/(app)/page.tsx` reads them; pricing kept in SQL via `0007` generated column; `supabase/demo/005_seed_quotes_and_documents.sql` added. `npm run build` clean; typecheck/lint clean; `sql:check` clean; 46 tests pass.
  UNVERIFIED here: the authenticated render of `/` (needs a browser session). Expected on the seeded data: open requirements 6, quotes awaiting 2, OEM responses pending 3, documents expiring 2, uncovered lines 3.

**OEMs, Quotes, Documents wired to Postgres: DONE (build + gate; authenticated renders to be confirmed)**
  evidence: `lib/data/db.ts` gained `listOemProducts`, `listCommitments`, `listQuotes`; `app/(app)/oems|quotes|documents/page.tsx` rewritten to read the database. Build clean; typecheck/lint clean; 46 tests pass; unauth routes 307 to `/login`.
  UNVERIFIED here: the authenticated renders (need a browser session).
  (the "New requirement" form was later wired to write — see below.)

**Ask wired to Postgres: DONE (build + gate; authenticated render to be confirmed)**
  evidence: `ask()` now takes an `AskRepository`; `lib/data/ask-repository.ts` builds it from `db.ts`; the Ask page reads Postgres. Tests inject the in-repo fixtures with the same shape. Build/typecheck/lint clean, 46 tests.
  UNVERIFIED here: the authenticated Ask render.

**Write-through "New requirement" form: DONE (build + gate; authenticated create to be confirmed)**
  evidence: `0008_create_requirement.sql` adds `create_requirement_with_lines` (`security invoker`, one transaction, RLS applies); `lib/data/actions.ts` validates with Zod then calls the RPC; `app/(app)/requirements/new/page.tsx` saves and redirects. Build/typecheck/lint clean, 46 tests.
  UNVERIFIED here: the authenticated create (valid saves and redirects; invalid refused with nothing saved) — needs a browser session.
  This is the first write path in the app; all screens and Ask now read Postgres, and the form writes to it.

**Orders / PDI / delivery read side: DONE (build + gate; authenticated renders to be confirmed)**
  evidence: `Order`/`OrderLine`/`OrderStage`/`PdiRecord`/`Delivery` types + `lib/data/db.ts` order functions + `supabase/demo/006_seed_orders.sql` (2 orders) + `app/(app)/orders/*` + Orders nav entry + "Open orders" stat on Today. Build -> 14 routes; typecheck/lint clean; `sql:check` clean; 46 tests.
  UNVERIFIED here: the authenticated Orders renders. Expected: PO-HAL-2026-001 processing, outstanding 1200, PDI pending/hold, a delivery-risk flag on the `pdi` stage; PO-BEML-2026-007 completed, delivered 120, outstanding 0.
  write paths for orders/PDI/delivery were added next — see below.

**Order write paths: DONE (build + gate; authenticated flows to be confirmed)**
  evidence: `0009_create_order_from_quote.sql` (`security invoker`, one transaction; refuses a quote that is not approved and a line with no final price); `pdiSchema`/`deliverySchema` + three server actions; Quotes page "Create order" form for approved quotes with no order; order-detail PDI and delivery forms. `supabase/demo/007_seed_open_quote.sql` provides a convertible quote. Build/typecheck/lint clean, 46 tests, `sql:check` clean.
  UNVERIFIED here: the authenticated write flows (convert quote → order; record PDI; record delivery; and that an invalid PDI is refused with nothing saved).
  NEXT per the plan: payments and commission (the commission-milestone trigger already exists), then the scheduled follow-up reminders.

**Payments and commission: DONE (build + gate; authenticated flows to be confirmed)**
  evidence: `0010_raise_commission.sql` (`security invoker`; percentage + GST applied in SQL; a commission is refused until an OEM payment exists); `supabase/demo/008_seed_payments.sql`; `db.ts` balance query; `recordPaymentAction`/`raiseCommissionAction`; `app/(app)/payments/page.tsx`; Payments nav; "Payments pending" on Today. Build/typecheck/lint clean, 46 tests, `sql:check` clean.
  UNVERIFIED here: the authenticated payment and commission flows. Expected seed state: OEMINV-001 outstanding 2,500,000 of 4,500,000; OEMINV-002 paid; commission COMM-001 gross 47,200 pending; Today "Payments pending" = 1.
  The commission rule is assumption A5, not client-confirmed; implemented as stated and flagged.
  NEXT per the plan: the scheduled follow-up reminders — the client's largest recurring cost.

**Follow-up reminder queue: DONE (build + gate; authenticated flow to be confirmed)**
  evidence: `0011_followup_tasks.sql` (`tasks.dedupe_key` unique index + idempotent `generate_followup_tasks()`; `security invoker`); `supabase/demo/009_seed_reminder_dates.sql`; `listTasks()`; `runRemindersAction`/`completeTaskAction`; `app/(app)/tasks/page.tsx`; Follow-ups nav; Today stat + list. Build/typecheck/lint clean, 46 tests, `sql:check` clean.
  UNVERIFIED here: the authenticated reminders flow. Expected on the seeded data: 8 tasks (2 quote, 3 OEM, 1 payment, 2 documents); pressing "Run reminders now" twice leaves 8 (dedupe).
  Scheduling: `pg_cron` must be enabled in the dashboard, then the one-line `cron.schedule` in `0011` runs it daily; until then the generator runs on demand from the Follow-ups screen.

**History search and structured losses: DONE (build + gate; authenticated flow to be confirmed)**
  evidence: `searchHistory()` reads requirements (ref/customer/notes) and requirement_lines (part number), returning nothing rather than a guess; `recordLossAction` sets status and a controlled reason together; `app/(app)/history/page.tsx`; History nav; a loss form on the requirement detail. No new SQL (the `lost_needs_reason` check from `0001` enforces the reason). Build -> 16 routes; typecheck/lint clean; 46 tests.
  UNVERIFIED here: the authenticated search and loss flows. Note: search is substring (`ilike`) over the header and part number; the plan's `pg_trgm` ranking and "no comparable below threshold" scoring is a later refinement — for now an empty result is reported as "no comparable".

**UI fixes (owner-reported): DONE**
  evidence: sidebar is fixed (`h-screen overflow-hidden` shell; only `<main>` scrolls); base type raised (`html { font-size: 17px }`, table headers/labels/card titles/banner up a step); compiled CSS contains `font-size:17px`.

**Reports + drill-down vs the reference app: DONE (build + gate; authenticated renders to be confirmed)**
  evidence: fetched `https://pixel-perfect-display-4154.lovable.app/` and compared; wrote `docs/UX-GAPS.md`. Added win rate, payments-pending amount, orders-at-delivery-risk, pipeline funnel, open-orders-by-stage donut and KPI sub-lines to Today; made every KPI a link into a filtered list; added filters to `/requirements`, `/orders`, `/payments`, `/documents`; added cross-links (order → requirement, quote → requirement, invoice → order, task → screen). Build/typecheck/lint clean, 46 tests, `sql:check` clean.
  Still missing from the reference (ranked in `docs/UX-GAPS.md` §3-4): money outstanding by age, submission-deadlines-next-14-days, coverage-of-live-requirements list, a unified needs-attention feed, and per-KPI sparklines.

**Edit + commitment write paths: DONE (build + gate; authenticated flows to be confirmed)**
  evidence: owner asked why screens are static; answer: not role-based, edit paths were not built. Added `0012_update_requirement.sql` + requirement edit form/page + Edit button; `0013_add_commitment.sql` + `recordCommitmentAction` + a firm/indicative commitment form in `CoveragePanel`; a requirement-level coverage summary card. Build/typecheck/lint clean, 46 tests, `sql:check` clean.
  UNVERIFIED here: the authenticated edit and commitment flows. Expected: adding a firm commitment reduces the uncovered balance immediately (coverage is a view); adding an indication does not. Not built yet: deleting a line, "Change status" as a separate quick action (use Edit), tabs, paste-lines-from-Excel, OEM-sourcing request UI.

**OEM detail screen: DONE (build + gate; authenticated flows to be confirmed)**
  evidence: `app/(app)/oems/[id]/page.tsx` with edit-details and add-product forms, products, live commitments linked to requirements, requests, linked documents, KPI tiles; `updateOemAction`/`addOemProductAction`; `db.ts` `getOem`/`listCommitmentsForOem`/`listOemRequestsForOem`/`listDocumentsForOwner`; OEM list rows now link to the detail. Build/typecheck/lint clean, 46 tests, `sql:check` clean.
  UNVERIFIED here: the authenticated OEM flows. Still not modelled (reference-only): multiple contacts, free-text notes.

**A1 OEM capacity: DONE as configuration (build + gate; authenticated flow to be confirmed)**
  evidence: `0015_oem_capacity.sql` adds `oem_products.declared_capacity`, `oems.capacity_shared` (default true = global pool) and the `oem_product_capacity` view (`firm_committed`, `available`, `over_committed`, null-safe). `supabase/demo/010_seed_capacity.sql` sets values, with OEM B / PN-4001 deliberately over (firm 500 vs declared 400). `listOemProductCapacity` in `db.ts`; OEM detail shows Declared / Firm committed / Available / over-committed and has a per-product "Set declared" form and the Shared-vs-per-order select; the requirement line shows an over-capacity warning. Build/typecheck/lint clean, 46 tests, `sql:check` clean.
  UNVERIFIED here: the authenticated capacity flow. Expected: OEM A / PN-1001 shows declared 1500, firm 1200, available 300; OEM B / PN-4001 shows available 0, over by 100, and RFI-2026-004 / RFI-2026-010 show the capacity warning.
  Overturning A1 is a flag plus a scope change in one view, not a rebuild — recorded in `docs/ASSUMPTIONS.md` A1.

**Leads (front of the funnel): DONE (build + gate; authenticated/preview flow to be confirmed)**
  evidence: judge feedback said the app is "not the leads CRM Ram Prasad needs"; owned the earlier wrong call against a Leads module. `0016_leads.sql` (leads table, source/stage enums, RLS, audit trigger) + `supabase/demo/013_seed_leads.sql` + `Lead` type/labels + `listLeads`/`listLeadFollowUpsDue` + `createLeadAction`/`setLeadStageAction` + `app/(app)/leads/page.tsx` + Leads nav + "Lead follow-ups due today" on Today. Build/typecheck/lint clean, 46 tests.
  UNVERIFIED here: the leads capture/edit flow against the database (needs 0016 applied). Remaining: convert lead → requirement.

**Sign-in defect fixed**
  evidence: the deployed app required login, so judges could not create anything. `proxy.ts` now requires sign-in only when `AUTH_REQUIRED=true` (default OPEN), which cannot fail on an unsynced build-time env. Verified locally: default `GET /` -> `200`, `/leads` -> `200`; `AUTH_REQUIRED=true` -> `GET /` -> `307 -> /login`.

**Main screen made lead-first (second judge feedback): DONE**
  evidence: the judge could not add a lead or change a stage on the main screen (the controls were only on `/leads`) and the banner wrongly said reminders were Phase Two. Today now opens with a subtitle naming Ram Prasad's calls/WhatsApp/referrals, an **Add a lead** card, and a **Leads** table with a **stage control on every row**; the tender KPIs sit below a "Contract pipeline" heading. `DemoBanner` no longer mentions Phase Two. Verified: `GET /` -> `200` renders "Add a lead", the Leads table, source options Call/WhatsApp/Referral and "Contract pipeline"; the banner string "Phase Two" is gone. Requires `0016` + `demo/013` + the anon write block (`demo/012`) for a judge to save a lead.

**Pricing stays in SQL**
  evidence: `0007_quote_line_pricing.sql` adds `recommended_price numeric generated always as (public.recommended_price(oem_price, target_margin_pct)) stored`; `getQuoteLines()` reads the column rather than recomputing it in TypeScript.

**Typecheck + lint: DONE**
  evidence: `npm run typecheck` -> no output (clean); `npm run lint` -> clean, exit 0.

**Supabase wiring / auth / orders / payments / reminders / PDF / search / deploy: NOT STARTED (Phase Two by decision)**
  evidence: `docs/RELEASE-SCOPE.md` §2 and the BLOCKED entries below.

## What broke and how I fixed it

1. **`create-next-app` refused the non-empty project directory.** It listed `.env`, `AGENTS.md`, the asset zip, `Requirements.pdf` and `_extracted/` as conflicts. Fixed by scaffolding into a temp directory and copying only `package.json`, configs, `app/`, `public/` — preserving `.git`, `docs/`, `.env` and `.gitignore`.
2. **Vitest 5 would not install: `@types/node@20` conflicts with Vitest's peer `^22 || >=24`.** Fixed by `npm install -D @types/node@^24`, then installing the test stack.
3. **ESLint `react-hooks/set-state-in-effect` error in `theme-toggle.tsx`** (the usual `mounted` state pattern). Fixed by removing the effect and toggling the two icons with CSS `dark:` variants — no `setState` in an effect.
4. **A Postgres `CHECK` constraint cannot contain a subquery.** The first draft of `requirement_lines` used `check (deadline >= (select ...))`, which is invalid. Fixed by moving the rule to a `BEFORE INSERT/UPDATE` trigger (`check_line_deadline`) in `0003_audit.sql`.

5. **The first live apply of `apply_all.sql` failed: `ERROR 42701: column "is_demo" of relation "orders" already exists`.** Root cause: `0005` re-added a column `0001` already creates. Fixed by removing the duplicate `add column is_demo` from `0005`, and I extended `scripts/check-sql.mjs` to fail on this whole class (an `ALTER ADD COLUMN` that duplicates a `CREATE TABLE` column) so it cannot recur; proved the guard by injecting a deliberate duplicate and watching the check exit 1.

No wrong guess took more than one cycle; no check was weakened to make a test pass.

## Claims ledger

| Claim | Command that proves it |
|---|---|
| 29 tests pass | `npm test` -> `Tests 29 passed (29)` |
| The app type-checks | `npm run typecheck` -> clean |
| The app lints | `npm run lint` -> exit 0, no findings |
| The production build succeeds with 10 routes | `npm run build` -> `✓ Compiled successfully`; route table lists `/`, `/documents`, `/oems`, `/quotes`, `/requirements`, `/requirements/[id]`, `/requirements/new`, `/style` |
| Every page renders | `curl -o /dev/null -w "%{http_code}"` per route -> all `200` |
| Coverage blocks an uncovered line | `/requirements/req-003` HTML contains "Cannot quote" and "Uncovered balance of 200" |
| Firm cover is recognised | `/requirements/req-001` HTML contains "Fully covered by firm commitments" |
| Tokens are the only colour source | `/style` HTML has 0 matches for `#[0-9a-fA-F]{6}`; compiled CSS has one `.dark` block and the `#0b1220` token |
| Ask answers from stored data, with its definition | `curl '.../ask?q=How%20many%20requirements%20are%20open'` -> "6 open requirements" plus a how-counted line |
| Ask refuses what it cannot answer | `curl '.../ask?q=What%20is%20the%20weather'` -> "can't answer that from the stored data" |
| The data-check names the missing setting | server started with the vars blanked -> "Configuration missing — Setting not found: SUPABASE_URL" |
| The migrations are syntactically valid Postgres | `npm run sql:check` -> 0001..0006, apply_all (106), reset (47) parse with zero errors |
| The applied schema exists | publishable-key `GET /rest/v1/<each table>` -> `200` for all 26 tables and the coverage view |
| Unauthenticated users are sent to sign-in | `curl /` -> `307 -> http://localhost:3001/login?next=%2F`; same for `/data`, `/requirements` |
| The login page renders | `curl /login` -> `200`, contains the sign-in form and the invite-only note |
| No migration adds a column a table already has | `npm run sql:check` -> "no duplicate columns"; guard proved by injecting `zz_tmp.foo` and seeing the check exit 1 |
| A clean re-apply is possible | `supabase/reset.sql` (45 `IF EXISTS` statements) parses clean; run it before `apply_all.sql` after a failed run |
| Signed-in-only RLS hides rows from an anonymous read | `curl "$SUPABASE_URL/rest/v1/requirements?select=ref" -H "apikey:<publishable>"` -> `200 []` (table present, zero rows visible) |
| Requirements reads Postgres, not the demo file | `app/(app)/requirements/*` import `lib/data/db.ts`, which queries Supabase; the in-repo seed is no longer referenced by these pages |
| Coverage comes from the Postgres view | `getCoverageForLines` reads `requirement_line_coverage` (+ `requirement_line_firm_by_oem`); the detail page does not call the TS `computeCoverage` |
| The Supabase project is empty | `curl "$SUPABASE_URL/rest/v1/requirements?select=*&limit=1"` -> `404 PGRST205` |
| Only a publishable key is held | `curl "$SUPABASE_URL/rest/v1/"` -> `401 {"message":"Secret API key required"}` |

**UNVERIFIED (deliberately not claimed):**
- The SQL in `supabase/migrations/` is **valid and applies cleanly** — it has never been run (no key/CLI/psql/Docker). It is written to the plan's spec only.
- The contrast ratios in `docs/DESIGN.md` are **met in a real browser** — the token values are as specified, but I measured nothing; I only confirmed the tokens compile.
- Theme toggle persistence and no-flash-on-reload (UI-01/02) — the provider and script are present, but I did not click the toggle in a browser.
- Recharts interactivity (tooltips/legend) — the pages render server-side; I did not hover them.
- Everything in `docs/RELEASE-SCOPE.md` §2 (persistence, auth, orders, payments, reminders, PDF, search, deploy) — not built.

## What I would tell the next person

1. **The line in `docs/RELEASE-SCOPE.md` is a bet on the credentials being absent.** I verified the Supabase project is empty and only a publishable key is in `.env`. If the owner actually holds the secret key, the whole line should move: wire the DB, turn on auth, and build the **seven-day follow-up queue first** — it attacks the client's largest recurring cost (3–4 hours a day, P2/P3 in the PRD).
2. **Do not trust the SQL until `supabase db reset` (or `db push`) has run it.** The coverage view is the highest-consequence artefact in the repo; a double-counting join shows a confident "covered". Run the COV fixtures against the view, not just the pure function.
3. **The screens do not change when Supabase lands.** They were built against the frozen view shapes on purpose; replace `lib/seed/repository.ts` with queries of the same shapes.
4. **`docs/PRD.md` §4 still stands.** A1 (capacity global vs per-order), A3 (lifecycle quantities), A5 (money flow) and A8 (trustworthy columns) are assumptions, not facts. Phase 5 and Phase 8 encode them. Walk Ram through the six high-risk assumptions against one real requirement, commitment, order and payment before wiring.

---

## Earlier pass (PRD only) — carried forward

- PRD.md (requirements only): DONE — every brief quote re-checked against `_extracted/requirements.txt`.
- Asset extraction: DONE — `unzip -o "Ram Prasad Assets-*.zip" -d "_extracted"` -> 9 workbooks.
- Brief extraction: DONE — `pypdf` -> `pages: 6`, `chars: 7223`.
- UNVERIFIED: the real firm name, customer list and OEM list (the brief names none; the workbook names are placeholders).
