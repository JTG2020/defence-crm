// The auth client uses the PUBLISHABLE (anon) key, never the secret key: the secret key
// bypasses RLS and must not be the session identity. Set both vars in .env (server-side).
export interface SupabaseConfig {
  url: string;
  key: string;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function supabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig | null {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || !isValidUrl(url)) return null;
  return { url, key };
}

export function missingConfigSetting(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const url = env.SUPABASE_URL?.trim();
  if (!url) return "SUPABASE_URL";
  if (!isValidUrl(url)) return "SUPABASE_URL (not a valid https URL)";
  if (!env.SUPABASE_PUBLISHABLE_KEY?.trim()) return "SUPABASE_PUBLISHABLE_KEY";
  return null;
}
