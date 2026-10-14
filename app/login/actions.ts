"use server";

import { redirect } from "next/navigation";
import { hasSupabaseAnonConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!hasSupabaseAnonConfig()) {
    redirect("/login?erro=config");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) redirect("/login?erro=login");
  redirect("/");
}

export async function logout() {
  if (!hasSupabaseAnonConfig()) {
    redirect("/login?erro=config");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
