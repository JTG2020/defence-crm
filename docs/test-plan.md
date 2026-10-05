# TEST-PLAN

Test cases for the build in `docs/IMPLEMENTATION-PLAN.md`. Test **tools and stack** are fixed in `docs/TECH-STACK.md` (Vitest, Testing Library, a Supabase test project/branch); this document does not choose tools, it names the cases.

---

## 1. Scope

**In scope:** validation, authentication and authorization, the quantity-coverage engine, pricing and quote versioning, approvals, order/PDI/delivery state, payments and commission, document expiry, scheduled reminders, history search, loss capture, the Ask layer, audit integrity, demo-data labelling, and theme/accessibility basics.

**Out of scope (and why):** legal/compliance judgement and final bid pricing (excluded by `docs/PRD.md` "What NOT to build"); browser end-to-end automation — no E2E runner exists in `docs/TECH-STACK.md`, and adding one is a stack change, not a test-plan decision, so the four critical flows are covered by integration + component tests instead.

## 2. Test types

| Type | Code | Tool | What it proves |
|---|---|---|---|
| Unit | U | Vitest | Pure logic: coverage arithmetic, pricing, Zod schemas, date/risk math, Ask pattern mapping. |
| Integration | I | Vitest against a Supabase test project/branch | SQL views, constraints, RLS, triggers, migrations, scheduled jobs. |
| Component | C | Vitest + Testing Library | Screens render, validate, and gate actions correctly. |

## 3. Coverage policy

- Target **≥80%** on the pure-logic modules where it makes sense: coverage views/functions, pricing view, validation schemas, date/risk logic, Ask pattern mapping, loss vocabulary. These are the modules a wrong answer harms silently.
- **Excluded** from the target: UI glue, layout, config, generated DB types, third-party wrappers.
- Coverage is a floor, not a goal. A test that asserts bad data is saved is wrong regardless of coverage (`AGENTS.md` §3).

## 4. When tests run (gates)

Tests are written as each phase is built but run only at these gates, per the owner's instruction to run them when required:

- **G0** — end of each phase.
- **G1** — before any demo.
- **G2** — whenever a shared module changes (coverage views, RLS policies, validation schemas, pricing view, search RPC).
- **G3** — before deploy.

Mandatory suites: Phases 1, 2, 5 and 8 (the risk-carrying phases).

## 5. Test data and environment

- **Fixtures with known answers.** Coverage fixtures include one case where a wrong join flips the result, and partial delivery/payment cases.
- **Two users**, one per role at minimum, for RLS.
- **Demo seed** (2–3 months, `docs/ASSUMPTIONS.md` A9) is loaded into the test branch; every seeded row carries `is_demo`.
- Never run destructive tests against production data.

---

## 6. Test case catalogue

### Authentication (AUTH)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| AUTH-01 | Invite-only sign-in | I | Invited user signs in with correct credentials | Session created; httpOnly cookie set |
| AUTH-02 | Wrong password | I | Sign in with wrong password | Refused with a generic message; no session |
| AUTH-03 | Self-signup blocked | I | Attempt sign-up as a non-invited email | Refused; no account created |
| AUTH-04 | Email confirmation required | I | Invited user before confirming | Cannot access protected routes until confirmed |
| AUTH-05 | Password reset | I | Request reset, follow token, set new password | Old password fails, new works |
| AUTH-06 | Session survives reload | C | Reload an authenticated page | Still signed in |
| AUTH-07 | Sign-out clears session | I | Sign out, then hit a protected route | Redirected to sign-in; cookie cleared |
| AUTH-08 | Expired/revoked session | I | Invalidate session server-side, then navigate | Redirected to sign-in |

### Authorization / RLS (RLS)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| RLS-01 | Owner sees all rows | I | Query as owner | All rows in scope returned |
| RLS-02 | Sales sees assigned only | I | Query requirements as sales with an assignment and one without | Assigned returned; unassigned refused |
| RLS-03 | Operations cannot see finance | I | Query payments as operations | Zero rows, not an error |
| RLS-04 | Finance cannot edit requirements | I | Update a requirement as finance | Rejected by policy |
| RLS-05 | Second user cannot read first user's rows | I | User B queries User A's requirement by id | Zero rows |
| RLS-06 | Route guard matches RLS | C | Navigate to a route outside the role | Blocked at the route *and* by the database |
| RLS-07 | Views respect RLS | I | Query the coverage view as a restricted user | Only permitted rows visible (`security_invoker`) |
| RLS-08 | Default deny | I | Query a table with no matching policy | Zero rows |

### Validation (VALID)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| VALID-01 | Required fields enforced | U/C | Submit a requirement missing customer/product/quantity | Refused with field-level reasons; **nothing saved** |
| VALID-02 | DB rejects bypass | I | Insert an invalid row directly, bypassing the UI | Constraint error; no row |
| VALID-03 | Quantity is a positive integer | U | Enter 0, negative, or text | Refused |
| VALID-04 | Dates ordering | U | Set delivery before submission | Refused |
| VALID-05 | Server-side and client schema agree | U | Same payload through Zod and the DB constraint | Identical accept/reject |
| VALID-06 | Import rejects bad rows | I | Import a row missing a required field | Row rejected with a reason; valid rows load |

### Requirements and line items (RFI)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| RFI-01 | Create with one line item | C | New requirement, one line item, save | Saved; appears in list |
| RFI-02 | 500 line items | I | Create a requirement with 500 line items | All persist; list stays usable |
| RFI-03 | Status transitions | U | Move through received → … → won/lost/cancelled | Only allowed transitions accepted |
| RFI-04 | Submission deadline shown | C | Set a deadline within 14 days | Appears on the dashboard deadline list |
| RFI-05 | Document attach | C | Attach a PDF to a requirement | Stored in Supabase Storage; linked to the requirement |
| RFI-06 | Line item uniqueness | I | Two identical part numbers on one requirement | Handled per product rule (allowed or flagged, per model), not silently merged |

### OEM master and sourcing (OEM)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| OEM-01 | OEM create/edit | C | Create an OEM with products, lead time, approval status | Saved and searchable |
| OEM-02 | Shortlist by capability | I | Shortlist OEMs for a requirement's product | Only capable OEMs returned |
| OEM-03 | Record request and response | C | Log an OEM request and its response | Both stored against the requirement and OEM |
| OEM-04 | Firm vs indicative | U/I | Mark one response a firm commitment, another an indication | Stored as distinct facts; never conflated |

### Quantity coverage (COV) — mandatory

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| COV-01 | Exact cover | U/I | 1,000 needed; OEM A 600 firm; OEM B 400 firm | covered 1,000; uncovered 0 |
| COV-02 | Partial cover | U/I | As above minus 400 | uncovered 400; state "partly covered" |
| COV-03 | Indication is not cover | U/I | OEM A 600 firm; OEM B 400 indicative | covered 600; uncovered 400 |
| COV-04 | Multi-shipment | U/I | One OEM commits 300 + 300 across two shipments | counts 600 once; no double-count |
| COV-05 | Commitment gate blocks | C/I | Quote the uncovered balance | Blocked unless an explicit reasoned override is recorded |
| COV-06 | Commitment gate allows | C | Cover fully, then quote | Allowed |
| COV-07 | Removal flips state | I | Remove a commitment from COV-01 | Flips to partly covered; uncovered returns |
| COV-08 | Wrong-join fixture | I | Fixture built so a wrong join double-counts | Asserted result catches the double-count |
| COV-09 | Capacity semantics | I | Model A1 global-vs-per-order configured both ways | Both produce the documented result without a code change |
| COV-10 | Lifecycle balances | I | requested → quoted → committed → ready → inspected → invoiced → delivered → accepted with partials | Each stage balance correct; downstream never exceeds upstream |

### Pricing, quotes and bid intelligence (QUOTE / PRICE)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| PRICE-01 | Recommended price | U | OEM price + lead + margin | Matches the SQL view exactly |
| PRICE-02 | Final price is human | C | Attempt to auto-submit a price | Impossible; final is a human field |
| QUOTE-01 | Quote from requirement only | I | Create a quote with no requirement | Refused |
| QUOTE-02 | Versioning | I | Edit and re-approve a quote | New version; old version intact |
| QUOTE-03 | Comparables surfaced | I | Quote a part with seeded history | Shows past quoted/won/lost prices and lead time |
| QUOTE-04 | No comparable | I | Quote an unseen part | Shows "no comparable", no invented figures |
| QUOTE-05 | PDF totals | C/I | Export a quotation PDF | Totals equal the pricing view, rounded correctly |

### Approvals (APPROVE)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| APPROVE-01 | Quote needs approval | I | Move a quote to approved without an approval row | DB constraint refuses |
| APPROVE-02 | Wrong role cannot approve | I | Sales attempts approval | Refused |
| APPROVE-03 | Approval recorded | I | Owner approves | Approval row with actor and timestamp; audit entry |
| APPROVE-04 | Rejection path | I | Owner rejects | State rejected; reason stored |

### Order, PDI and delivery (ORDER / PDI / DELIV) — PDI mandatory

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| ORDER-01 | No orphan PO | I | Create a PO with no approved quote | Refused |
| ORDER-02 | Quote → order, history travels | I | Convert an approved quote | Order links to the quote; history visible |
| ORDER-03 | Stage timeline | C | Advance stages with owner + expected date | Each step stored with owner and date |
| PDI-01 | Offered vs cleared vs rejected | I | Record offered 100, cleared 80, rejected 20 | Three distinct quantities; cleared ≠ offered |
| PDI-02 | Failed PDI blocks dispatch | I | Set PDI held/failed, attempt dispatch | Dispatch blocked |
| PDI-03 | PDI passed allows dispatch | I | Pass PDI, then dispatch | Allowed |
| DELIV-01 | Partial delivery balance | I | Deliver 300 of 1,000 | Outstanding 700 visible |
| DELIV-02 | Delivery risk flag | I | Expected completion after committed deadline | Risk flagged early |
| DELIV-03 | Multiple deliveries | I | Two deliveries against one order | Balances correct |

### Payments, commission and documents (PAY / COMM / DOC)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| PAY-01 | Partial payment | I | Pay part of an invoice | Balance updated |
| PAY-02 | Invoice across deliveries | I | One invoice fulfilled by several deliveries | Correctly aggregated |
| PAY-03 | Due date and overdue | I | Invoice past due | Marked overdue |
| COMM-01 | Milestone rule | I | Commission before OEM payment vs after | Earned only on the OEM-payment milestone |
| COMM-02 | No double commission | I | Re-fire the milestone job | No duplicate commission |
| DOC-01 | Upload and metadata | C | Upload a certificate with issue/expiry | Stored; metadata linked to product/requirement |
| DOC-02 | Expiry reminder | I | Advance a document into its expiry window | Reminder task raised |
| DOC-03 | No false expiry | I | Document with a distant expiry | No reminder |

### Scheduled jobs (JOB) — mandatory

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| JOB-01 | Seven-day follow-up | I | Quote with no response for 7 days | Exactly one follow-up task created |
| JOB-02 | No duplicate on re-run | I | Run the job twice | Still one task |
| JOB-03 | Payment-due reminder | I | Invoice near due | Reminder task created |
| JOB-04 | In-app only | I | Inspect outbound calls | No email/WhatsApp provider is invoked |
| JOB-05 | Matview refresh | I | Run the refresh job | Historical aggregates update; live coverage untouched |
| JOB-06 | Cron failure surfaces | I | Force a job error | Failure logged; no partial writes |

### History search and losses (SRCH / LOSS)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| SRCH-01 | Exact match | I | Search an exact part number | Correct past requirements, ranked |
| SRCH-02 | Fuzzy match | I | Search a near-miss spelling | Plausible matches returned above threshold |
| SRCH-03 | Below threshold | I | Search gibberish | "No comparable"; nothing invented |
| SRCH-04 | Search respects RLS | I | Search as a restricted role | Only permitted rows in results |
| LOSS-01 | Structured reason | C | Close an opportunity lost | Requires a reason from the controlled list |
| LOSS-02 | Reason reportable | I | "Why we lose" aggregate | Counts match recorded reasons |

### Ask layer (ASK)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| ASK-01 | Known pattern | I | "how many orders are open?" | Number from the same view as the dashboard, plus how-counted and matching records |
| ASK-02 | Agreement with dashboard | I | Same question, dashboard vs Ask | Identical number |
| ASK-03 | Unknown pattern | I | Ask something unmapped | "I can't answer that from the data" — no invention |
| ASK-04 | User-scoped | I | Ask as a restricted role | Only permitted rows counted |
| ASK-05 | No AI dependency | I | Disable all providers | Every ASK case still passes (v1 is pattern-based) |
| ASK-06 | LLM translator cannot compute | I | Later phase, flag on, provider returns a number | Number is ignored; result comes from the parameterized query |

### Audit (AUD)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| AUD-01 | Insert audited | I | Insert a material row | One audit row with actor/time |
| AUD-02 | Update audited | I | Update a material row | Audit row with before/after |
| AUD-03 | Delete audited | I | Delete a material row | Audit row recorded |
| AUD-04 | Actor is the real user | I | Change made by a signed-in user | Actor = that user, not the service role |
| AUD-05 | Append-only | I | Attempt to edit/delete audit rows from the app | Refused |

### UI, theme, accessibility and demo labelling (UI / DEMO)

| ID | Case | Type | Steps | Expected |
|---|---|---|---|---|
| UI-01 | Light/dark toggle | C | Toggle theme | All tokens switch; no flash on reload; preference persists |
| UI-02 | System default | C | First load with no preference | Follows OS setting |
| UI-03 | Status not colour-only | C | Render every status badge | Each has icon **and** label |
| UI-04 | Contrast | C | Check status and text pairs | Meets the targets in `docs/DESIGN.md` in both themes |
| UI-05 | Tabular numerics | C | Render quantity/price columns | Figures align |
| UI-06 | Focus visible | C | Tab through a form | 2px focus ring on every control |
| UI-07 | No raw colour | I | Scan components | No hardcoded hex outside `globals.css` |
| DEMO-01 | Demo data labelled | C | Load seed in a demo build | Demo rows are visually marked |
| DEMO-02 | Demo not counted as real | I | Dashboard with demo data | Demo figures are distinguishable from real ones |

---

## 7. Traceability

Every case above carries an area code that maps to a `docs/PRD.md` module: AUTH/RLS → 11; VALID/RFI → 1; OEM → 2; COV → 3; QUOTE/PRICE/APPROVE → 4 and 11; ORDER/PDI/DELIV → 6 and 7; PAY/COMM/DOC → 8; JOB → 5 and 8; SRCH/LOSS → 9; ASK → 10; AUD → 11; UI/DEMO → cross-cutting. Cases that map to an unresolved assumption (`docs/ASSUMPTIONS.md` A1, A5, A8) are marked mandatory because those assumptions are the likeliest to be overturned.

## 8. Defect handling

Per `AGENTS.md` §4: read the whole error; state one guess naming the file and line; make one change that tests the guess; re-run the exact failing command; undo a wrong guess. Never weaken a check, delete a test, swallow an error, or hardcode an answer to make a test pass. Three wrong guesses on the same error means stop and report what was ruled out. Every fix gets a regression case added here.
