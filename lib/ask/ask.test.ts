import { describe, expect, it } from "vitest";
import {
  documentsWithStatus,
  listOemRequests,
  listQuotes,
  listRequirements,
  listUncoveredLines,
} from "../seed/repository";
import { ask, type AskRepository } from "./ask";

// The production repository is Postgres; the tests use the in-repo fixtures with the same shape.
const repo: AskRepository = {
  listRequirements,
  listQuotes,
  listOemRequests,
  listUncoveredLines,
  documentsWithStatus,
};

const q = (question: string) => ask(question, repo);

describe("Ask layer — deterministic, no invention", () => {
  it("answers open requirements from the repository", () => {
    const r = q("How many requirements are open?");
    expect(r.kind).toBe("answer");
    expect(r.answer).toContain("6 open requirements");
    expect(r.howCounted).toBeTruthy();
  });

  it("answers quotes awaiting a response", () => {
    expect(q("How many quotes are awaiting a response?").answer).toContain("2 quotes awaiting");
  });

  it("answers pending OEM responses", () => {
    expect(q("How many OEM responses are pending?").answer).toContain("3 OEM responses pending");
  });

  it("answers documents expiring", () => {
    expect(q("Which documents are expiring?").answer).toContain("2 documents expiring");
  });

  it("answers uncovered lines, scoped to requirements still in play", () => {
    // req-003 (200), req-005 (250) and req-011 (180) are active; closed RFIs are excluded.
    expect(q("Which lines are uncovered?").answer).toContain("3 line items");
  });

  it("answers why we lost with the reasons", () => {
    const r = q("Why did we lose?");
    expect(r.answer).toContain("3 lost");
    expect(r.records?.some((x) => /price/i.test(x.label))).toBe(true);
  });

  it("answers win/loss counts", () => {
    expect(q("How many did we win?").answer).toContain("2 requirements won");
    expect(q("How many did we lose?").answer).toContain("3 requirements lost");
  });

  it("says so when it cannot answer, and never guesses", () => {
    const r = q("What is the weather in Delhi?");
    expect(r.kind).toBe("unknown");
    expect(r.message).toMatch(/can't answer/i);
    expect(r.answer).toBeUndefined();
  });

  it("every answer carries its how-counted definition", () => {
    for (const question of [
      "How many requirements are open?",
      "How many quotes are awaiting a response?",
      "Which documents are expiring?",
      "Which lines are uncovered?",
      "Why did we lose?",
    ]) {
      const r = q(question);
      expect(r.kind).toBe("answer");
      expect(r.howCounted && r.howCounted.length).toBeGreaterThan(0);
    }
  });
});
