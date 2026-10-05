import { computeCoverage, computeCoverageForLines } from "../coverage";
import { expiryState } from "../dates";
import { format } from "date-fns";
import type {
  Commitment,
  CoverageRow,
  LossReason,
  Oem,
  OemRequest,
  Quote,
  QuoteVersion,
  QuoteVersionLine,
  Requirement,
  RequirementLine,
} from "../types";
import {
  commitments,
  DEMO_NOW,
  documents,
  oemProducts,
  oemRequests,
  oems,
  quoteVersionLines,
  quoteVersions,
  quotes,
  requirementLines,
  requirements,
} from "./data";

// Read-only repository over the in-repo demo dataset. When Supabase is wired (Phase Two),
// every function here is replaced by a query against the same table/view shapes; the
// screens do not change.

export { DEMO_NOW };

export function isDemo(): boolean {
  return true;
}

export function listRequirements(): Requirement[] {
  return [...requirements].sort((a, b) =>
    a.submission_deadline < b.submission_deadline ? 1 : -1,
  );
}

export function getRequirement(id: string): Requirement | undefined {
  return requirements.find((r) => r.id === id);
}

export function getRequirementLines(requirementId: string): RequirementLine[] {
  return requirementLines
    .filter((l) => l.requirement_id === requirementId)
    .sort((a, b) => a.line_no - b.line_no);
}

export function getCoverage(requirementId: string): CoverageRow[] {
  return computeCoverageForLines(getRequirementLines(requirementId), commitments);
}

export function getCoverageForLine(lineId: string): CoverageRow | undefined {
  const line = requirementLines.find((l) => l.id === lineId);
  if (!line) return undefined;
  return computeCoverage(line.id, line.quantity, commitments);
}

const TERMINAL_STATUS = new Set(["won", "lost", "cancelled"]);

// Uncovered lines that still matter: a won, lost or cancelled requirement does not need
// cover. Both the Today screen and the Ask layer read this, so they cannot disagree.
export function listUncoveredLines(): {
  line: RequirementLine;
  coverage: CoverageRow;
}[] {
  const activeIds = new Set(
    requirements.filter((r) => !TERMINAL_STATUS.has(r.status)).map((r) => r.id),
  );
  return requirementLines
    .filter((line) => activeIds.has(line.requirement_id))
    .map((line) => ({ line, coverage: computeCoverage(line.id, line.quantity, commitments) }))
    .filter((row) => row.coverage.uncovered_qty > 0);
}

export function listOems(): Oem[] {
  return [...oems];
}

export function getOem(id: string): Oem | undefined {
  return oems.find((o) => o.id === id);
}

export function listOemProducts(oemId?: string) {
  return oemId ? oemProducts.filter((p) => p.oem_id === oemId) : [...oemProducts];
}

export function listCommitmentsForLine(lineId: string): Commitment[] {
  return commitments
    .filter((c) => c.requirement_line_id === lineId)
    .sort((a, b) => a.shipment_seq - b.shipment_seq);
}

export function listOemRequests(requirementId?: string): OemRequest[] {
  if (!requirementId) return [...oemRequests];
  const lineIds = new Set(getRequirementLines(requirementId).map((l) => l.id));
  return oemRequests.filter((r) => lineIds.has(r.requirement_line_id));
}

export function listQuotes(): Quote[] {
  return [...quotes];
}

export function getQuoteForRequirement(requirementId: string): Quote | undefined {
  return quotes.find((q) => q.requirement_id === requirementId);
}

export function getQuoteVersions(quoteId: string): QuoteVersion[] {
  return quoteVersions
    .filter((v) => v.quote_id === quoteId)
    .sort((a, b) => b.version_no - a.version_no);
}

export function getQuoteLines(quoteVersionId: string): QuoteVersionLine[] {
  return quoteVersionLines.filter((l) => l.quote_version_id === quoteVersionId);
}

export function listDocuments() {
  return [...documents];
}

export interface DocumentStatus {
  id: string;
  title: string;
  type: string;
  expiry_state: "valid" | "expiring" | "expired" | "none";
  days_left: number | null;
}

export function documentsWithStatus(now: Date = DEMO_NOW): DocumentStatus[] {
  return documents.map((d) => {
    if (!d.expiry_date) {
      return { id: d.id, title: d.title, type: d.type, expiry_state: "none", days_left: null };
    }
    const state = expiryState(d.expiry_date, now);
    const daysLeft = Math.round(
      (new Date(d.expiry_date).getTime() - now.getTime()) / 86_400_000,
    );
    return { id: d.id, title: d.title, type: d.type, expiry_state: state, days_left: daysLeft };
  });
}

export interface Dashboard {
  openRequirements: number;
  quotesAwaitingResponse: number;
  oemResponsesPending: number;
  documentsExpiring: number;
  untracedUncoveredLines: number;
  winLoss: { month: string; won: number; lost: number }[];
  lossReasons: { reason: string; count: number }[];
}

export function dashboard(now: Date = DEMO_NOW): Dashboard {
  const terminal = new Set(["won", "lost", "cancelled"]);
  const openRequirements = requirements.filter((r) => !terminal.has(r.status)).length;

  const quotesAwaitingResponse = quotes.filter(
    (q) => q.status === "draft" || q.status === "pending_approval",
  ).length;

  const oemResponsesPending = oemRequests.filter((r) => r.responded_at === null).length;

  const documentsExpiring = documentsWithStatus(now).filter(
    (d) => d.expiry_state === "expiring" || d.expiry_state === "expired",
  ).length;

  const untracedUncoveredLines = listUncoveredLines().length;

  const byMonth = new Map<string, { won: number; lost: number }>();
  for (const r of requirements) {
    if (r.status !== "won" && r.status !== "lost") continue;
    const month = format(new Date(r.submission_deadline), "MMM yyyy");
    const bucket = byMonth.get(month) ?? { won: 0, lost: 0 };
    if (r.status === "won") bucket.won += 1;
    else bucket.lost += 1;
    byMonth.set(month, bucket);
  }
  const winLoss = [...byMonth.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const reasonCounts = new Map<LossReason, number>();
  for (const r of requirements) {
    if (r.status === "lost" && r.loss_reason) {
      reasonCounts.set(r.loss_reason, (reasonCounts.get(r.loss_reason) ?? 0) + 1);
    }
  }
  const lossReasons = [...reasonCounts.entries()].map(([reason, count]) => ({
    reason,
    count,
  }));

  return {
    openRequirements,
    quotesAwaitingResponse,
    oemResponsesPending,
    documentsExpiring,
    untracedUncoveredLines,
    winLoss,
    lossReasons,
  };
}
