import { describe, expect, it } from "vitest";
import { canQuoteUncovered, computeCoverage } from "./coverage";
import type { Commitment } from "./types";

const LINE = "line-1";

function com(
  kind: Commitment["kind"],
  oem_id: string,
  quantity: number,
  shipment_seq = 1,
): Pick<Commitment, "requirement_line_id" | "oem_id" | "kind" | "quantity" | "shipment_seq"> {
  return { requirement_line_id: LINE, oem_id, kind, quantity, shipment_seq };
}

describe("coverage arithmetic", () => {
  it("COV-01 exact cover: 1000 = 600 firm + 400 firm", () => {
    const c = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600), com("firm", "oem-b", 400)]);
    expect(c.firm_committed_qty).toBe(1000);
    expect(c.uncovered_qty).toBe(0);
    expect(c.state).toBe("covered");
  });

  it("COV-02 partial cover: 600 firm against 1000 -> uncovered 400", () => {
    const c = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600)]);
    expect(c.uncovered_qty).toBe(400);
    expect(c.state).toBe("partly_covered");
  });

  it("COV-03 indication is not cover: 600 firm + 400 indicative -> covered 600", () => {
    const c = computeCoverage(LINE, 1000, [
      com("firm", "oem-a", 600),
      com("indicative", "oem-b", 400),
    ]);
    expect(c.firm_committed_qty).toBe(600);
    expect(c.indicative_qty).toBe(400);
    expect(c.uncovered_qty).toBe(400);
    expect(c.state).toBe("partly_covered");
  });

  it("COV-04 multi-shipment counts each row once, no double count", () => {
    const c = computeCoverage(LINE, 600, [
      com("firm", "oem-a", 300, 1),
      com("firm", "oem-a", 300, 2),
    ]);
    expect(c.firm_committed_qty).toBe(600);
    expect(c.uncovered_qty).toBe(0);
    expect(c.firm_by_oem).toEqual([{ oem_id: "oem-a", quantity: 600 }]);
  });

  it("COV-07 removing a commitment flips the state", () => {
    const full = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600), com("firm", "oem-b", 400)]);
    expect(full.state).toBe("covered");
    const afterRemoval = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600)]);
    expect(afterRemoval.state).toBe("partly_covered");
    expect(afterRemoval.uncovered_qty).toBe(400);
  });

  it("COV-08 wrong-join fixture: a double-counting join would report 2000, not 1000", () => {
    const c = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600), com("firm", "oem-b", 400)]);
    expect(c.firm_committed_qty).toBe(1000);
    expect(c.firm_committed_qty).not.toBe(2000);
  });

  it("reports over-commitment rather than hiding it", () => {
    const c = computeCoverage(LINE, 500, [com("firm", "oem-a", 600)]);
    expect(c.over_committed_qty).toBe(100);
    expect(c.uncovered_qty).toBe(0);
    expect(c.state).toBe("covered");
  });

  it("no firm cover at all -> no_cover", () => {
    const c = computeCoverage(LINE, 900, [com("indicative", "oem-a", 900)]);
    expect(c.state).toBe("no_cover");
    expect(c.uncovered_qty).toBe(900);
  });
});

describe("commitment gate", () => {
  it("COV-05 blocks quoting an uncovered balance", () => {
    const c = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600)]);
    const gate = canQuoteUncovered(c);
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain("400");
  });

  it("COV-05b blocks an override with an empty reason, or a short quantity", () => {
    const c = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600)]);
    expect(canQuoteUncovered(c, { quantity: 400, reason: "   " }).allowed).toBe(false);
    expect(canQuoteUncovered(c, { quantity: 100, reason: "covered later" }).allowed).toBe(false);
  });

  it("COV-05c allows an explicit, complete, reasoned override", () => {
    const c = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600)]);
    expect(canQuoteUncovered(c, { quantity: 400, reason: "OEM B confirmed by phone" }).allowed).toBe(
      true,
    );
  });

  it("COV-06 allows quoting a fully covered line", () => {
    const c = computeCoverage(LINE, 1000, [com("firm", "oem-a", 600), com("firm", "oem-b", 400)]);
    expect(canQuoteUncovered(c).allowed).toBe(true);
  });
});
