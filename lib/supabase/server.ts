import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

// Cookie-backed client for Server Components, Server Actions and Route Handlers.
// Reads and writes run as the signed-in user, so RLS applies.
export async function createServerSupabase() {
  const config = supabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY)");
  }
  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called while rendering a Server Component; middleware refreshes the session instead.
        }
      },
    },
  });
}
