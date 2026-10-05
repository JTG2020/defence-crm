---
name: ui-completeness
description: Use when designing or building any app screen, or when asked why a UI is static, missing edit/detail/drill-down, or has no states. Turns a noun-heavy brief into a screen contract (jobs, actions, drill-down, states, role matrix) and an acceptance checklist, so a complete, connected UI is built by default instead of a read-only table.
---

# Skill: UI completeness (screen contract)

## When to use

- Building any new screen or entity screen in an app.
- A brief/PRD describes data and rules but few user actions.
- Someone asks "why is this screen static?", "where is the edit button?", "how do I drill down?",
  or "why does nothing link to anything?".
- Auditing an existing app for UI gaps against what a finished product would have.

## The core idea

**Nouns generate tables; verbs generate controls.** A brief that lists entities, fields and rules
produces list pages and read-only detail pages. A brief that states what a person *does* produces
edit buttons, forms, status changes and drill-downs. If a screen feels empty, the brief was missing
verbs, not the builder missing skill.

Do not wait for a reference/competitor app. Derive the contract from the client's own words.

## Procedure

### 1. Write one job sentence per entity

For each entity, write a single sentence of the form: **"A <role> opens a <record>, <verb> …, and
can <verb> at any point."** Every verb becomes a control; every noun becomes a screen or section.

Example (defence contract CRM):
> "A salesperson opens a requirement, reads which lines lack firm cover, records a firm or
> indicative commitment from an OEM against a line, watches coverage update, drafts a quote,
> records the outcome (won/lost with a reason), and can edit the header or a line at any point."

That sentence alone implies: Edit, Record commitment (firm/indicative), Draft quote, Record loss,
Add line, Change status, a coverage display that updates, a quote screen, and both-way links.

### 2. Apply the record contract to every entity

| # | Rule | Failure it prevents |
|---|---|---|
| 1 | **List**: columns needed to *decide*; filters that match the dashboard KPIs; every row links to its record. | A list you cannot act on. |
| 2 | **Record page**: identity (name/ref), status, key facts, then sections for its related things. | A detail page that answers nothing. |
| 3 | **Actions**: if it can be created it can be **edited**; if a status can change there is a **Change status**; deletion is either supported or explicitly refused with the reason. | "Create but not edit". |
| 4 | **Every number**: links to the records behind it, and states how it is counted (one line). | Numbers nobody trusts or can audit. |
| 5 | **Every relationship links both ways** (order → requirement → its orders). | "No back-and-forth links". |
| 6 | **States**: empty, error, and *no permission* are three different screens — never one blank page. | Indistinguishable failures. |
| 7 | **Role matrix**: state which actions each role sees, so the screen offers only what the data layer will permit. | Buttons that fail at the database. |

### 3. Fill the entity matrix

One row per entity; each cell is a test, and `n/a` must be a decision, not an omission.

`Entity | Create | List | Record | Update | Status change | Delete | Key actions | Drill-down numbers`

### 4. States (name them, don't merge them)

For every screen define the exact copy for: **empty** (no rows yet), **error** (call failed, with the
real message), **missing configuration** (name the setting), and **no permission** (signed in, but
RLS hides it). A screen that shows the same blank panel for all four is a defect.

### 5. Drill-down and "how counted"

Every card/number on a dashboard links to a filtered list (`?status=`, `?pill=`, `?cover=`), and
every such list shows a "Filtered by … · clear" line. Every count carries its definition, and the
definition must live where the number is computed (a SQL view or one function), not be restated per
screen.

### 6. Build order

1. Data shape and invariants first (so screens cannot show a wrong number).
2. Then build each screen **read + write together** — never ship a read-only detail and "add edit
   later"; later never comes.
3. Wire drill-downs and both-way links as you build each screen, not after.

## Anti-patterns (treat as defects)

- Create but not edit. Detail page with no actions.
- Dashboard KPI that is not a link.
- A greyed-out button labelled "coming soon" (an absent control is honest; a dead one is not).
- One blank panel for empty / error / no-permission.
- A number with no definition and no drill-down.
- Free-text where a controlled vocabulary was specified.
- Trusting a test that asserts bad data is saved (see AGENTS.md §3).

## Acceptance checklist (run before calling any UI done)

- [ ] Each entity has a job sentence, and every verb in it has a control.
- [ ] Every list row links to its record; every record links back to its parents.
- [ ] Every entity that can be created can be edited; every status that can change has a control.
- [ ] Every dashboard number links to a filtered list, and states how it is counted.
- [ ] Empty, error, missing-config and no-permission are visibly different.
- [ ] The role matrix exists and the UI does not offer what the data layer refuses.
- [ ] Deleting each entity is either built or refused with a stated reason.

## Output artifacts

1. `docs/UI-SPEC.md` (project): the jobs, the contract, the entity matrix.
2. A parity/acceptance checklist derived from the matrix, tracked as have/partial/missing.

## Ask for it in a prompt (template)

> For every entity give me: the **user and their job in one sentence** (verbs); the **list columns and
> filters**; the **record-page sections**; **every action with the role allowed**; what **each number
> counts** and where it drills down to; and how **empty / error / no-permission** read. Then build it
> that way — edit and status controls included, not just the read view.

## Portability

Make this skill available to every project by copying it to the global config:
`~/.config/kilo/skill/ui-completeness/SKILL.md`. It is app-agnostic: only the worked example is
domain-specific.
