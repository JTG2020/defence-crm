// The auth client uses the PUBLISHABLE (anon) key, never the secret key: the secret key
// bypasses RLS and must not be the session identity. Set both vars in .env (server-side).
export interface SupabaseConfig {
  url: string;
  key: string;
}

export function supabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig | null {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export function missingConfigSetting(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!env.SUPABASE_URL?.trim()) return "SUPABASE_URL";
  if (!env.SUPABASE_PUBLISHABLE_KEY?.trim()) return "SUPABASE_PUBLISHABLE_KEY";
  return null;
}
