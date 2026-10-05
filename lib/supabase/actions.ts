"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "./server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email and password are required"));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect(next.startsWith("/") ? next : "/");
}

export async function signOutAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
