import { describe, expect, it } from "vitest";
import { agingBucket, daysSince, expiryState, isDeliveryAtRisk } from "./dates";

const NOW = new Date("2026-10-05T00:00:00.000Z");

describe("document expiry", () => {
  it("DOC-02 calls a certificate expiring inside the 60-day window", () => {
    expect(expiryState("2026-11-15", NOW)).toBe("expiring");
  });

  it("DOC-03 leaves a document with a distant expiry alone", () => {
    expect(expiryState("2027-06-01", NOW)).toBe("valid");
  });

  it("flags an already-expired document", () => {
    expect(expiryState("2026-09-01", NOW)).toBe("expired");
  });
});

describe("delivery risk", () => {
  it("DELIV-02 flags expected completion after the committed deadline", () => {
    expect(isDeliveryAtRisk("2026-11-05", "2026-10-30")).toBe(true);
    expect(isDeliveryAtRisk("2026-10-20", "2026-10-30")).toBe(false);
  });
});

describe("aging", () => {
  it("buckets follow-up age", () => {
    expect(agingBucket(daysSince("2026-10-01", NOW))).toBe("0-6 days");
    expect(agingBucket(daysSince("2026-09-25", NOW))).toBe("7-13 days");
    expect(agingBucket(daysSince("2026-09-15", NOW))).toBe("14-29 days");
    expect(agingBucket(daysSince("2026-08-01", NOW))).toBe("30+ days");
  });
});
