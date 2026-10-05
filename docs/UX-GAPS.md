# UX-GAPS — what the reference app has that we did not, and what changed

**Compared against:** `https://pixel-perfect-display-4154.lovable.app/` (the friend's build named in
`docs/TECH-STACK.md`), fetched 2026-10-05. **Prepared:** 2026-10-05.

---

## 1. The two gaps the owner raised

1. **Reports.** The reference Today is a wall of decision surfaces: eight KPI cards each with a
   sub-line and a sparkline, an "Open orders by stage" donut, "Won vs lost, last 8 months", "Why we
   lose", "Money outstanding by age", a "Pipeline funnel", a "Coverage of live requirements" list,
   "Lead follow-ups due today", a "Needs attention" feed, and "Submission deadlines, next 14 days".
   Ours had eight plain counts and two charts.
2. **Drill-down.** In the reference, **every KPI card is a link into a filtered list** — e.g.
   `Not fully covered → /requirements?cover=uncovered`, `Orders at delivery risk →
   /orders?pill=risk`, `Payments pending → /payments?pill=pending` — and every row in a list links
   to its record. Ours were static counts, and several rows (OEM, payment, document, task) had no
   link to their record at all.

## 2. What changed in this pass

**Reports added to Today**
- Win rate (with won/lost counts) — links to History.
- Payments pending shown as an **amount** (INR), not just a count.
- Orders at delivery risk (a stage expecting later than committed).
- Pipeline funnel (Received / Quoted / Submitted / Won) with proportional bars.
- Open orders by stage (donut).
- Sub-lines on every KPI (e.g. "1,338 units without firm cover").

**Drill-down added (every KPI is now a link)**
| KPI | Links to |
|---|---|
| Not fully covered | `/requirements?cover=uncovered` |
| Open orders | `/orders?pill=open` |
| Quotes awaiting response | `/quotes` |
| Orders at delivery risk | `/orders?pill=risk` |
| Payments pending | `/payments?pill=pending` |
| OEM responses pending | `/tasks` |
| Documents expiring | `/documents?filter=attention` |
| Win rate | `/history` |

The filter targets exist and show a "Filtered by … · clear" line:
`/requirements?status=…&cover=uncovered`, `/orders?pill=open|risk`, `/payments?pill=pending`,
`/documents?filter=attention`.

**Cross-links added**
- Order detail → its requirement, and "all orders".
- Quotes → each quote's requirement.
- Payments → each invoice to its order.
- Tasks → each task to the screen its kind belongs to.
- Today's follow-up and document rows are links.

## 3. What the reference has that we still do not (deliberately or deferred)

| Reference surface | Status | Note |
|---|---|---|
| Sparkline inside each KPI card | **not built** | Decorative trend per card; needs a per-KPI time series we do not track yet. The KPI values themselves are real. |
| Money outstanding **by age** | **not built** | Needs invoice ageing buckets; the data (due date + payments) exists, so this is a small addition. |
| "Needs attention" unified feed | **partially** | We have the Follow-ups queue; the reference merges tasks, risks, expiries and losses into one ranked list. |
| Coverage of live requirements (list) | **not built** | We show the uncovered lines table; a per-requirement coverage list with a badge is a small addition. |
| Submission deadlines, next 14 days | **not built** | Easy: requirements with `submission_deadline` within 14 days. |
| Global search in the top bar | **not built** | We have search on the History page; a top-bar box that jumps there is cosmetic. |
| "Remove demo data" | **out of scope** | Would need a delete path per table; the seed is marked `is_demo` so it can be filtered or removed with one SQL statement if wanted. |
| Leads / Activity screens | **not built** | The brief has no separate lead entity (the RFI is the lead) and no activity log screen; the `audit_log` table exists for Activity later. |

## 4. Ranking of what is worth doing next

1. Money outstanding by age (cash-flow surface the owner asked for) — small.
2. Submission deadlines, next 14 days — small, high urgency value.
3. Coverage-of-live-requirements list — small, already have the view.
4. Unified "Needs attention" feed — medium.
5. Per-KPI sparklines — cosmetic; do last.
