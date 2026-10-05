# UI-PARITY — reference screen inventory vs ours

**Reference:** `https://pixel-perfect-display-4154.lovable.app/` (the finished product named in
`docs/TECH-STACK.md`). **Purpose:** a screen-by-screen checklist so "we forgot to build the edit
button" cannot happen again. Update the "ours" column as each gap closes.

Legend: **have** = built and wired · **partial** = read-only or missing the actions · **missing** =
not built.

| Screen | Reference has | Ours | Gap |
|---|---|---|---|
| Today | KPI cards that link into filtered lists, funnel, stage donut, money ageing, coverage list, needs-attention feed, deadlines-next-14-days, follow-up list | KPI cards (linked), funnel, stage donut, win/loss, why-lost, money ageing, deadlines-next-14-days, blocked lines, follow-ups, documents | needs-attention feed; coverage-of-live-requirements list; per-KPI sparklines |
| Requirements list | filters, columns with worst cover, links to detail | have (with `?status=` and `?cover=uncovered`) | column sorting; save a view |
| Requirement detail | Edit, Change status, coverage summary, tabs, inline Add line / Paste from Excel, per-line Commitments | Edit, coverage summary, Record commitment (firm/indicative), Draft quote, Send OEM request, Record loss, sections | tabs; paste-from-Excel; delete a line; Change-status shortcut (use Edit) |
| OEMs list | list linking to detail | have (rows link) | — |
| OEM detail | Edit details, KPIs, products + Add product, contacts, live commitments, documents | Edit details, capacity setting (A1), Add product with declared capacity, products with declared/firm/available/over, live commitments (linked), requests, documents, KPI tiles | multiple contacts; notes; past-orders/PDI-rejection KPIs |
| Quotes list | list, final price, create order from approved quote | have (Draft quote from a requirement, set final prices, Approve, Create order) | PDF export; quote versioning on edit |
| Orders list / detail | list linking; detail with lines, timeline, PDI, deliveries, actions | have (read) | convert already exists; recording works; order edit; status changes |
| Payments | invoices with paid/outstanding, pay, commission | have (pay, raise commission) | aging buckets; mark commission paid |
| Documents | list with expiry, upload, link to owner | partial (list + filter; no upload, no owner link) | upload; owner link; expiry actions |
| History & losses | search + loss capture + win/loss | have (search, record loss) | `pg_trgm` ranking; comparable quotes/prices |
| Ask | plain-language answers | have (deterministic) | more patterns |
| Activity | audit trail screen | have (read view over `audit_log`, owner-only) | filters by entity/actor |
| Leads | separate leads module | deliberately absent | the brief has no lead entity; the RFI is the lead |
| Global | top-bar search, role-aware UI, remove demo data | missing | top-bar search; role-conditional UI (RLS-06); demo-data removal |

## Why these were missed (post-mortem, one paragraph)

The reference was used as a **stack and data reference, not a UI specification** — the first pass
inspected its bundles and tables, not its screens. The build was then sequenced as *risky core
first* (data model, coverage engine, coverage gate, RLS, audit, atomic writes), and CRUD/edit/detail
were filed under "later", which is how a screen ends up read-only. `docs/DESIGN.md` defines tokens
and theme, not screens; the plan lists tables and phases, not screens and actions. So screens were
*inferred from entities*, which yields a list and a read-only detail but no action set. Correctness
bias (small proven slices) then shipped each screen read-first and deferred its writes every time.

**Not the cause:** design skill or capability. The same screens were reproduced quickly once a
reference screen was pointed at. **The fix:** treat this file as the acceptance test for UI
completeness, and build each screen's actions with the screen, not after it.
