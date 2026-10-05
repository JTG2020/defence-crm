import { describe, expect, it } from "vitest";
import { requirementSchema } from "./validation";

const valid = {
  ref: "REQ-2026-013",
  customer: "Customer A",
  submission_deadline: "2026-11-01",
  status: "received" as const,
  lines: [
    {
      part_number: "PN-1001",
      description: "Actuator",
      quantity: 100,
      uom: "nos",
      deadline: "2026-11-20",
    },
  ],
};

function paths(result: ReturnType<typeof requirementSchema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("requirement validation", () => {
  it("VALID-01 accepts a complete record", () => {
    expect(requirementSchema.safeParse(valid).success).toBe(true);
  });

  it("VALID-01 rejects a record missing customer and saves nothing", () => {
    const result = requirementSchema.safeParse({ ...valid, customer: "" });
    expect(result.success).toBe(false);
    expect(paths(result)).toContain("customer");
  });

  it("VALID-01 rejects a record with no line items", () => {
    const result = requirementSchema.safeParse({ ...valid, lines: [] });
    expect(result.success).toBe(false);
    expect(paths(result)).toContain("lines");
  });

  it("VALID-03 rejects a zero or negative or non-integer quantity", () => {
    for (const quantity of [0, -5, 2.5]) {
      const result = requirementSchema.safeParse({
        ...valid,
        lines: [{ ...valid.lines[0], quantity }],
      });
      expect(result.success).toBe(false);
      expect(paths(result)).toContain("lines.0.quantity");
    }
  });

  it("VALID-04 rejects a line deadline before the submission deadline", () => {
    const result = requirementSchema.safeParse({
      ...valid,
      submission_deadline: "2026-11-30",
      lines: [{ ...valid.lines[0], deadline: "2026-11-01" }],
    });
    expect(result.success).toBe(false);
    expect(paths(result)).toContain("lines");
  });

  it("VALID-05 coerces a numeric string quantity the same way the form sends it", () => {
    const result = requirementSchema.safeParse({
      ...valid,
      lines: [{ ...valid.lines[0], quantity: "100" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lines[0].quantity).toBe(100);
  });
});
