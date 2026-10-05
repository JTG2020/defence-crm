# ASSUMPTIONS — decisions taken so the build can proceed without the client

**Status legend**
- `CLOSED-BY-ASSUMPTION` — a working decision has been taken; the build proceeds on it; it is **not** confirmed by the client.
- `CONFIRMED` — Ram Prasad has confirmed it against a real transaction/example. None are confirmed yet.

**Rule:** an assumption is a decision, not a fact. Every item below is either taken from the requirement brief, from the supplied workbooks, or marked as an engineering default. Nothing is presented as client-confirmed. These are closed so the core data model can be built; they must be shown to Ram at the first review.

Cross-reference: `docs/PRD.md` §6 (Questions 1–15).

---

## Core data model — if these are wrong, the coverage engine is rebuilt

### A1 (PRD Q1) — OEM capacity basis
- **Question (brief, verbatim):** *"If OEM A can supply 1,000 and 700 is already committed to one order, should the system show only 300 available for another? This decides whether capacity is global or per order."*
- **Assumption:** OEM capacity is a **global pool**. A firm commitment consumes it. Available = declared capacity − sum of firm commitments, across all requirements.
- **Rationale:** the question is phrased as if subtracting a prior commitment is the expected behaviour, which only matters if capacity is shared.
- **Risk:** H.
- **If wrong:** model capacity as an explicit per-OEM quantity plus a commitment ledger, so global vs per-order is a configuration flag, not a rewrite.
- **Status:** CLOSED-BY-ASSUMPTION — confirm with Ram.

### A2 (PRD Q8) — line-item granularity
- **Question:** does *"up to 500 part numbers"* mean 500 independent line items?
- **Assumption:** **Yes.** Each requirement is a header; each line item carries its own product/part number, quantity, OEM(s), shipment(s), deadline, price and coverage balance. All statuses and quantities are per line item.
- **Rationale:** the brief says *"One requirement can carry many line items (up to 500 part numbers), not one giant text field."*
- **Risk:** H.
- **If wrong (line items are just a list under one quantity):** the requirement-level model is simpler but still a superset; keep the header/line-item split so either reading is representable.
- **Status:** CLOSED-BY-ASSUMPTION — confirm with Ram.

### A3 (PRD Q9) — lifecycle quantity meaning
- **Question:** what do *"requested, quoted, committed, ready, inspected, invoiced, delivered, accepted"* mean operationally?
- **Assumption:** a monotonic per-line-item pipeline, stored as **stage events**, not one number per stage. `requested` from the RFI; `quoted` on the quote version; `committed` only for firm OEM commitments; `ready` on production done; `inspected` = PDI cleared (distinct from offered/rejected); `invoiced`; `delivered`; `accepted`. Downstream never exceeds upstream except by explicit split/merge.
- **Rationale:** the brief requires *"Quantity balance is visible across the whole lifecycle"* and *"PDI cleared is distinct from offered and rejected."*
- **Risk:** H.
- **If wrong:** event ledger can be aggregated to any single-number view; the reverse is not true, so the ledger is the safe choice.
- **Status:** CLOSED-BY-ASSUMPTION — confirm with Ram.

### A4 (PRD Q7) — requirement-to-agency cardinality
- **Question:** does one requirement belong to one agency, or can it be bid to several in parallel?
- **Assumption:** **one RFI belongs to one customer/agency.** A re-bid to another agency is a new requirement that references the earlier one.
- **Rationale:** the brief's status set (`received … won, lost, cancelled`) describes one outcome per requirement.
- **Risk:** M.
- **If wrong:** quotes already reference a requirement; allow one requirement to produce several quotes to different customers without changing the requirement.
- **Status:** CLOSED-BY-ASSUMPTION — confirm with Ram.

---

## Money flow — needed for order, invoice, payment and commission

### A5 (PRD Q2) — who invoices whom; when commission is earned
- **Question (brief, verbatim):** *"Who invoices whom and who pays the OEM? When is commission actually earned? Confirm with one real transaction."*
- **Assumption:** a **single firm is the contracting party** with the agency. The firm invoices the agency; the agency pays the firm; the firm pays the OEM; Ram's commission is due on the **OEM-payment milestone**. One PO can have several invoices; one invoice can be covered by several deliveries.
- **Rationale:** brief's "Rules that must hold" — *"Commission follows an OEM-payment milestone."* Workbook: *"Commission invoice can only be raised after OEM payment milestone."* and the Odoo flow *"RFI → Quotation → Purchase Order → Invoice to OEM → Delivery → Payment to OEM → Inverbrass Invoice"*, *"After Payment is received by primary client"*, *"within 7 days"*.
- **Note:** the brief simultaneously states this as a fixed rule and asks to confirm it. This assumption takes the rule at face value.
- **Risk:** H.
- **If wrong:** model money as a generic **milestone-event chain** (event type, party, amount, date) rather than hard-coding the roles above, so a different who-pays-whom is data, not schema.
- **Status:** CLOSED-BY-ASSUMPTION — must be confirmed with one real transaction.

### A6 (PRD Q12) — PDI clearance and invoicing
- **Question:** does PDI-cleared release an invoice/quantity, or does finance act separately?
- **Assumption:** **no automatic financial release.** PDI-cleared sets a prerequisite flag; finance raises and approves the invoice. Quantities move to `inspected` on clearance, to `invoiced` only on a real invoice.
- **Rationale:** brief's prohibition on *"automatic final bid price"* and human-approval rules; safer default is no auto-generated financial documents.
- **Risk:** M.
- **If wrong:** finance approval "blocking" vs "advisory" is a configuration; the flag already exists.
- **Status:** CLOSED-BY-ASSUMPTION — confirm with Ram.

### A7 (PRD Q6) — legal/billing entity
- **Question:** what is the entity, and its relationship to Ram Prasad?
- **Assumption:** **one firm** is the contracting and billing party; Ram is its principal. The name is a **placeholder** (`Inverbrass` appears only in the sample workbook; the brief never names the firm).
- **Risk:** M.
- **If wrong:** entity name/logo/addresses are configuration, not logic.
- **Status:** RESOLVED — owner decision 2026-10-05: no existing name, logo or brand color; the app keeps a professional neutral default and the entity name remains configuration. Real name to be set by the owner, not Ram.

---

## Data quality — governs bid intelligence and history search

### A8 (PRD Q5) — trustworthy historical columns
- **Question (brief, verbatim):** *"Which historical Excel columns are trustworthy enough to power quote comparison and win or loss analysis?"*
- **Assumption:** trustworthy = structured, consistently populated fields: enquiry/QTN refs and dates, product code, quantity, rates, status, PO/invoice/payment references. **Not trustworthy:** free-text `Remarks` and inconsistent product codes (the sheets contain `123`, `123M`, and real-looking codes like `4769 247 702 73`).
- **Rationale:** comparison requires a stable part key; the supplied sheets do not have one.
- **Risk:** H.
- **If wrong / thin comparables:** history search matches on **exact part number/product code only**, and returns **"no comparable found"** rather than guessing. At 20 quotes/month many line items will legitimately have none.
- **Status:** RESOLVED — owner decision 2026-10-05: use **fuzzy matching as well as exact**, via Postgres `pg_trgm` (`docs/TECH-STACK.md`, History search). The "no comparable found" rule still applies when nothing scores above threshold.

### A9 (PRD Q14) — history scope and migration
- **Question:** which years must be usable, and migrate or start clean?
- **Assumption:** **start clean on transactions and seed two to three months of past data as mock history**, then append current data. Master data (OEM, customer, approvals/certificates) and the seeded history are imported for **search and comparison only** from confirmed fields (per A8), not to preserve running balances. Real historical Excel is not migrated in v1.
- **Risk:** M.
- **If wrong:** import is additive; the schema already separates master data from transactions.
- **Status:** RESOLVED — owner decision 2026-10-05: two to three months of past data, mock for now, plus current data. Fuzzy match (A8) is what makes the seeded history useful.

---

## Process and scope decisions

### A10 (PRD Q3) — which documents take the one week
- **Question (brief, verbatim):** *"Which documents really consume the one week: generated from data, reused, obtained from the OEM, or prepared by hand?"*
- **Assumption:** **quotation and invoice are data-derived** (generated from the record); compliance certificates, technical drawings and inspection/PDI reports are **uploads** obtained from OEMs or prepared by hand. The one-week cost is therefore partly software-fixable (quote/invoice) and partly not.
- **Risk:** M.
- **If wrong (more documents are manual):** the document feature shrinks to a vault + expiry reminders; no generic generator is built (brief: *"not a generic document generator"*).
- **Status:** RESOLVED — owner decision 2026-10-05: no letterhead to match; the quotation is a standard app-generated document and the invoice is data-derived. A single clean template, not a generic generator.

### A11 (PRD Q4) — loss-reason labels
- **Question (brief, verbatim):** *"The loss-reason list above is a starting point; confirm the labels he uses."*
- **Assumption:** use the brief's list verbatim: price, technical non-compliance, delivery timeline, competitor preference, quantity or capacity, cancelled, not pursued, other.
- **Risk:** L (labels only).
- **Status:** CLOSED-BY-ASSUMPTION — relabel on client feedback.

### A12 (PRD Q10) — approval matrix
- **Question:** who approves what, at what thresholds, blocking or advisory?
- **Assumption:** quote approval and OEM selection → owner/management, **blocking**; documents/compliance → operations; payments/commission → finance. Thresholds and blocking/advisory are configurable; defaults are advisory except quote, OEM selection and PO (blocking).
- **Rationale:** brief: *"No OEM chosen without human approval."* and *"Approvals where the business needs them on quotes, documents, orders and compliance items."*
- **Risk:** M.
- **If wrong:** rules are configuration rows, not code.
- **Status:** CLOSED-BY-ASSUMPTION — confirm with Ram.

### A13 (PRD Q11) — follow-up cadence
- **Question:** rules beyond *"no response for seven days"*?
- **Assumption:** default cadence 7 days → task; 14 days → escalate; per-stage templates; each task has an owner. Configurable.
- **Risk:** L.
- **Status:** CLOSED-BY-ASSUMPTION — tune with Ram.

### A14 (PRD Q13) — plain-language questions vs fixed reports
- **Question:** is natural-language Q&A required at launch?
- **Assumption:** **fixed named reports at launch** (open orders and state, quotes awaiting response, delivery risk, payments pending, OEM responses pending, documents expiring, won/lost this month, loss reasons). Plain-language Q&A is a later read-only layer over the same queries, and may answer "not determinable from the data."
- **Rationale:** the brief forbids invented answers; a thin, partly-untrustworthy history (A8) makes free-form NL the highest-risk way to produce one.
- **Risk:** M.
- **If wrong (NL required at launch):** the named-report layer is the query set the NL layer calls; no rework, only an added surface.
- **Status:** CLOSED-BY-ASSUMPTION — confirm with Ram.

### A15 (PRD Q15) — multi-currency, export, freight
- **Question:** real, or only in the sample workbook?
- **Assumption:** **out of scope** for v1. INR only; freight handled as a charge line; export restrictions not modelled.
- **Rationale:** these appear only in the Odoo workbook (`Currency INR/USD/EUR`, `Freight Terms`, `Export Restriction`), never in the brief.
- **Risk:** L.
- **Status:** CLOSED-BY-ASSUMPTION — revisit if Ram confirms USD/EUR or exports.

---

## Owner decisions (2026-10-05)

The commissioning owner answered the stack-review questions on this date. These are build decisions from the owner, not Ram's business facts; where they touch the business, they set the value carried in A7–A10.

| # | Question | Decision | Affects |
|---|---|---|---|
| 1 | Whose accounts hold the data? | The owner's own **Vercel + Supabase** accounts for now. | C1/C2, deployment |
| 2 | Reminder channel | **In-app only.** No email, WhatsApp or portal provider. | Scheduled jobs row |
| 3 | Documents and brand | **No letterhead.** Standard app-generated quotation; invoice data-derived. **No existing logo, name or brand color** — keep a professional neutral default. | A7, A10, `docs/DESIGN.md` |
| 4 | Auth personas | The **four roles in the brief**: owner/management, sales, operations, finance. The workbook's `Admin` is the owner/management seat, not a fifth persona. | `docs/TECH-STACK.md` Authorization |
| 5 | History | **Two to three months** of past data (**mock for now**) plus current data. | A9 |
| 6 | Matching | **Fuzzy as well as exact.** | A8 |

---

## How these get truly closed

1. Print one page: A1, A2, A3, A4, A5, A8 (the six that carry risk).
2. Walk Ram through each with **one real example** — a recent requirement, a recent OEM commitment, a recent order and payment. His answers either confirm or overturn the assumption.
3. Record the confirmation against the relevant `A#` and change `CLOSED-BY-ASSUMPTION` to `CONFIRMED (example: <ref>)`.
4. Anything he overturns: update this file, `docs/PRD.md`, and (once they exist) `docs/TECH-STACK.md` and `docs/IMPLEMENTATION-PLAN.md` in the same change.

**Nothing here is confirmed by the client.** All fifteen are working decisions that let the build start.
