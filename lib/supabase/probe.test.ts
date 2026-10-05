import { describe, expect, it } from "vitest";
import {
  probeRequirements,
  resolveSettings,
  type Queryable,
  type RequirementRow,
} from "./probe";

const row: RequirementRow = {
  id: "1",
  created_at: "2026-10-05T00:00:00Z",
  ref: "RFI-2026-001",
  customer: "HAL",
  status: "won",
  submission_deadline: "2026-08-15",
  notes: null,
};

function query(
  value: { data: RequirementRow[] | null; error: { message: string } | null },
): () => Queryable {
  return () => ({ select: () => Promise.resolve(value) });
}

describe("resolveSettings", () => {
  it("names SUPABASE_URL when the url is missing", () => {
    expect(resolveSettings({})).toEqual({ ok: false, setting: "SUPABASE_URL" });
  });

  it("names SUPABASE_PUBLISHABLE_KEY when no key is present", () => {
    expect(resolveSettings({ SUPABASE_URL: "https://x.supabase.co" })).toEqual({
      ok: false,
      setting: "SUPABASE_PUBLISHABLE_KEY",
    });
  });

  it("prefers the secret key when both are present", () => {
    const s = resolveSettings({
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "pub",
      SUPABASE_SECRET_KEY: "sec",
    });
    expect(s.ok && s.keySource).toBe("secret");
  });
});

describe("probeRequirements — the three states are distinct", () => {
  it("reports a missing setting and names it", async () => {
    const result = await probeRequirements({ SUPABASE_URL: "https://x.supabase.co" }, query({ data: [], error: null }));
    expect(result).toEqual({ kind: "missing_setting", setting: "SUPABASE_PUBLISHABLE_KEY" });
  });

  it("reports a failed call with the real message", async () => {
    const result = await probeRequirements(
      { SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "pub" },
      query({ data: null, error: { message: "relation \"public.requirements\" does not exist" } }),
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.message).toContain("does not exist");
  });

  it("reports a thrown network failure as an error", async () => {
    const result = await probeRequirements(
      { SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "pub" },
      () => ({
        select: () => Promise.reject(new Error("fetch failed")),
      }),
    );
    expect(result).toEqual({ kind: "error", message: "fetch failed" });
  });

  it("reports an empty table as empty, and flags an anonymous read", async () => {
    const result = await probeRequirements(
      { SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "pub" },
      query({ data: [], error: null }),
    );
    expect(result).toEqual({ kind: "empty", anonymous: true });
  });

  it("returns rows when the read works", async () => {
    const result = await probeRequirements(
      { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sec" },
      query({ data: [row], error: null }),
    );
    expect(result.kind).toBe("rows");
    if (result.kind === "rows") expect(result.rows[0].ref).toBe("RFI-2026-001");
  });
});
