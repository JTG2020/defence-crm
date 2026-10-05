# TECH-STACK

Standalone stack decision. This document names technology only; it deliberately does not restate requirements and does not order the build.

**Revision note (2026-10-05):** the earlier version of this file chose browser-local IndexedDB because the constraints then said "no backend, no database server, no auth; localhost only; no deployment." Those constraints are withdrawn. Hosting and a managed backend are now allowed. This revision replaces browser-local storage with **Supabase**, and changes the flagged risk: it is no longer data loss in one browser profile, it is **network dependence** (see "Before the table"). This file is the only document the change affects; `docs/PRD.md` and `docs/ASSUMPTIONS.md` are unchanged.

**Correction (2026-10-05):** an interim draft of this file claimed the dashboard needed "no chart library at v1" and that the reference app had no charts. That was stated without verification and was wrong. The reference app bundles **Recharts** and uses **lucide-react** icons; both are now adopted above.

**Revision 2 (2026-10-05):** the frontend is switched from Vite (static SPA) to **Next.js App Router on Vercel**. The deciding factor is httpOnly-cookie auth via `@supabase/ssr`, which a static SPA cannot provide without a server; the client accepts Vercel-only deployment, so the "or Netlify" portability that favoured Vite is dropped. Consequences: the Ask layer moves from a Supabase Edge Function to a **Next.js server route handler**, and server-side Supabase clients replace the client-only pattern. Vite is retained below only as the rejected alternative. Light/dark theming and the color tokens are fixed in **`docs/DESIGN.md`**.

**Fixed constraints referenced below**

- **C1** A web app deployed to **Vercel** (Next.js native runtime). No self-managed servers; Netlify is no longer targeted.
- **C2** Data, auth and files on Supabase (managed Postgres). No self-hosted database.
- **C3** Runs in a browser on a laptop that may be on hotel wifi.
- **C4** Must stay usable when every AI provider is rate limited or down.
- **C5** Built by an agent from a written brief, not by a human who can improvise.

---

## Before the table: what changed, and the new risk

Removing the no-backend constraint **fixes the severe problem in the previous version**: data now lives in shared Postgres, survives a lost laptop, and the PRD's roles, blocking approvals and audit trail ("what, who, when") can be real. This is the right call. Two trade-offs replace the old one:

1. **Network dependence (C3 vs C2).** Supabase is online. On hotel wifi, reads must still show the last-known data and **a failed write must never wipe a half-typed form**. This is handled by a persisted query cache (TanStack Query) and by treating every mutation as retryable with the form preserved. It is a real constraint on the build, not a footnote. A fully offline write queue is out of scope (§ Exclusions); the app degrades to read-only with a clear message.
2. **Vendor lock-in to Supabase (C2).** Accepted deliberately: it is the fastest path to Postgres + auth + storage with one vendor and matches the reference app. The escape hatch is that schema ships as plain SQL migrations, so the data is portable even if the backend changes.

One honesty note carried from the PRD: C4 still stands, so AI must never be on the critical path.

---

## Reference app (the friend's build)

`https://pixel-perfect-display-4154.lovable.app/` — accessible (fetched 2026-10-05, HTTP 200, title "Today — Requirement Desk").

Detected from its HTML and JS chunks:
- **Vite + React**, route modules `requirements._id`, `orders._id`, `quotes`.
- **Supabase** data layer: `from('requirements').select('*')`, `from('commitments')`, etc. in `data-*.js`.
- **TanStack Query** (`queryOptions-*`), **shadcn/Radix + Tailwind**, **Recharts** for charts (`BarChart-*.js` chunk; `routes-*.js` and `history-*.js` import it), **lucide-react** for icons (per-icon chunks `calendar-clock`, `shield-alert`, `check`), **Google Fonts from a CDN**.

**Now reusable in full:** its screen map (Today, Requirements, OEMs, Quotes, Orders, Payments, Documents, History/losses, Ask, Activity) **and its data layer and model** — Supabase + TanStack Query, which the new C2 permits. Its **Vite build does not transfer**, because we render these screens in Next.js; the screens, routes and schema do. Table vocabulary to mirror: `requirements`, `requirement_lines`, `oems`, `oem_products`, `commitments`, `oem_requests`, `quotes`, `quote_versions`, `quote_version_lines`, `orders`, `documents`, `gov_log`, `tasks`, `audit_log`. That model matches the PRD's split of *firm commitment* vs *availability request* and exercises the coverage engine the same way.

**Still do not copy:** the CDN Google Fonts (self-host fonts — see rows for C3), and its demo-data seed path as production logic.

---

## The stack

| LAYER | CHOICE | THE CONSTRAINT THAT FORCED IT |
|---|---|---|
| Language | **TypeScript, `strict: true`** | **C5** — an agent writes from a written brief with no human to improvise; the compiler is the only reviewer. Rejected plain JavaScript: errors surface at runtime, in front of the client. |
| App framework | **React 18** | **C5** — largest corpus of agent-verified patterns and largest maintainer pool for handoff; the reference app is React, so its components transfer. Vue/Svelte are close; React wins on agent reliability for a literal brief. |
| Framework + build | **Next.js (App Router)** | **C1** — the client chose Vercel-only and wants httpOnly-cookie auth via `@supabase/ssr`; Next.js is Vercel's native framework. This reverses the earlier Vite pick: a static Vite SPA deploys to Vercel fine but cannot hold a session in an httpOnly cookie without a server. Rejected Vite: it was the right call only while "or Netlify" and cookie-less auth held. The reference app is Vite, so only its screens and data model transfer, not its build. |
| Hosting / deploy | **Vercel** (config and secrets via the Vercel dashboard) | **C1** — App Router runs natively on Vercel; Netlify is no longer a target. |
| Database | **Supabase Postgres** | **C2** + PRD — shared, durable, queryable history for coverage, bids and losses. Rejected self-hosted Postgres/MySQL: **C2** forbids operating a database. Rejected Neon + separate auth: two vendors instead of one. |
| Auth | **Supabase Auth via `@supabase/ssr`** (httpOnly cookie sessions) | **C2** — auth from the same platform that RLS understands, so identity and data rules live in one place; **C1** — the cookie session is the specific capability that decided Next.js over Vite. Rejected Clerk/Auth0/NextAuth: a second vendor for no gain. |
| Authorization | **Postgres Row-Level Security + the four roles in the brief** — owner/management (full access, approvals, reports), sales (RFIs, quotations, assigned accounts), operations (delivery, PDI, document uploads), finance (invoices, payments, commission). The workbook's `Admin` is the owner/management seat, not a fifth persona. | **PRD** module 11: *"Roles: owner or management, sales, operations, finance."*; **C2** — with RLS, permissions are enforced in the database, not just hidden in the UI, which makes the audit trail meaningful. |
| Approvals | **An `approvals` table + a small state machine (requested → approved/rejected, with actor and timestamp); a DB constraint stops a quote, PO or compliance item reaching `approved` without an approved row** | **PRD** module 11 — approvals on quotes, documents, orders and compliance items; **C2** — approval state must live in the database so constraints and RLS enforce it, not just hide a button in the UI. |
| Audit trail | **Postgres triggers writing to an append-only `audit_log` (entity, entity_id, action, before/after, actor from `auth.uid()`, timestamp)** | **PRD** — "an audit trail of material changes: what, who, when"; **C2** — triggers capture every change regardless of which screen or route made it, so "who" cannot be silently omitted by app code. Rejected app-level logging: easy to bypass and to forge. |
| File / document vault | **Supabase Storage**, with metadata rows in Postgres | **PRD** — documents and certificates with expiry; **C2** — files belong with the managed backend, replacing the previous browser-blob design. |
| PDF generation (quotation, invoice) | **`@react-pdf/renderer` in a server route handler, rendered from the record data; one standard template, no letterhead** | **A10 decision (owner, 2026-10-05)** — quotation is a standard app document, invoice is data-derived, no letterhead to match; **PRD** document vault; **C1** — Vercel functions cannot reliably run headless Chrome, so a pure-JS renderer is required. Rejected Puppeteer / Playwright-as-print: heavier than the job and fragile on serverless. |
| Data access | **`@supabase/ssr` server client in RSC / route handlers, plus a browser client for live UI; generated DB types** (`supabase gen types typescript`) | **C2** — server reads use the caller's session so RLS applies; **C5** — generated types turn column drift into a compile error. |
| History search | **Postgres full-text (`tsvector` + GIN) plus `pg_trgm` for fuzzy part-number/name match, exposed through a view or RPC** | **PRD** module 9 — "search all history for a comparable requirement"; **owner decision 2026-10-05** — fuzzy as well as exact. Rejected `ILIKE '%…%'` scans: unranked and unusable across the seeded history. Caveat (A8): return "no comparable" below threshold rather than guessing. |
| Server-state / caching | **Server components fetch initial data; TanStack Query manages client cache, mutations and optimistic updates, with a persisted cache** | **C3** — on flaky hotel wifi, screens must render last-known data instantly and retry in the background; **C5** — the reference app proves the pattern. Still the mechanism that keeps a failed write from emptying a form. |
| Schema + migrations | **Supabase SQL migrations committed to the repo** | **C2** — the database is managed, but its shape is code; **C5** — the agent applies literal, ordered SQL files. Plain SQL is also the portability escape hatch from vendor lock-in. |
| Validation | **Zod**, one schema per entity, shared by forms and imports; matching `NOT NULL`/`CHECK` constraints in Postgres | **PRD/AGENTS.md** — "reject a record with missing required fields, save nothing"; **C5** — one declaration, enforced in the client and again at the database (validate at the edge). |
| Forms | **React Hook Form** | **PRD** — up to 500 line items per requirement plus approval flows need controlled, performant forms. Rejected Formik: slower, less maintained. |
| Large tables (500 line items) | **TanStack Table + TanStack Virtual (headless)** | **PRD** — "up to 500 part numbers" must stay scrollable, sortable and pageable. Rejected AG Grid / MUI DataGrid: heavy and licence/tie-in — flag: heavier than the job. |
| Components + styling | **Tailwind CSS + shadcn-style components over Radix primitives** | **C5/handoff** — components are source you own, so there is no version drift; Radix gives touch- and ARIA-correct primitives. Rejected MUI / Ant Design / Chakra: heavy and version-churning — flag: heavier than the job. |
| Icons | **lucide-react** | **C5** — the shadcn default and the reference app's icon set, tree-shaken per icon. Rejected icon fonts (Font Awesome): heavier and not tree-shaken. |
| Charts | **Recharts** | **PRD** — the dashboard the client wants is visual (win/loss trend, loss reasons, payment aging, pipeline funnel), so charts are a requirement, not decoration; **C5** — Recharts is the React/shadcn default and the reference app's verified choice (`BarChart-*.js`). Rejected Chart.js, Highcharts, ApexCharts, AG Charts: none is the React default, and Highcharts/AG Charts are licence-bound. |
| Fonts + static assets | **Self-hosted fonts, bundled; no third-party runtime CDN** | **C3** — hotel wifi and offline-ish use; the reference app's Google Fonts CDN is the specific thing not to copy. Vercel's own asset CDN is fine; third-party runtime CDNs are not. |
| Dates | **date-fns** | **PRD** — submission deadlines, 7-day follow-ups and 3–5 year certificate/renewal math. Rejected moment.js: unmaintained and heavy — flag. |
| Coverage engine (the hard part) | **Postgres views are the single source of truth for coverage; the app only reads them.** Live coverage is a **plain view** exposing per line item required / firm-committed / indicative / uncovered; heavy historical aggregates (win/loss, aging, OEM performance) may use **materialized views refreshed on a schedule**. No coverage math is duplicated in TypeScript. | **PRD** — "the part that has to work hardest", and "show what is still uncovered" must never disagree between the detail screen, the dashboard and the Ask layer; putting it in one place makes that structural. **C5** — one SQL definition an agent can read and a human can audit. Rejected materialized views for _live_ coverage: a snapshot is stale between refreshes, which defeats the requirement. Caveat carried into the risks: views must be declared `security_invoker = true` so the querying user's RLS applies. |
| Pricing / margin | **Recommended price computed in a Postgres view/function from OEM price, lead time and target margin; the final bid stays a human field** | **PRD** module 4 — the quote is built from "OEM price, lead time, target margin, recommended price", while "no automatic final bid price" is mandatory. Keeping the formula in SQL means the quote screen and the Ask layer compute it identically, matching the coverage principle. |
| Dashboard / morning view | **Counts and lists, plus Recharts for the visual KPIs** | **PRD** — the morning view must answer "how many orders are open", "payments pending", "documents expiring" (counts, no chart needed) *and* show win/loss and loss reasons, which read as charts; the reference app already renders these with Recharts. Keep the counts as text and use Recharts only where a plot is genuinely clearer. |
| Ask layer (plain-language questions) | **A Next.js server route handler** that maps question patterns to **predefined parameterized queries / Postgres functions**, returning the answer, the "how counted" definition, and the matching records. **No LLM in v1.** It runs **as the calling user** (`@supabase/ssr` session), never on the service-role key. | **C4** — must work when every AI provider is down, so no AI on the critical path; **PRD** — "answer from the stored data, never invented", which the "how counted" string enforces. The user-scoped rule is **C2**: if the router runs privileged it bypasses RLS and can leak other users' rows. Rejected LLM-as-engine: rate limits would break a core feature and it can fabricate the numbers the client checks. A later LLM may **only** translate text into one of these same queries. |
| Theming (light / dark) | **`next-themes` + shadcn CSS variables in Tailwind (`class` strategy, system default)** | **Requirement** — the client asked for dark/light mode. Exact tokens, palettes and contrast rules are fixed in **`docs/DESIGN.md`**; components consume semantic tokens only. Rejected hardcoded per-component colors and a second theming library. |
| AI credential handling | **Server-side only: a Vercel environment variable read by a route handler; the browser never sees it** | **C2 (now with a backend)** — a secret can finally be kept off the client. This is the one place the new constraints strictly improve on the previous design. |
| Realtime (optional) | **Supabase Realtime for the follow-up/dashboard refresh** | **PRD** — the morning view and follow-up queue should not need a manual refresh. Optional: the app must work by polling/refetch without it. |
| Scheduled jobs | **Supabase `pg_cron` for in-database jobs (matview refresh, commission-milestone checks) and Vercel Cron for HTTP jobs; jobs write rows into `tasks`. Reminders are in-app only** (owner decision 2026-10-05) — no email/WhatsApp provider. | **PRD** — "automatic follow-up tasks, for example no response for seven days", plus payment-due and document-expiry reminders, must appear without anyone opening a screen. Rejected client-side timers: they fire only while a browser is open. |
| Backups / portability | **Supabase automated backups + a JSON/SQL export routine for the client** | **C2** — the record is now durable, but the client should be able to extract it. Complements the plain-SQL migration escape hatch. |
| Tests | **Vitest + Testing Library; coverage math has required unit tests; a small integration suite against a Supabase test project/branch** | **C5** — for an agent-built system, tests are the only proof (AGENTS.md §3: "would this test fail if the feature were wrong?"). Rejected Jest: avoidable config friction with Next.js. |
| Package manager | **npm** | **C5 / handoff** — ships with Node, no extra tool for a less-experienced maintainer. Rejected pnpm/yarn. |
| Lint + format | **ESLint + Prettier, pinned versions** | **C5** — keeps literal agent output consistent and reviewable on handoff. |
| Env + config | **`.env.local` in development; Vercel dashboard env in production. Anon key is public (RLS-protected); service-role key never leaves the server.** | **C2/C1** — the split between public anon key and privileged service key is the security boundary of a Supabase app. |
| Telemetry | **None** | **C3/defence client** — nothing phones home; host access logs only. |

---

## HARD EXCLUSIONS

An agent left to choose reaches for the popular option by default. These are banned outright.

| Must not use | Reason |
|---|---|
| Self-hosted Postgres/MySQL, Express, Nest, or any server **you operate** | **C2** forbids running your own server; Supabase is the backend. Next.js route handlers on Vercel's managed runtime are the allowed server surface, not a self-hosted app server. |
| Neon, Firebase, PocketBase, or a second data platform beside Supabase | **C2** — one managed backend; two platforms means two auth systems and two migration stories. |
| `localStorage` / IndexedDB as the **record** of domain data | **C2** — Supabase Postgres is now the single source of truth. Browser storage is allowed only for UI preferences and the TanStack Query cache. |
| The Supabase **service-role key** in the browser bundle or in any `NEXT_PUBLIC_` variable | **C2** — it bypasses RLS and would expose the whole database. Only the anon key is public; privileged work goes through a server route handler. |
| RLS disabled, or a table created without policies | **C2/PRD** — with a public anon key, RLS *is* the authorization. A table without policies is a public table. This is the single largest correctness risk for an agent. |
| A Postgres view without `security_invoker = true` over RLS-protected tables | Views otherwise execute as their owner and can bypass the caller's RLS, turning a read helper into a data leak. Set `security_invoker = true` on every view. |
| Recomputing coverage in the client or any app layer instead of reading the Postgres view | **PRD** — coverage must agree across the detail screen, the dashboard and the Ask layer; two implementations will drift. One SQL definition, read everywhere. |
| Materialized views for **live** coverage | A matview is a stale snapshot; "what is still uncovered" must be current. Plain views for live coverage; matviews only for scheduled historical aggregates. |
| The service-role key on any path triggered by a user, including the Ask route handler | **C2** — it bypasses RLS. The Ask router and every user-facing query must run with the caller's session. |
| Clerk, Auth0, NextAuth, Supabase Auth plus any second auth system | **C2** — one identity source that RLS understands. |
| Prisma, Drizzle, TypeORM, or any ORM over Supabase | Supabase client + SQL migrations already cover it; an ORM adds a second schema source that will drift. |
| Any mandatory AI/LLM call on a core path; any LLM that computes a number | **C4** must work when AI is down; **PRD** "never invented." |
| Model API keys in `NEXT_PUBLIC_` env vars, the repo, or the client bundle | **C2** — anything shipped to the browser is public. Keys belong in a server route handler (Vercel Function). |
| Third-party runtime CDNs for fonts/scripts/styles (e.g. Google Fonts, unpkg, jsDelivr) | **C3** — hotel wifi/offline; self-host or use the host's asset CDN. The reference app violates this; do not copy. |
| moment.js | Unmaintained and heavy. Use date-fns. |
| Create React App / `react-scripts` | Unmaintained. |
| MUI, Ant Design, Chakra UI, Bootstrap, AG Grid, MUI Data Grid | Heavier than the job; version churn on handoff. |
| Chart libraries other than Recharts (Chart.js, Highcharts, ApexCharts, AG Charts, hand-rolled D3 for standard charts) | **C5** — one chart library, the React/shadcn default and the reference app's verified choice; Highcharts and AG Charts are also licence-bound. |
| Icon-font packs (Font Awesome, Material Icons webfont) | **C5** — lucide-react tree-shakes per icon; icon fonts ship the whole set and add a network font. |
| Service-worker / PWA offline write queue at v1 | Heavier than the job; with Supabase online, the app degrades to read-only with a clear message instead. Revisit only if the client asks for true offline. |
| Analytics, telemetry or crash reporters that send data off-device to a third party (Sentry, GA, Segment, PostHog) | Defence-client sensitivity and **C3**; host logs suffice. |
| Any direct `fetch`/`axios` to a third party as a core dependency of a screen | **C3** — the only permitted outbound call is the optional LLM path through the server route handler, and every screen must render without it. |

---

## Flagged dependencies and risks

- **Unmaintained:** `moment.js`, Create React App / `react-scripts`. Excluded above.
- **Poor touch support:** File System Access API. Excluded; the document vault uses Supabase Storage.
- **Heavier than the job:** MUI, Ant Design, AG Grid, a service-worker/PWA layer. Excluded with reasons above.
- **Main correctness risk for the agent:** **Row-Level Security, and the views/code that read around it.** A mis-scoped policy either locks every user out or exposes the whole database through the public anon key; a view without `security_invoker = true` silently bypasses RLS; and the Ask route handler leaks if it runs on the service-role key instead of the caller's session. Mitigation: write policies, `security_invoker` views and the user-scoped Ask router in the same migrations, and test them against the Supabase test project as part of the required suite — not by clicking around the UI.
- **Main operational risk:** **network dependence on hotel wifi (C3).** Mitigated by the persisted TanStack Query cache and by never clearing a form on a failed mutation; not fully solvable without an offline write queue, which is out of scope.
- **Accepted trade-off:** **Supabase lock-in.** Reduced to a data question by keeping the schema as plain SQL migrations and providing an export routine.

---

## One-line summary of the trade

Adopt the reference app's screens and data model, but build them in **Next.js App Router on Vercel + Supabase (Postgres, Auth via `@supabase/ssr`, Storage, RLS), TanStack Query + Table, Tailwind + Radix + lucide-react, Recharts, `next-themes`** — with **coverage computed once in Postgres views** and a **user-scoped Next.js route-handler Ask layer**; the only things the agent must get right beyond the screens are **RLS plus `security_invoker` views**, **RLS-safe approvals/audit triggers and the scheduled-job layer**, **Zod validation mirrored by DB constraints**, the **tested coverage and pricing SQL**, the **light/dark tokens in `docs/DESIGN.md`**, and keeping **AI off the critical path (C4)**.
