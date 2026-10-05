import type { Commitment, CoverageRow, CoverageState, RequirementLine } from "./types";

// The coverage arithmetic. In production this logic lives ONCE in a Postgres view
// (supabase/migrations/0002_coverage_view.sql) and the app reads its rows directly.
// This module exists only to build the demo seed and to run the fixtures that prove the
// intended arithmetic. It is the view's twin, not a second production implementation.

type CommitmentInput = Pick<
  Commitment,
  "requirement_line_id" | "oem_id" | "kind" | "quantity"
>;

export function computeCoverage(
  lineId: string,
  requiredQty: number,
  commitments: CommitmentInput[],
): CoverageRow {
  const forLine = commitments.filter((c) => c.requirement_line_id === lineId);
  const firm = forLine.filter((c) => c.kind === "firm");
  const indicative = forLine.filter((c) => c.kind === "indicative");

  const firmCommitted = sumQuantities(firm);
  const indicativeQty = sumQuantities(indicative);
  const uncovered = Math.max(0, requiredQty - firmCommitted);
  const overCommitted = Math.max(0, firmCommitted - requiredQty);

  const byOem = new Map<string, number>();
  for (const c of firm) {
    byOem.set(c.oem_id, (byOem.get(c.oem_id) ?? 0) + c.quantity);
  }

  const state: CoverageState =
    uncovered === 0 ? "covered" : firmCommitted > 0 ? "partly_covered" : "no_cover";

  return {
    requirement_line_id: lineId,
    required_qty: requiredQty,
    firm_committed_qty: firmCommitted,
    indicative_qty: indicativeQty,
    uncovered_qty: uncovered,
    over_committed_qty: overCommitted,
    state,
    firm_by_oem: [...byOem.entries()].map(([oem_id, quantity]) => ({ oem_id, quantity })),
  };
}

export function computeCoverageForLines(
  lines: Pick<RequirementLine, "id" | "quantity">[],
  commitments: CommitmentInput[],
): CoverageRow[] {
  return lines.map((line) => computeCoverage(line.id, line.quantity, commitments));
}

export interface GateOverride {
  quantity: number;
  reason: string;
}

export interface GateResult {
  allowed: boolean;
  reason: string | null;
}

export function canQuoteUncovered(
  coverage: CoverageRow,
  override?: GateOverride | null,
): GateResult {
  if (coverage.uncovered_qty === 0) {
    return { allowed: true, reason: null };
  }
  if (
    override &&
    override.quantity >= coverage.uncovered_qty &&
    override.reason.trim().length > 0
  ) {
    return { allowed: true, reason: null };
  }
  return {
    allowed: false,
    reason:
      "Uncovered balance of " +
      coverage.uncovered_qty +
      " — cover it with a firm OEM commitment, or record a written override.",
  };
}

function sumQuantities(rows: { quantity: number }[]): number {
  return rows.reduce((total, row) => total + row.quantity, 0);
}
