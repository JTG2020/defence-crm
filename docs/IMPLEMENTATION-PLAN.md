# IMPLEMENTATION-PLAN

The order the pieces get built, and why. This plan references `docs/PRD.md` and `docs/TECH-STACK.md` by name; it does not repeat them. It assumes the reader (an agent) will follow it literally, so every phase says what is built, why it sits here, what is visible when it is done, and what breaks downstream if it is wrong.

---

## The sequencing risk in your instruction

**Your rule — "I want to see the front end first before we start coding and wiring up the back end" — is right about wiring and wrong about the data model.** Built literally as "screens before schema," it will hurt: the UI is where the data model becomes visible, so screens built before the model is frozen will encode whatever shape the developer guessed, and every one of them is rewritten when the real cardinality lands. That is the single most expensive rewrite available in this project.

**Reconciliation, and the order I will use:** freeze the data model first (Phase 1), then build the front end against **generated types plus seeded data, with no live-data wiring** (Phases 0 and 3 onward). You still see the front end before any backend is wired — every feature screen renders from typed seed data first — but it is rendered against the frozen model rather than a guess. Wiring to Supabase happens per feature *after* the screen is demonstrable, which is exactly the sequence you asked for minus the one thing that causes rewrites.

Read the rest of this plan as: **schema is a prerequisite, not a backend phase.**

---

## The rule that sets the order

Everything that works without a model comes first. In this product almost everything is deterministic — `docs/TECH-STACK.md` keeps AI off the critical path — so the only model-dependent feature is the **optional** LLM translator in Phase 11, which is dead last and behind a flag. The deterministic features (coverage, pricing, follow-up tasks, Ask-by-pattern) are also the ones the client values most (`docs/PRD.md` P1–P4), so the two orderings agree.

---

## Phase 0 — Toolchain and the visible style shell

- **What gets built:** Next.js App Router + TypeScript strict; Tailwind with the tokens from `docs/DESIGN.md`; `next-themes` light/dark; ESLint + Prettier; Vitest; the Supabase project link and env scaffolding. One unauthenticated style-guide page rendering the primitives: buttons, inputs, badges for every status pair, a table, a Recharts bar, all in both themes.
- **Why here and not earlier or later:** it is the smallest thing that is visible, and it proves the toolchain and the design system before a single feature depends on them. Nothing else can be built until the agent has a working, themed shell.
- **Demonstrable when done:** run locally, toggle dark/light, see the full component set render correctly — the "professional look and feel" the owner asked for, before any feature exists.
- **If wrong downstream:** the tokens are centralized in `globals.css` per `docs/DESIGN.md`, so a palette mistake is a one-file change; a toolchain mistake (bad TS/lint/test setup) poisons every later phase, which is why it is Phase 0.

## Phase 1 — Data model freeze, migrations, audit, seed (the irreversible step)

- **What gets built:** the full Postgres schema in ordered SQL migrations — `requirements`, `requirement_lines`, `oems`, `oem_products`, `commitments`, `oem_requests`, `quotes`, `quote_versions`, `quote_version_lines`, `orders`, `order_stages`, `pdi_records`, `deliveries`, `invoices`, `payments`, `documents`, `tasks`, `approvals`, `audit_log`, and the role/claims tables. Enums for every status in `docs/PRD.md`. Foreign keys and `CHECK` constraints that make the PRD's "rules that must hold" structural. Audit triggers writing to append-only `audit_log`. RLS enabled on every table with baseline policies. `security_invoker` set on views. Generated TypeScript types. A seed script producing **two to three months of clearly-flagged demo history plus current data** (owner decision, `docs/ASSUMPTIONS.md`), with an `is_demo` marker on every seeded row.
- **Why here and not earlier or later:** the front end must be typed against it, and every later phase reads it. It cannot be later because a screen built before it is a screen built on a guess. It cannot be earlier because Phase 0 gives the toolchain to run migrations and generate types.
- **Demonstrable when done:** `supabase db reset` applies every migration and reloads seed from scratch; generated types compile; a throwaway dev page lists seeded entity counts; a second test user cannot see the first user's rows (RLS smoke, not a full test).
- **If wrong downstream:** **everything.** A wrong cardinality here is a data migration plus a rewrite of every view, screen and report. This is the step to slow down on, and the one to show a second pair of eyes.

## Phase 2 — Authentication, roles and the app shell

- **What gets built:** Supabase Auth via `@supabase/ssr` (httpOnly cookie sessions), **invite-only** accounts, email confirmation, password reset; Next.js middleware protecting every route; the four roles from `docs/PRD.md` module 11 (owner/management, sales, operations, finance) carried as JWT claims; role-aware navigation and route guards; RLS policies per role; the authenticated shell (top bar with the theme toggle, nav, user menu).
- **Why here and not earlier or later:** auth defines the shell every screen lives inside, and RLS must exist *before* real data flows. Building feature screens first means building them unguarded and retrofitting permission checks — the classic way role bugs ship.
- **Demonstrable when done:** sign in as each of the four roles and see role-appropriate navigation; an unauthorised role is refused at the route *and* by the database; sign-up is impossible without an invite.
- **If wrong downstream:** permission leaks are silent (the happy path looks fine); an open sign-up path is a security defect that no screen reveals. Treat "invite-only" and "RLS denies by default" as Phase-2 exit criteria.

## Phase 3 — Requirements and RFI with line items (the spine)

- **What gets built:** requirement CRUD against generated types and seed data (no live wiring yet); up to 500 line items per requirement; the requirement status set; submission deadlines; document attachment; Zod schemas shared by form and DB constraints; list, detail and form screens; validation that rejects a record with missing required fields and saves nothing.
- **Why here and not earlier or later:** the requirement is the anchor entity — every other record hangs off it. It is deterministic, and it is the first screen that shows the real product shape.
- **Demonstrable when done:** create a requirement with many line items, save, reopen, attach a document; a partial record is refused with a clear reason.
- **If wrong downstream:** every later entity has a foreign key to this one; a wrong line-item cardinality here is caught now rather than in Phase 6.

## Phase 4 — OEM master and sourcing

- **What gets built:** OEM records (products, capabilities, lead time, approval status, contacts, compliance documents); from a requirement, shortlist capable OEMs and record each request and its response; the explicit split between a **firm commitment** and an **availability/quote indication**.
- **Why here and not earlier or later:** coverage (Phase 5) is arithmetic over commitments, so commitments must exist and be categorised first.
- **Demonstrable when done:** shortlist OEMs for a seeded requirement, log a request, record a response, and mark one as a firm commitment versus an indication.
- **If wrong downstream:** if firm and indicative are not distinguishable here, the coverage view silently treats availability as committed — the exact failure `docs/PRD.md` P1 is about.

## Phase 5 — Quantity coverage (the part that has to work hardest)

- **What gets built:** the live `security_invoker` Postgres views computing, per line item, required / firm-committed / indicative / uncovered across multiple OEMs and multiple shipments; the capacity semantics chosen in `docs/ASSUMPTIONS.md` A1; the **commitment gate** that blocks quoting or committing an uncovered balance unless an explicit, reasoned override is recorded; the coverage screen (covered / partly covered / no firm cover, with icons and labels per `docs/DESIGN.md`).
- **Why here and not earlier or later:** it needs requirements (Phase 3) and commitments (Phase 4), and it must exist before anything downstream consumes a quantity.
- **Demonstrable when done:** the screen shows 1,000 = 600 + 400, uncovered 0; removing one commitment flips it to partly covered and the gate refuses to quote the uncovered balance.
- **If wrong downstream:** a coverage view that double-counts or misses indicative-vs-firm shows a plausible "covered" number while the business is exposed. This is the highest-consequence silent failure in the product; it is tested with fixtures whose wrong answer is known.

## Phase 6 — Quotation, pricing and approvals

- **What gets built:** build a quote from a requirement (OEM price, lead time, target margin); **recommended price computed in a Postgres view** while the final bid stays a human field; quote versions; the comparability panel (past bids with won/lost and the winning/losing figures); the `approvals` state machine and its DB constraint; the standard quotation PDF (no letterhead, `docs/DESIGN.md`).
- **Why here and not earlier or later:** it consumes coverage and commitments and must exist before any order.
- **Demonstrable when done:** price a seeded requirement, see comparable past bids, approve a version, export the quotation PDF; a non-approver cannot approve; the app never auto-sets the final price.
- **If wrong downstream:** orders originate only from approved quotes (`docs/PRD.md`: "no orphan PO"), so an approval defect here becomes an order defect.

## Phase 7 — Order, fulfilment, PDI and delivery

- **What gets built:** convert an approved quote to an order (whole history travels); PO and supplier-PO fields; the fulfilment timeline with an owner and expected date per step; PDI recorded as **offered / cleared / rejected**, with a failed or held PDI blocking dispatch; partial deliveries with the outstanding balance visible; delivery-risk flag from expected-vs-committed dates.
- **Why here and not earlier or later:** it needs an approved quote; it is the prerequisite for invoices and payments.
- **Demonstrable when done:** create an order from an approved quote, advance it through stages, record a partial PDI, see the outstanding balance and a delivery-risk flag when a date slips.
- **If wrong downstream:** the lifecycle quantity balances (Phase 8) and the Ask layer both read PDI and delivery state; a PDI that conflates offered with cleared corrupts every downstream quantity.

## Phase 8 — Payments, commission, documents and scheduled reminders

- **What gets built:** partial payments with due dates; one invoice fulfilled by several deliveries; commission earned on the OEM-payment milestone; the document vault with issue/expiry dates and 3–5 year renewal tracking; the **scheduled-job layer** (Supabase `pg_cron` + Vercel Cron) generating in-app `tasks` — seven-day no-response follow-ups, payment-due reminders, document-expiry reminders. **In-app only; no email or WhatsApp** (owner decision).
- **Why here and not earlier or later:** reminders need the records that go stale (quotes, invoices, documents), and commission needs the payment milestone; all of these now exist.
- **Demonstrable when done:** record a partial payment and see the balance; a document crossing its expiry window raises a reminder; a quote silent for seven days produces a task without anyone opening a screen.
- **If wrong downstream:** a mis-timed or duplicate reminder is annoying but visible; a wrong commission milestone is *money* and is silent until reconciliation. Test the milestone rule explicitly.

## Phase 9 — History search and losses

- **What gets built:** Postgres full-text plus `pg_trgm` fuzzy matching over requirements and history, exposed through a view/RPC; the comparable-requirement surface; structured loss reasons captured at close.
- **Why here and not earlier or later:** it searches the records the earlier phases produced; it is a leaf, so nothing depends on it.
- **Demonstrable when done:** search a part number and get ranked past requirements with comparable price and outcome; a deliberately unknown part returns **"no comparable"** rather than a guess; a lost opportunity records a structured reason.
- **If wrong downstream:** a fuzzy search that over-matches returns plausible wrong comparables, which the client may trust. The "no comparable below threshold" rule is the guardrail and must be tested.

## Phase 10 — Dashboard and the Ask layer

- **What gets built:** the morning view (open orders by state, quotes awaiting response, delivery risk, payments pending, OEM responses pending, documents expiring) with counts as text and Recharts where a plot is clearer; the **Ask route handler** mapping question patterns to predefined parameterized queries, returning the answer, its "how counted" definition, and the matching records. **No LLM.**
- **Why here and not earlier or later:** both are read-only projections over everything built above; building them earlier would cement counts against a moving model.
- **Demonstrable when done:** dashboard counts reconcile to the views; asking "how many orders are open?" returns a number with its definition and the records behind it; the whole feature set still works with every AI provider unreachable.
- **If wrong downstream:** presentation only, but a dashboard count that disagrees with the detail screen destroys trust in all of them; counts must come from the same views.

## Phase 11 — Optional LLM translator (explicitly last)

- **What gets built:** an optional, flagged feature where an LLM **only translates** free text into one of the Phase-10 named queries — it never computes a number. Off by default; the key stays server-side.
- **Why here and not earlier or later:** `docs/TECH-STACK.md` C4 makes it the only model-dependent piece; nothing may depend on it, so it is last and behind a flag.
- **Demonstrable when done:** with the flag off, the product is complete; with it on and the provider down, Ask degrades to the deterministic mapper with no loss of correctness.
- **If wrong downstream:** nothing, provided the translator is never on a critical path. That constraint is the whole reason it is last.

---

## The decision most expensive to reverse

**The data model's cardinality: the line item as the unit of quantity, and the chain OEM-commitment → requirement → quote → order → invoice → delivery, with firm versus indicative commitments as separate facts.** Specifically the shape frozen in Phase 1 and consumed in Phase 5. Reversing any of it after real data exists means a schema migration *and* a rewrite of the coverage views, every screen, and every report. The global-versus-per-order capacity semantics (`docs/ASSUMPTIONS.md` A1) is part of this: it is modelled as an explicit quantity plus a commitment ledger so it can be switched by configuration, but the ledger itself is the irreversible part.

Everything else is cheap by comparison: the UI can be restyled, the ask patterns can be extended, the LLM can be removed.

## Steps that could silently half-work

These are the places where the build can look successful and be wrong.

| Step | How it half-works | Guard |
|---|---|---|
| Phase 5 coverage views | A join double-counts or treats an indication as firm; the screen still shows a confident "covered". | Fixtures with a known answer, including one case where a wrong join flips the result. |
| Phase 5 lifecycle balances | An aggregation is right at full delivery and wrong at the first partial event. | Fixtures with partial deliveries and partial payments. |
| Phase 2 RLS | A policy is too broad; the happy path hides it. | A second test user must fail to read the first user's rows. |
| Phase 1 audit triggers | They fire on update but not insert/delete; the trail looks fine until audited. | Insert, update and delete each produce exactly one audit row. |
| Phase 6 quotation PDF | The template renders but totals a stale or unrounded figure. | Assert the PDF's totals against the pricing view. |
| Phase 9 fuzzy search | Over-matching returns a plausible wrong comparable. | Below-threshold queries return "no comparable". |
| Phase 2 invite-only auth | A stray signup path leaves registration open. | Assert a non-invited sign-up is refused. |
| Any phase using seed data | Demo data is shown as if real. | Every seeded row carries `is_demo`; the UI marks demo data, mirroring the reference app's "Remove demo data". |

---

## Contradictions and decisions this plan rests on

Found while planning; raise any of these before the phase that depends on them.

1. **"Front end first" vs the data model** — reconciled above: schema first, front end against seed data, wiring after.
2. **No email reminders vs "automatic follow-up tasks"** — resolved as in-app tasks only (owner decision, `docs/ASSUMPTIONS.md`). The wording "automatic follow-up" in `docs/PRD.md` must not be read as outbound messaging, which the same document excludes as baseline.
3. **Demo history presented as real** — because history is mock for now (owner decision), the loss and bid-intelligence features demonstrate on seeded data. They must be labelled as demo, or a viewer will read fabricated win/loss numbers as fact.
4. **"No automatic final bid price" vs a "recommended price"** — resolved: recommended lives in a view, final stays human (Phase 6).
5. **`docs/PRD.md` §4 lists the remaining open business questions** (capacity semantics A1, money flow A5, trustworthy columns A8). Phase 1 freezes tables that encode A1 (the commitment ledger) and A5 (the invoice/payment/commission flow), and Phases 5 and 8 consume them. Treat **A1 and A5 as inputs to Phase 1**: if either is overturned when Ram is available, it is a Phase 1 migration plus changes in Phase 5/8. Phase 0 is unaffected either way.

---

## Test and coverage gates (detail in `docs/test-plan.md`)

- Unit tests are written as each phase is built, but run at gates, not on every change: end of each phase, before any demo, whenever a shared module changes (coverage views, RLS, validation, pricing, search), and before deploy.
- Target ~80% coverage on the pure-logic modules where it makes sense (coverage arithmetic, pricing, validation schemas, date/risk logic, Ask pattern mapping). UI glue, config and generated types are excluded.
- Phases 1, 2, 5 and 8 carry the risk; their tests are the mandatory ones.
