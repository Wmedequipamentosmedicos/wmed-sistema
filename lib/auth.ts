import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseAnonConfig } from "@/lib/supabase/config";

// Retorna o usuário logado e seu perfil. Sem login, leva para /login.
export async function getPerfil() {
  if (!hasSupabaseAnonConfig()) {
    redirect("/login?erro=config");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("perfis")
    .select("nome, perfil, ativo")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    nome: (data?.nome as string) ?? user.email ?? "",
    perfil: (data?.perfil as string) ?? "tecnico",
    // Sem registro de perfil = sem acesso.
    ativo: data ? Boolean(data.ativo) : false,
  };
}

export async function requireAdmin() {
  const p = await getPerfil();
  if (!p.ativo || p.perfil !== "admin") redirect("/?erro=permissao");
  return p;
}

export function txt(f: FormData, chave: string): string | null {
  const v = String(f.get(chave) ?? "").trim();
  return v === "" ? null : v;
}

export function num(f: FormData, chave: string): number | null {
  const v = txt(f, chave);
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}
