# UI-SPEC — how to specify a complete UI without a reference app

**Reusable version.** This method is packaged as an app-agnostic skill at
`.kilo/skill/ui-completeness/SKILL.md` (copy it to `~/.config/kilo/skill/` to have it in every
project). This file is the worked, project-specific instance of it.

**Why this exists.** A brief written in nouns ("requirements carry up to 500 line items", "coverage
is global") produces tables and read-only pages. A brief written in **verbs** ("a salesperson records
a firm commitment against a line and watches coverage update") produces controls. Lovable-style tools
look "natural" because they pattern-complete a CRUD template they were trained on — they decide the
UI for you. We can get the same completeness deliberately, and get the domain rules right as well,
by writing the screen contract ourselves.

## 1. The method in one line

**Describe the user's job as a sentence with verbs; every verb becomes a control, every noun becomes
a screen, every number gets a drill-down.** Then apply the contract below to every entity.

## 2. The contract every entity must satisfy

| # | Rule | Why it matters |
|---|---|---|
| 1 | **List screen**: the columns needed to *decide*, filters that come from the KPIs, and every row links to its record. | A list you cannot act on is a report. |
| 2 | **Record screen**: identity (name/ref), status, key facts, then sections for its related things (lines, commitments, quotes, orders, documents, history). | One page answers "what is this and what is happening". |
| 3 | **Actions**: if a thing can be created, it must be **editable**; a status that can change gets a **Change status**; deletion is either supported or explicitly refused with the reason. | "Create but not edit" is the bug we hit. |
| 4 | **Every number** carries (a) a link to the records behind it and (b) a one-line definition of how it is counted. | A number you cannot open or audit is a number nobody trusts. |
| 5 | **Every relationship links both ways** (order → requirement → its orders; commitment → OEM → its commitments). | "No back-and-forth links" was the second symptom. |
| 6 | **States**: empty, error, and *you do not have permission* are three different screens, never one blank page. | The pilot failure in reverse: never a blank indistinguishable page. |
| 7 | **Role matrix**: say which actions each role sees, so the screen and the database agree. | RLS protects the data; the UI should not offer what will be refused. |

## 3. Worked example — a requirement

The job, in one sentence:

> A salesperson opens a requirement, reads which lines lack firm cover, records a firm or indicative
> commitment from an OEM against a line, watches coverage update, drafts a quote, records the outcome
> (won or lost with a reason), and can edit the header or a line at any point.

That one sentence generates:

- **Controls**: Edit, Record commitment (firm / indicative), Draft quote, Record loss (reason), Add line, Change status.
- **Screens**: requirements list, requirement detail, quote screen, quote PDF.
- **Drill-downs**: coverage numbers → the lines behind them; the KPI "not fully covered" → the filtered list.
- **Link-backs**: each commitment links to its requirement and its OEM; each order links to its requirement and quote.
- **States**: signed out → login; no rows → "no requirements yet"; restricted role → "not visible for your role".

## 4. Per-entity contract matrix

Fill a row per entity and treat each cell as a test. "n/a" must be a decision, not an omission.

| Entity | Create | Read (list) | Read (record) | Update | Status change | Delete | Key actions | Drill-down numbers |
|---|---|---|---|---|---|---|---|---|
| Requirement | have | have | have | have | have (via Edit) | refuse (has children) | draft quote, record loss | worst cover, uncovered units |
| Requirement line | have (add) | in detail | in detail | have | n/a | refuse (commitments/quotes reference it) | record commitment | required / firm / uncovered |
| OEM | have | have | have | have | n/a | refuse (commitments reference it) | add product | commitments, requests |
| OEM product | have (add) | in OEM | in OEM | missing | n/a | missing | — | declared vs committed (A1) |
| Commitment | have | in OEM + line | in line | missing | n/a | missing | firm vs indicative | coverage contribution |
| OEM request | missing | in OEM + requirement | missing | missing | mark replied | missing | send request | pending count |
| Quote | missing | have | have | missing | missing | missing | approve, create order, PDF | recommended vs final |
| Order | have (from quote) | have | have | missing | missing | missing | record PDI / delivery | ordered / delivered / outstanding |
| PDI | have | in order | in order | missing | n/a | missing | — | offered / cleared / rejected |
| Delivery | have | in order | in order | missing | n/a | missing | — | outstanding balance |
| OEM invoice | missing | have | in list | missing | mark paid | missing | record payment | outstanding, ageing |
| Payment | have | in payments | in list | missing | n/a | missing | — | paid vs outstanding |
| Commission invoice | have | have | in list | missing | mark paid | missing | — | commission, GST, outstanding |
| Document | missing (upload) | have | missing | missing | n/a | missing | link to owner | expiry state |
| Task / follow-up | generated | have | in tasks | missing | complete (have) | missing | run generator | open count |
| Loss | via status | in history | in history | edit reason | n/a | n/a | record loss | why-we-lost |

**Reading the matrix:** the "missing" cells are the entire difference between our app and the
reference — and every one was foreseeable from the sentence in §3, without the reference.

## 5. How to ask for it in a prompt (copy this)

> For every entity, give me: the **user and their job in one sentence** (verbs), the **list columns
> and filters**, the **record-page sections**, **every action with the role allowed to take it**,
> what **each number counts** and where it drills down to, and how the **empty / error / no-permission**
> states read. Then build it that way — including the edit and status controls, not just the read view.

## 6. The trade-off to keep in view

Lovable-style generation is fast and UI-complete but shallow on domain rules; our first pass was
domain-deep and UI-thin. A defence CRM needs both, so the spec above deliberately forces the two
things a feature prompt usually omits — the **verbs** and the **states** — while `docs/PRD.md` and
`docs/ASSUMPTIONS.md` keep the rules honest. Neither a reference app nor a template is required;
a screen contract is.
