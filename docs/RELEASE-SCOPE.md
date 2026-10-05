# RELEASE-SCOPE — SHIPS NOW vs PHASE TWO

**Prepared:** 2026-10-05. **Build window:** one session. **Inputs:** `docs/PRD.md`, `docs/TECH-STACK.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/DESIGN.md`, `docs/ASSUMPTIONS.md`.

**The line, in one sentence:** *what ships now is the part of the product that needs no account I do not hold, no waiting period, and no client decision I have not received — the frozen data model, the design system, the requirements spine, sourcing, the coverage gate, the quote draft and the morning view, all demonstrable on clearly-marked demo data; everything that writes to a shared database, authenticates a person, sends anything, or needs a credential I do not have is Phase Two.*

This document is the argument for that line, not a summary of it. Where the build and this document disagree, the document wins until the owner changes it.

---

## 0. The three cut rules, applied literally

From the brief to this pass:

1. **Depends on an approval/account/credential I do not have today → cut.** Verified today: the Supabase project `cvkuycqqxyecucyuoqvs` is live (`GET /auth/v1/health` → 200) but **empty** — `GET /rest/v1/requirements` → `404 PGRST205` (table does not exist); only a default `public.events` table is present. The `.env` holds a **publishable/anon key only**; `GET /rest/v1/` → `401 "Secret API key required"`. There is **no `supabase` CLI, no `psql`, no Docker, no DB password, no service-role key**. No Vercel CLI or token exists. Therefore: **any migration pushed, any user invited, any storage bucket created, any deploy, is impossible today.** This is not caution; it is a wall, recorded in §6.
2. **Cannot be finished to a standard I would show a client in one session → cut.** This removes order/PDI/delivery, payments/commission, documents/reminders, auth/RLS/audit, PDF export, history search, and the Ask layer. Each is a multi-day block on its own; the plan itself calls Phases 1, 2, 5 and 8 the risk-carrying ones.
3. **Impressive but not what they asked for → cut.** This removes the LLM translator, a generic document engine, a competitor database, employee KPI scoring, decoration charts, and multi-currency/export/freight. The first four are already excluded by `docs/PRD.md` §5; the last by A15.

**The direction of the line is deliberate.** I would rather be corrected upward — you saying "that one you cut is actually safe to do" — than ship a feature that looks finished and is not. Every item below that survives has a definition of done specific enough that you can tell me I am wrong about it.

---

## 1. SHIPS NOW

These ship as a **front end against a frozen model and clearly-marked demo data, with no live-data wiring.** That sequencing is not my invention: `docs/IMPLEMENTATION-PLAN.md` opens by reconciling exactly this — *"schema first, front end against seed data, wiring after"* — because screens built before the model is frozen are rewritten when the real cardinality lands.

| # | Feature | What is actually there | "Done" — specific enough to disagree with |
|---|---|---|---|
| S1 | **Design system + theme shell** | Next.js App Router, TypeScript `strict`, Tailwind tokens from `docs/DESIGN.md`, `next-themes` light/dark with no-flash script, shadcn-style primitives, lucide-react, one Recharts bar. | `/style` renders every primitive (button, input, badge for all five status pairs, table, chart) in **both** themes; toggling repaints with no flash on reload; system default honoured; **zero raw hex outside `globals.css`**; body text ≥ 4.5:1 and UI ≥ 3:1 in both themes. *Disagree point:* "professional look" is subjective, so the objective test is tokens-only + the contrast numbers, not taste. |
| S2 | **Frozen data model** | Ordered SQL migrations defining every table, enum, FK and `CHECK` from the plan's list; the per-line-item coverage view; the audit trigger; RLS enabled with baseline policies; each view `security_invoker = true`. A hand-written TypeScript mirror of every table. | Every entity in `docs/IMPLEMENTATION-PLAN.md` Phase 1 exists as a migration; `npx tsc --noEmit` passes against the mirrored types; the coverage view computes `required / firm / indicative / uncovered` per line item. **Status: written, not applied** — see §6. *Disagree point:* "frozen" means an A1/A2/A3 overturn is a config change, not a rewrite — if that is not true, the model is wrong. |
| S3 | **Requirements / RFI spine** | Create / list / detail a requirement (the anchor entity) with its status set and submission deadline; N line items, each with part number, quantity, deadline and per-line status; document attachment metadata. | A record missing a required field (customer, product, quantity) is **refused with field-level reasons and saves nothing**; a saved requirement reopens with all line items intact; statuses come from the fixed enum, never free text. *Disagree point:* the 500-line claim is demonstrated at 500 rows in a paginated table, not asserted. |
| S4 | **OEM master + sourcing** | OEM records with products, capabilities, lead time, approval status, contacts and compliance-document metadata; from a requirement line, a recorded OEM request and its response. | A response is stored as **either a firm commitment or an indication, as separate facts**; a screen can never sum a firm and an indicative into one "available" number. *Disagree point:* the test is COV-03 — an indicative 400 against a firm 600 must read covered 600, uncovered 400. |
| S5 | **Coverage panel + commitment gate** | The per-line coverage view rendered as **firm / indicative / uncovered**, split by OEM; the gate that refuses to quote the uncovered balance unless a reasoned override is recorded. | Fixtures with known answers pass: `1000 = 600 firm + 400 firm → covered` (COV-01); remove 400 → **partly covered, uncovered 400** (COV-02/07); `600 firm + 400 indicative → covered 600, uncovered 400` (COV-03); multi-shipment 300+300 counts once (COV-04); quoting an uncovered balance is **blocked** (COV-05); fully covered is **allowed** (COV-06). *Disagree point:* "uncovered" must mean the same number on the detail screen and the dashboard, because both read one definition. |
| S6 | **Quote display + advisory pricing** | The quotes already on record are shown line by line: a **recommended price** labelled advisory, with its formula (OEM price + target margin) next to the **final price as a human field**. | For every quote on record the recommended figure is visibly advisory and the final figure is a human-entered field; **there is no control anywhere that sets or submits the final price** (PRICE-02). Creating and saving a *new* quote is Phase Two — it needs the database (see P2-5). *Disagree point:* if you can point at anything that could auto-fill the final bid, the feature is wrong. |
| S7 | **Today / morning view** | Counts as text (open orders, quotes awaiting response, payments pending, documents expiring, OEM responses pending) plus two Recharts (win/loss trend, loss reasons), all read from the same repository the detail screens read. | Every count on `/` reconciles to the record list behind it — no screen computes its own total. *Disagree point:* a count that disagrees with its detail screen destroys trust in all of them, so the reconciliation is the test. |
| S8 | **Demo-data labelling** | Every seeded row carries `is_demo`; a persistent banner marks the whole dataset as demo. | No screen presents a demo figure as real; the banner is visible on every data screen without scrolling. (Guard from the plan's "steps that could silently half-work".) |
| S9 | **Tests** | Vitest: coverage fixtures, pricing, Zod validation, date/risk, and the gate. | `npm test` passes; each coverage fixture fails if the join is wrong; the gate test **fails if an uncovered quote is allowed**. A test that asserts bad data is saved is a bug in the test (`AGENTS.md` §3). |

**What "ships" means here, precisely.** The above is runnable locally and demonstrable, and it is the real UI on the real frozen model. It is **not** a working CRM: nothing it shows is persisted, and no one can log in. That is stated on every screen by the demo banner, and again in §6.

---

## 2. PHASE TWO — every cut, what the client loses, and the sentence

The sentence is the one I will actually say. It is not a euphemism; if I cannot say it plainly, the cut was wrong.

### P2-1 — Supabase persistence, migrations applied, RLS, audit triggers
- **Why cut:** needs the Supabase secret key / DB password / CLI, none of which I hold. Applying an unverified migration to a live defence client's project without the owner present is not a risk I will take.
- **What the client loses:** the shared, durable record that survives a lost laptop; roles enforced in the database; the "what, who, when" audit trail. Today the data does not leave the browser tab.
- **Say:** *"The app you'll see today runs on demo data in the browser. Nothing you type is saved, so please don't put real enquiries in it yet. Turning on the database is the first job next session — it needs the Supabase admin key, which I don't have."*

### P2-2 — Authentication and the four roles (invite-only)
- **Why cut:** invite-only accounts need the service-role key to issue invites; there are no confirmed users. Login without a database is theatre.
- **What the client loses:** no sign-in; anyone with the URL sees the screen; no role differences between owner, sales, operations and finance.
- **Say:** *"There is no login yet. Treat this as a walkthrough on my machine, not a system anyone should open. Logins and the four roles are a day's work once I have the project keys."*

### P2-3 — Order / PO, PDI, delivery, delivery-risk
- **Why cut:** it is the block after the quote, it is substantial, and it is only safe to build once the quote-to-order hand-off is wired.
- **What the client loses:** nothing can be traced from a won quote to a delivered order; no offered/cleared/rejected PDI; no partial-delivery balance; no early "where is our order?" flag.
- **Say:** *"Everything up to the quote is here. Orders, PDI and delivery are not in this build, so don't use it to track a live order yet. That's the next block."*

### P2-4 — Payments, commission, documents, scheduled reminders
- **Why cut:** commission depends on Open Question 2 (when it is earned), which is **unconfirmed**; document scope depends on Open Question 3. The plan's own rule is not to hard-code a rule the brief flags as unconfirmed. Reminders also need records that go stale, which need persistence.
- **What the client loses:** no partial payments or due dates; no commission surfacing; no document vault or expiry reminders; **the seven-day follow-up queue — the feature that attacks the 3–4 hours a day — does not run yet.**
- **Say:** *"The system does not yet chase anyone or remind anyone. The seven-day follow-up and the certificate-expiry reminders you asked for are not running, so keep your current calendar for those until phase two."*

### P2-5 — Creating/saving a quote, PDF export, and the approvals state machine
- **Why cut:** creating or saving a quote needs persistence; PDF generation and a blocking approval workflow are each a day; without persistence, an "approved" quote is a flag on a page that vanishes. Approvals are a Phase-2 job by the plan's own ordering.
- **What the client loses:** cannot create a new quote or save a price change; cannot export or print a quote; no versioning (old version intact); no approval step; no "no orphan PO" enforcement.
- **Say:** *"You can see the quotes on record and how the price is suggested, but you cannot create a new one, export it or approve it yet. Keep preparing the actual quotation in Word or Excel for now; the day saving, approval and PDF export land, you can retire that."*

### P2-6 — History search, comparable bids, structured loss reasons
- **Why cut:** it needs the Postgres full-text + `pg_trgm` layer and real records to search; on the demo seed it would return fabricated comparables, which is worse than nothing. A8 (trustworthy columns) is owner-resolved but not Ram-confirmed.
- **What the client loses:** no searchable history; no comparable past bids with won/lost prices; no reportable loss reasons — the second-strongest target in the PRD is absent.
- **Say:** *"The screen will not yet tell you what you quoted last time for the same part. Until search is on, don't rely on it for pricing — check your spreadsheets as you do now."*

### P2-7 — Live dashboard reconciliation and the Ask layer
- **Why cut:** both are read-only projections over real data; on demo data they are a preview. The Ask layer also needs the parameterized-query set that only exists once the records do.
- **What the client loses:** the numbers will not move with real work; there is no plain-language question box.
- **Say:** *"The dashboard today is a preview on demo numbers. It becomes trustworthy only when it reads your real records, and the plain-language question box is not in this release."*

### P2-8 — Email / WhatsApp / GeM-portal automation
- **Why cut:** the brief rules it out as baseline (*"No government-portal automation or auto-messaging as a baseline requirement"*); GeM/WhatsApp also need third-party approval and a waiting period I cannot shorten.
- **What the client loses:** no auto-send of quotations, no auto-notification of due dates, no portal or WhatsApp integration.
- **Say:** *"Auto-sending and WhatsApp/GeM reminders are deliberately not in this build — your brief puts them out of the first version. They're on the phase-two list once you decide you want them."*

### P2-9 — Vercel deployment, backups, export
- **Why cut:** no Vercel token or CLI. Deploying a defence client's screen with no login and no database would publish an open page; doing that is a security defect, not progress.
- **What the client loses:** no public URL to share; no backup or export routine.
- **Say:** *"This runs on my machine today. I haven't put it on the internet, because deploying without logins and a real database would leave an open page with your business on it. The public URL comes after persistence and auth."*

### P2-10 — Optional LLM translator
- **Why cut:** it was always Phase 11 and off by default (C4: the product must work when every AI provider is down; it must never compute a number).
- **What the client loses:** nothing at launch — free-form natural-language questions.
- **Say:** *"There is no AI in this build, on purpose: it has to keep working when the AI is down, and it must never invent a number."*

---

## 3. Where a feature is half-deliverable, the honest half

| Feature | The dishonest version | The version that ships |
|---|---|---|
| Sending email | A "Send" button that is greyed out or fails | **No send control exists anywhere.** No button, no tooltip, no "coming soon". |
| Exporting a PDF | A disabled "Export PDF" button | The quote is shown on screen with an explicit note that it is a draft, not exported, and **no export control**. |
| Coverage | A green "Covered" badge over an unverified mock arithmetic | Coverage shown on screen with the whole dataset under a persistent **DEMO** banner; the arithmetic is the frozen view definition, and the live engine is Phase Two. |
| History search | Fabricated "comparable" rows from the seed | History search is **absent** from the navigation entirely in 0.1. |
| Plain-language Ask | A text box that guesses | **No text box.** The morning view is fixed named counts only. |

The rule behind the table: an absent feature is a known gap. A greyed-out button is an unknown one — and the first person who wonders whether it fired is the client.

---

## 4. What I am not shipping even though it would look impressive

- A generic document generator (brief: *"not a generic document generator"*).
- Charts for decoration — only the two plots the client named (win/loss, loss reasons).
- A competitor database (only competitor-preference as a loss reason is required).
- Employee KPI scoring (in the workbook, not the brief; dangerous on one person's data).
- Multi-currency / export / freight (A15: workbook-only).
- Any portal-automation demo, in any form.

---

## 5. What would move an item across the line (the shortest path)

Listed so the line is a decision, not a mood. If you provide one of these, the named item can ship next session:

| Provide | Unlocks |
|---|---|
| Supabase **secret key** (or DB password) and 10 minutes of your presence | P2-1 (migrations applied, RLS, audit) |
| Confirmation of **A1** (capacity global vs per-order) with one real example | S5 moves from "model" to "live engine"; otherwise the engine may be rebuilt |
| A **Vercel token** | P2-9, *after* P2-1 and P2-2 |
| Confirmation of **A5** (who invoices whom; when commission is earned) with one real transaction | P2-4 (commission); unblocks the money-flow model |
| Confirmation of **A3** (what the eight lifecycle quantities mean) | P2-3 (order/PDI/delivery balances) |
| A **trustworthy part-number key** or a decision to start clean | P2-6 (comparables); otherwise it returns "no comparable" on most lines |

---

## 6. BLOCKED — recorded verbatim per `AGENTS.md` §7

```
BLOCKED: apply the schema to the live Supabase project
  Tried:      curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/requirements?select=*&limit=1" -H "apikey: <publishable>" -H "Authorization: Bearer <publishable>"
  Got:        404 {"code":"PGRST205","message":"Could not find the table 'public.requirements' in the schema cache"}
              and  GET /rest/v1/  ->  401 {"message":"Secret API key required"}
              project ref is now ekenmwvyrjtkvlmjecbl (owner updated .env, 2026-10-05); it has NO tables.
  Wall:       the key in .env is still the publishable/anon key (sb_publishable_...). A publishable key cannot
              run DDL (CREATE TABLE) — by design. Applying migrations needs the database password / connection
              string, or a Personal Access Token (sbp_...) to the Management API. Neither is present.
  To unblock: owner provides ONE of: (a) the database password (Project Settings -> Database), or (b) a Personal
              Access Token; then `npx supabase db push`. Or the owner pastes supabase/apply_all.sql (818 lines,
              generated from 0001-0005) into the dashboard SQL editor.
```

```
BLOCKED: deploy the app to a public URL
  Tried:      which vercel   ->  "no vercel cli";  ls ~/.vercel  ->  "no vercel config"
  Got:        no CLI, no token
  Wall:       deployment requires the owner's Vercel account; and deploying before P2-1/P2-2 would publish an unauthenticated page.
  To unblock: owner provides a Vercel token AFTER persistence and auth exist.
```

```
BLOCKED: confirm A1 / A5 / A8 with the client
  Tried:      read docs/ASSUMPTIONS.md; no client confirmation recorded (all fifteen CLOSED-BY-ASSUMPTION)
  Got:        none confirmed; A5 and A8 are owner-resolved only
  Wall:       these are business facts only Ram can supply with a real example; guessing them is the failure the PRD §4 warns about.
  To unblock: 30-minute review of A1, A2, A3, A4, A5, A8 against one recent requirement, commitment, order and payment.
```

---

## 7. The claim I am making, and how it could be wrong

**Claim:** the SHIPS NOW set is the largest honest slice available in one session without a credential I do not hold.

**How it could be wrong:** if the owner actually holds the Supabase secret key and simply kept it out of `.env` for safety, then P2-1, P2-2 and P2-4 are *not* hard-blocked and the whole line should move down — the app should persist to Postgres, and the follow-up queue (the client's biggest daily cost) should be built now. I have assumed the key is absent because it is absent from the environment and no CLI or credential exists; if that assumption is wrong, this document is wrong in the most consequential place, and I would rather be corrected there than anywhere else.
