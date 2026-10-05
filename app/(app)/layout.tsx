import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { supabaseConfig } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let userEmail: string | null = null;
  if (supabaseConfig()) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userEmail = user?.email ?? null;
    } catch {
      userEmail = null;
    }
  }

  return <AppShell userEmail={userEmail}>{children}</AppShell>;
}
