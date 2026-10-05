# PRD — Requirements

**Product:** a CRM for Ram Prasad, a defence contract consultant
**Status:** Requirements only. No technology choices. No build order.
**Source of truth:** `Requirements.pdf` — 6 pages, "BUSINESS OWNER 1 · REQUIREMENT BRIEF", read in full. Supporting evidence: nine workbooks extracted from `Ram Prasad Assets-20261004T221206Z-1-001.zip`.
**Prepared:** 2026-10-05

> Every quoted line below is verbatim from the requirement brief. Where a fact comes from the workbooks and not the brief, it is marked. Names, prices and dates appear only where the sources contain them; nothing is inferred or invented.

---

## 0. Evidence notes — read before trusting anything below

- The brief is explicit that it is *"the problem and the requirements, not a finished plan."* This PRD is the requirements pass only. The brief also contains a *"stack that fits"* paragraph (Next.js / Supabase / Neon / Postgres); by the rules of this task that belongs in `TECH-STACK.md` and is deliberately absent here.
- The nine workbooks are the client's working artefacts, and they are **anonymised samples**. OEMs appear as `OEM A`, `OEM B`, `OEM-ABC`; customers as `HAL`, `BEL`, `BEML`; a firm called `Inverbrass` appears throughout the Odoo workbook, and an employee field reads `Supreme Q employee handling enquiry`. **None of these names appears in the requirement brief.** The brief never names the firm or its customers. Treat the workbooks as evidence of *structure*, not of record.
- The workbooks are useful precisely because they show the real columns the team already maintains: enquiry master, quotation master with a first/second/PNC price ladder, order-booking list with quantity balance, payments master with TDS and LD, OEM/customer/approvals masters. They confirm the brief's data shape and add detail the brief omits (PNC rounds, liquidated damages, TDS, certificate renewal chains).

---

## 1. The client, in five lines

1. Ram Prasad is a defence contract consultant: *"Government and defence agencies send him requirements; he fulfils them through a network of OEM suppliers."*
2. Volume is small and steady: *"Roughly 25 to 30 enquiries a month, about 20 quotations, about 10 orders, and 20 to 25 active orders at any time."*
3. He sells fulfilment of government requirements — he sources the product from OEMs and carries it through quote, PO, inspection, delivery and payment; *"The central record is the RFI / tender requirement. Everything else hangs off it:"*
4. Today the business runs on *"Excel, email and memory"*, with quotation prep taking *"3 to 4 days (partly because it is never urgent)"*, OEM communication *"1 to 10 days"*, document creation *"about 1 week"*, and follow-ups *"3 to 4 hours a day."*
5. Because *"History is not searchable... every new quote starts from scratch"* — the business depends on one person's memory and re-derives its pricing every time.

---

## 2. What they said, and what it means for the build

Left column is verbatim from the requirement brief unless marked *(workbook)*. Right column is the requirement it creates.

| What they said (verbatim) | What it means for the build |
|---|---|
| *"Roughly 25 to 30 enquiries a month, about 20 quotations, about 10 orders, and 20 to 25 active orders at any time."* | Small volumes. Roughly one in three enquiries becomes an order. Design for a thin data set; do not build analytics that assume hundreds of comparables per part. |
| *"Today it runs on Excel, email and memory."* | The spreadsheet is a rational fit to his constraints — free, flexible, transportable, offline. The CRM must beat it on search, coverage and reminders, or he will keep using both. |
| *"Quotation prep takes 3 to 4 days (partly because it is never urgent)"* | The problem underneath is **not raw quote speed**. Quoting gets deprioritised behind live orders. The win is reuse of past quotes and removing follow-up load, not a faster quote form. |
| *"OEM communication 1 to 10 days"* | The variance is largely outside his control. Software can log, chase and age the request; it cannot make an OEM reply. Set this expectation in the product, not against it. |
| *"document creation about 1 week"* | The single largest time block, but the brief's own Open Question 3 asks what the documents actually are. Do not scope a document fix until that is answered. |
| *"follow-ups 3 to 4 hours a day"* | The largest recurring daily cost and the most attackable one. This is the strongest software target in the brief. |
| *"History is not searchable, so every new quote starts from scratch."* | Reuse of past quote/price/OEM/document history is the second-strongest target. |
| *"The central record is the RFI / tender requirement. Everything else hangs off it:"* | One anchor entity. No standalone quotes, POs, invoices or deliveries. |
| *"One requirement can carry many line items (up to 500 part numbers), not one giant text field."* | The line item is the unit of work. Quantity, OEM coverage, pricing and deadlines are per line item, not per requirement. This is the most load-bearing sentence in the brief. |
| *"Statuses: received, qualifying, quoted, submitted, won, lost, cancelled."* | Requirement lifecycle is a fixed, small set — not free text. |
| *"An OEM record: products supplied, capabilities, prices, typical lead time, compliance documents, contacts, past performance, approved or not."* | OEM master must hold approval status and compliance documents as first-class fields, not remarks. |
| *"Distinguish a firm quantity commitment from a mere availability or quote indication."* | Two distinct states on the same OEM. The UI and the arithmetic must never treat "available" as "committed." |
| *"Do not let the team confidently commit to a quantity the OEMs have not covered."* | Coverage is a **gate**, not a report. The system must warn or block at the moment a quantity is quoted or committed. |
| *"Before pricing, show comparable past bids: what was quoted, whether it was won or lost, and the winning or losing price. He changes the bid from that history."* | The system advises; the human prices. Consistent with *"no automatic final bid price."* |
| *"Version and approve quotes."* | Quotes are versioned and go through an approval step, not edited in place. |
| *"Automatic follow-up tasks, for example no response for seven days, or a request for another document."* | Follow-up is a generated task queue with triggers and aging, tied to the record it belongs to. |
| *"No orphan PO: every PO maps to an approved quote."* | A PO can only exist downstream of an approved quote. Enforce, do not merely display. |
| *"One PO can have multiple invoices."* | One-to-many PO → invoice. |
| *"PDI is quantified: quantity offered, cleared, rejected. A failed or held PDI can block dispatch."* | PDI carries three separate quantities and a blocking state. *"cleared"* is not *"offered"*. |
| *"Support partial deliveries, with the outstanding balance visible."* | Partial is normal. Balances must be computed and shown, not manually reconciled. |
| *"Flag delivery risk early: expected completion against the committed deadline, so he is not asked "where is our order?" before he knows."* | Delivery risk is a computed early warning from expected-vs-committed dates, not a status someone must remember to set. |
| *"Commission is earned on an OEM-payment milestone, subject to the open question below."* | The rule is asserted but flagged unconfirmed. Do not hard-code it until Open Question 2 is answered. |
| *"Search all history for a comparable requirement, and surface the past OEM, price, delivery time, margin, documents and problems."* | History search must return a comparable set, which requires a stable product/part key. See §4. |
| *"When an opportunity is lost, record a structured loss reason: price, technical non-compliance, delivery timeline, competitor preference, quantity or capacity, cancelled, not pursued, other."* | Loss is a controlled vocabulary, not a note. |
| *"He wants to ask in plain language: "how many orders are there?", "how many contracts did we win this month?", "what did we lose?", "why did we lose them?". Answer from the stored data, never invented."* | Plain-language questions are in scope, but they must be answerable **only** from stored records and must say when the data cannot answer. |
| *"Roles: owner or management, sales, operations, finance."* | Four roles are named. |
| *"An audit trail of material changes: what, who, when."* | Audit is a requirement, not a nice-to-have. |
| *"No automatic legal or compliance judgement, and no automatic final bid price."* | Advisory only. No auto-compliance verdict, no auto-final price. |
| *"No OEM chosen without human approval."* | Approval is a hard gate before an OEM is selected on a PO. |
| *"No government-portal automation or auto-messaging as a baseline requirement."* | Baseline excludes portal/auto-send. |
| *"Auto notification to client for quotation due dates"* / *"Email integration for quotation sending"* / *"PDF quotation generation"* / *"Auto commission calculation"* / *"Auto dashboard updates"* / *"WhatsApp notification integration (optional)"* / *"GeM portal support (if feasible)"* *(workbook: Odoo "Input Sheet", "Dashboard requirements")* | The client's own sheet wishes for exactly the automation the brief forbids as a baseline. Two phases are being promised at once. Resolve in §4; treat all of these as later-phase unless the brief changes. |
| *"Commission invoice can only be raised after OEM payment milestone."* *(workbook)* | Confirms the intended commission trigger, but it still contradicts Open Question 2 in the brief. |

---

## 3. The problems, ranked by what they cost the client

Ranked by cost to the business, not by how often they were mentioned.

### P1 — Quantity promised to the government is not provably covered by OEM commitments
**The cost:** this is the failure with the largest single-event consequence. Committing a quantity the OEMs have not covered means failing a government delivery — liquidated damages (the payments sheet already carries an `LD` column), loss of the client relationship, and possible disqualification from future tenders. It is also the part the commissioning brief singles out as the one that has to work hardest.
**The brief:** *"Do not let the team confidently commit to a quantity the OEMs have not covered."*
**Software or process:** software, and genuinely hard. The rule ("uncovered balance") is clear; the arithmetic behind it is not (see P2 and §4).
**Solved means:** at any moment, for any requirement line item, the system shows required, firm OEM-committed (split across OEMs and shipments), and uncovered — and refuses to let the uncovered balance be quoted or committed away.

### P2 — The coverage math is undefined at the point that matters
**The cost:** tied to P1 but separately expensive, because building the wrong model is a full rewrite. The brief leaves the defining question open.
**The brief:** *"If OEM A can supply 1,000 and 700 is already committed to one order, should the system show only 300 available for another? This decides whether capacity is global or per order."*
**Software or process:** this is a requirements gap, not a build problem. It must be answered by the client before the core engine is written.
**Solved means:** the client states, with one real example, whether OEM capacity is a global pool or scoped per order, and the eight lifecycle quantities (*"requested, quoted, committed, ready, inspected, invoiced, delivered, accepted"*) are defined operationally.

### P3 — Follow-ups consume 3 to 4 hours a day, every day
**The cost:** roughly 15–20 hours a week of the principal's time — the largest recurring cost in the business, and the one that pushes quotation prep and other work aside.
**The brief:** *"follow-ups 3 to 4 hours a day"*, and *"Automatic follow-up tasks, for example no response for seven days, or a request for another document."*
**Software or process:** mixed. The chase queue is software; OEM unresponsiveness (*"1 to 10 days"*) is a supplier-relationship fact software cannot change.
**Solved means:** the morning view lists everything awaiting a response, with its age and owner, and the system generates the follow-up task instead of Ram remembering it.

### P4 — Every quote starts from scratch because history is unsearchable
**The cost:** *"3 to 4 days"* per quote and, more importantly, pricing decisions made without the past bid, the winning/losing price, or the margin. Margin leaks quietly; the same mistakes repeat.
**The brief:** *"History is not searchable, so every new quote starts from scratch."* / *"Before pricing, show comparable past bids..."*
**Software or process:** software, but bounded by data quality (see §4) and by thin volume (20 quotes/month).
**Solved means:** opening a new requirement surfaces the comparable past requirements, the OEMs used, the prices quoted, won/lost, and the documents.

### P5 — Document creation (~1 week) and approval/certificate expiry
**The cost:** up to a week per requirement, plus the risk of a lapsed approval or certificate discovered too late. The approvals master shows certificates with `VALID TILL`, two extension columns and a renewal chain, i.e. this is already being tracked by hand and is genuinely time-sensitive.
**The brief:** *"document creation about 1 week"*; *"A document and compliance vault: type, supplier, issue date, expiry date, linked product and requirement, with expiry reminders. He keeps approved item lists that renew every 3 to 5 years."*
**Software or process:** unknown until Open Question 3 is answered. If the week is spent assembling data the system already holds, it is a software win; if it is documents obtained from OEMs or prepared by hand, it is largely a process problem.
**Solved means:** whichever documents are data-derived are generated from the record; every expiring document raises a reminder against the right product and requirement.

### P6 — No structured loss record
**The cost:** indirect but compounding. With ~1 in 3 enquiries won, the reasons for the other two are the only feedback loop pricing has, and today they live in memory.
**The brief:** the structured loss list; *"what did we lose?", "why did we lose them?"*
**Solved means:** every lost opportunity carries a reason from a controlled list, and the reason is reportable.

### P7 — Payment and commission leakage
**The cost:** real money — delayed or unrecovered commission, deductions (the payments sheet tracks `TDS`, `LD`, `TOT DED`, `Pmnt Bal`, `Final Bal`). Commission is earned on an OEM-payment milestone, so it is easy to lose track of when it becomes due.
**The brief:** *"Support partial payments, due dates and reminders. One invoice can be fulfilled by several delivery events."*
**Software or process:** mixed — the milestone tracking is software; the actual collection is finance work.
**Solved means:** partial payments and due dates are tracked, and commission due is surfaced rather than remembered.

### P8 — Delivery / PDI visibility
**The cost:** firefighting and relationship damage — *"so he is not asked "where is our order?" before he knows."* Overlaps P1 and P5.
**Solved means:** the fulfilment timeline per order shows each step, its owner and expected date, and flags expected-vs-committed slippage early.

---

## 4. What does NOT add up

**Your plan as stated will not work — for one reason: it commits you to build, and to be judged on, the two features the brief itself refuses to define.** The quantity-coverage engine and the bid-intelligence/history engine are the two things the client cares about most, and they are the two whose governing facts the brief leaves open. If you write firm requirements for them now, you encode guesses as contract, and the client — whose whole reason for buying is those two things — will test you on exactly the parts you guessed.

The specific holes:

1. **Quantity coverage is undefined where it counts.** The brief says *"Do not let the team confidently commit to a quantity the OEMs have not covered"*, but Open Question 1 — *"should the system show only 300 available for another? This decides whether capacity is global or per order"* — is unanswered. The brief's own illustration (*"1,000 needed, OEM A 600, OEM B 400, coverage 1,000, uncovered 0"*) shows coverage *for one requirement* and is silent about whether OEM A's 600 is already promised elsewhere. You cannot build the arithmetic both ways and decide later. **This must be answered with a real example before the engine is written.**

2. **Bid intelligence is promised on data the brief says may be untrustworthy.** Module 4 says show *"comparable past bids... the winning or losing price"*, and module 9 says *"Search all history for a comparable requirement"* — but Open Question 5 asks *"Which historical Excel columns are trustworthy enough to power quote comparison and win or loss analysis?"* You cannot promise loss-reason analysis on history you have been told may be unusable. Worse, comparability needs a stable part-number key, and the supplied sheets do not have one: the same product appears as `123`, `123M`, and as real-looking codes like `4769 247 702 73`. At 20 quotes a month, many line items will have **no comparable** at all. Say so to the client now, or the feature will be judged broken when it returns nothing.

3. **The commission rule is asserted and unconfirmed in the same document.** "Rules that must hold" states *"Commission follows an OEM-payment milestone."* Open Question 2 states *"When is commission actually earned? Confirm with one real transaction."* One sentence says it is a fixed rule; another says it is unknown. It is currently unable to be modelled.

4. **The end-to-end money flow is unknown.** Open Question 2 — *"Who invoices whom and who pays the OEM?"* — is the spine of the order, invoice, payment and commission modules. The Odoo workbook suggests a flow (*RFI → Quotation → Purchase Order → Invoice to OEM → Delivery → Payment to OEM → Inverbrass Invoice*, "After Payment is received by primary client", "within 7 days"), but that is a sample workbook, not a confirmed transaction, and the brief explicitly asks to *"Confirm with one real transaction."* Until then, invoice and commission states are guesses.

5. **Two phases are promised at once (automation).** The brief: *"No government-portal automation or auto-messaging as a baseline requirement."* The workbook's own requirements list: *"Auto notification to client for quotation due dates"*, *"Email integration for quotation sending"*, *"Auto commission calculation"*, *"Auto dashboard updates"*, *"WhatsApp notification integration (optional)"*, *"GeM portal support (if feasible)"*. These cannot all be baseline. The brief's "What NOT to build" wins until the client says otherwise.

6. **"recommended price" vs "no automatic final bid price."** Module 4 says compute a *"recommended price"* from *"OEM price, lead time, target margin"*. "What NOT to build" says *"no automatic final bid price."* These are reconcilable — recommended must be advisory, and a human must set the final — but the distinction has to be explicit in the UI, or an auto-pricer will get shipped by accident and the client will reject it.

7. **Plain answers over dirty data produce confident wrong answers.** Module 10 wants plain-language questions answered *"from the stored data, never invented."* Module 4 and Open Question 5 concede the stored history may not be trustworthy. Natural-language reporting over a dirty, thin, partly-anonymised history is exactly how a system invents a plausible wrong number. The question feature is only as honest as its data, and it must be allowed to say it cannot tell from the data.

8. **Some of this is not a software problem, and building software for it will make it worse.**
   - OEM responsiveness (*"1 to 10 days"*) is a market and relationship fact. A CRM can log and chase; it cannot shorten it. Do not market a fix for it.
   - *"partly because it is never urgent"* is a prioritisation habit. A reminder can nudge; it cannot create urgency. This is a management decision, not a data model.
   - *"memory"* as a core system is a single-person dependency. Replacing it is as much change management as software, and it only works if Ram actually enters the data.
   - The one-week document creation may be manual document preparation (Open Question 3). If so, automating the surrounding CRM will not move it.

9. **Names and entities are unresolved.** The brief never names the firm or its customers; the workbooks use placeholders (`OEM-ABC`, `Inverbrass`, `HAL`, `BEL`, `BEML`, `Supreme Q`). The billing entity, the customer set and the OEM set are therefore unconfirmed, which is also why Open Question 2 cannot be answered from here.

10. **Scale of the plan vs the time available.** The time budget is not stated in the brief, and the brief itself says *"the first three are the ones that matter most."* If this is a short build window, then **eleven modules to a standard Ram can trust cannot be built** — the quantity-coverage engine alone (firm vs indicative commitments, multiple OEMs, multiple shipments, partial PDI, and balances across eight lifecycle stages) is a substantial project, and it is the part that must not be shallow. Attempting all eleven guarantees the hard part is the version least carefully built. A build order is deliberately not set here; that belongs in `IMPLEMENTATION-PLAN.md`.

---

## 5. Explicitly out of scope, and why

These are out of scope for the first version. The first four are the brief's own prohibitions, quoted; the rest are recommendations that follow from the brief.

| Out of scope | Why |
|---|---|
| *"No automatic legal or compliance judgement"* | A wrong compliance call on a defence tender is not recoverable. Compliance state is recorded and surfaced; the judgement is human. |
| *"no automatic final bid price"* (and, per §4.6, no auto-submitted price) | Pricing is the client's margin decision. The system may recommend; it may not decide. |
| *"No OEM chosen without human approval"* | Selecting an OEM is a relationship and liability decision. Approval is a hard gate before a PO. |
| *"Not a full accounting or ERP replacement"* | Finance stays in the existing accounting tool. GST/TDS/LD figures already tracked in the sheets are recorded for visibility, not computed for statutory filing. |
| *"not a generic document generator"* | Only the specific documents the client actually needs (to be named in Open Question 3) are in scope; a general template engine is not. |
| *"No government-portal automation or auto-messaging as a baseline requirement."* | Portal (GeM) automation, auto email/WhatsApp sending are deferred. The workbook lists them as "optional"/"if feasible"; they are later-phase. |
| Statutory GST/TDS/LD filing, ledgers and returns | Covered by the ERP/accounting exclusion above. Values are recorded for tracking only. |
| Auto commission calculation and auto payment reminders as baseline | The workbook asks for them; the brief does not. Deferred until Open Question 2 fixes the commission rule. |
| Competitor master/database | Only *"competitor preference"* as a **loss reason** is required. A competitor database is not. |
| Migration of all historical Excel data | Depends on Open Question 5. Until trustworthy columns are named, historical import risks putting bad data behind a confident report. Start from confirmed fields only. |
| Employee performance scoring / KPI ratings | Present in the workbook's dashboard sheet but not in the brief, and dangerous on thin, single-person data. |
| Multi-currency, export and freight automation | Appears only in the workbook (`Currency INR/USD/EUR`, `Freight Terms`, `Export Restriction`), not in the brief. Confirm before building. |
| Build order and technology | Deliberately omitted here; these are `TECH-STACK.md` and `IMPLEMENTATION-PLAN.md`. |

---

## 6. Open questions — closed by assumption

Every question below is **closed for build purposes by a working assumption** recorded in `docs/ASSUMPTIONS.md` (A1–A15). Status of all fifteen: `CLOSED-BY-ASSUMPTION` — **none is confirmed by the client.** Each question names the assumption that closes it. The six high-risk assumptions must be walked through with Ram against real examples before the core engine is treated as settled; see *"How these get truly closed"* in `docs/ASSUMPTIONS.md`.

The first five are the brief's own *"Open questions to design around"*, quoted. The rest are gaps this pass surfaced; each blocks a named requirement.

**From the brief:**
1. *"If OEM A can supply 1,000 and 700 is already committed to one order, should the system show only 300 available for another? This decides whether capacity is global or per order."* — **Blocks:** the entire quantity-coverage and commitment-gate requirement (P1/P2). — **Closed by:** A1 (capacity is a global pool; make it switchable).
2. *"Who invoices whom and who pays the OEM? When is commission actually earned? Confirm with one real transaction."* — **Blocks:** order, invoice, payment and commission requirements (P7), and the commission rule in "Rules that must hold." — **Closed by:** A5 (single firm; commission due on OEM-payment milestone).
3. *"Which documents really consume the one week: generated from data, reused, obtained from the OEM, or prepared by hand?"* — **Blocks:** the document-generation scope and the value story for the one-week cost (P5). — **Closed by:** A10 (quote and invoice data-derived; the rest uploads).
4. *"The loss-reason list above is a starting point; confirm the labels he uses."* — **Blocks:** the loss-reason vocabulary and loss reporting (P6). — **Closed by:** A11 (use the brief's labels as-is).
5. *"Which historical Excel columns are trustworthy enough to power quote comparison and win or loss analysis?"* — **Blocks:** bid intelligence and history search (P4), and plain-language answers about losses. — **Closed by:** A8 (structured fields only; exact part-number match, else "no comparable").

**Surfaced by this pass:**
6. What is the **legal/billing entity** and its relationship to Ram Prasad? The brief never names the firm; the workbooks use `Inverbrass` and `Supreme Q`. Who invoices the government, and who is the contracting party? — **Blocks:** every money-flow requirement. — **Closed by:** A7 (one firm; name is configuration).
7. Does **one requirement belong to one agency**, or can the same requirement/line items be bid to several agencies in parallel? — **Blocks:** the requirement-to-quote cardinality. — **Closed by:** A4 (one requirement, one agency; re-bid is a new requirement).
8. Does *"up to 500 part numbers"* mean one requirement can carry 500 **independent line items, each with its own OEM, quantity, deadline and price**? If so, coverage and status must be per line item, which changes the whole core. — **Blocks:** the core data model. This is the single most important structural question. — **Closed by:** A2 (yes; header + line items).
9. What exactly does each lifecycle quantity mean — *"requested, quoted, committed, ready, inspected, invoiced, delivered, accepted"*? How does a quantity move between them, and which are per-line-item vs per-order? — **Blocks:** the balance display and all coverage math. — **Closed by:** A3 (per-line-item monotonic stage-event ledger).
10. What is the **approval matrix** — who approves quotes, documents, orders and compliance items, at what thresholds, and is approval blocking or advisory? — **Blocks:** roles/approvals/audit (module 11). — **Closed by:** A12 (configurable; blocking on quote, OEM selection and PO).
11. What are the **follow-up rules** beyond *"no response for seven days"* — cadence per stage, escalation, and who owns each type? — **Blocks:** automatic follow-up tasks (P3). — **Closed by:** A13 (7 days task, 14 days escalate; configurable).
12. For partial delivery and partial payment, does *"PDI cleared"* automatically release an invoice/quantity, or does finance act separately? — **Blocks:** the PDI-to-invoice-to-payment chain. — **Closed by:** A6 (no auto-release; PDI clearance is a prerequisite flag).
13. Is the plain-language question feature required at launch, or is a **fixed set of named reports** acceptable while the data is cleaned? — **Blocks:** module 10's riskiest component. — **Closed by:** A14 (named reports first; plain-language later, and may answer "not determinable").
14. Which **historical years** must be usable at launch, and is the intent to migrate them or start clean and backfill? — **Blocks:** history search value and scope. — **Closed by:** A9 (start clean on transactions; master data plus verified history imported for search).
15. Do **multi-currency, export and freight** matter in reality, or only appear in the sample workbook? — **Blocks:** whether they are in or out. — **Closed by:** A15 (out of scope for v1; INR only).
