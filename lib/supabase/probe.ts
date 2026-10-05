// Reads the `requirements` table and reports WHY a screen has nothing to show.
// The three failure states must never collapse into one blank page:
//   missing_setting -> a configuration problem; the setting is named
//   error           -> Supabase was reached but the call failed
//   empty           -> the call succeeded and returned zero rows
// plus `rows` when it worked.

export interface RequirementRow {
  id: string;
  created_at: string;
  ref: string;
  customer: string;
  status: string;
  submission_deadline: string | null;
  notes: string | null;
}

export type Settings =
  | { ok: true; url: string; key: string; keySource: "secret" | "publishable" }
  | { ok: false; setting: string };

export type ProbeResult =
  | { kind: "missing_setting"; setting: string }
  | { kind: "error"; message: string }
  | { kind: "empty"; anonymous: boolean }
  | { kind: "rows"; rows: RequirementRow[] };

export interface Queryable {
  select(): PromiseLike<{
    data: RequirementRow[] | null;
    error: { message: string } | null;
  }>;
}

export function resolveSettings(env: Record<string, string | undefined>): Settings {
  const url = env.SUPABASE_URL?.trim();
  if (!url) return { ok: false, setting: "SUPABASE_URL" };

  const secret = env.SUPABASE_SECRET_KEY?.trim();
  const publishable = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!secret && !publishable) {
    return { ok: false, setting: "SUPABASE_PUBLISHABLE_KEY" };
  }

  return secret
    ? { ok: true, url, key: secret, keySource: "secret" }
    : { ok: true, url, key: publishable as string, keySource: "publishable" };
}

export async function probeRequirements(
  env: Record<string, string | undefined>,
  makeQuery: (url: string, key: string) => Queryable | Promise<Queryable>,
): Promise<ProbeResult> {
  const settings = resolveSettings(env);
  if (!settings.ok) {
    return { kind: "missing_setting", setting: settings.setting };
  }

  let data: RequirementRow[] | null;
  let error: { message: string } | null;
  try {
    const query = await makeQuery(settings.url, settings.key);
    const result = await query.select();
    data = result.data;
    error = result.error;
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }

  if (error) return { kind: "error", message: error.message };

  const rows = data ?? [];
  if (rows.length === 0) {
    return { kind: "empty", anonymous: settings.keySource === "publishable" };
  }
  return { kind: "rows", rows };
}
