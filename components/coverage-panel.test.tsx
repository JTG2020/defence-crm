import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeCoverage } from "@/lib/coverage";
import type { Commitment } from "@/lib/types";
import { CoveragePanel } from "./coverage-panel";

function com(kind: Commitment["kind"], quantity: number): Commitment {
  return {
    id: `c-${kind}-${quantity}`,
    requirement_line_id: "l1",
    oem_id: "oem-a",
    kind,
    quantity,
    unit_price: 100,
    expected_date: "2026-11-01",
    shipment_seq: 1,
    is_demo: true,
  };
}

describe("CoveragePanel gate", () => {
  it("shows a block and no quote affordance when a balance is uncovered", () => {
    const coverage = computeCoverage("l1", 1000, [com("firm", 600)]);
    render(
      <CoveragePanel
        coverage={coverage}
        commitments={[com("firm", 600)]}
        oemName={() => "OEM A"}
        oems={[{ id: "oem-a", name: "OEM A" }]}
        requirementId="l1"
      />,
    );
    expect(screen.getByText(/Cannot quote/i)).toBeInTheDocument();
    expect(screen.queryByText(/may be drafted/i)).not.toBeInTheDocument();
  });

  it("shows the allowed state when fully covered by firm commitments", () => {
    const coverage = computeCoverage("l1", 600, [com("firm", 600)]);
    render(
      <CoveragePanel
        coverage={coverage}
        commitments={[com("firm", 600)]}
        oemName={() => "OEM A"}
        oems={[{ id: "oem-a", name: "OEM A" }]}
        requirementId="l1"
      />,
    );
    expect(screen.getByText(/may be drafted/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cannot quote/i)).not.toBeInTheDocument();
  });
});
