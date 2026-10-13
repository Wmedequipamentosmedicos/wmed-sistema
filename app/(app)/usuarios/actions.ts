"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, txt } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERFIS } from "@/lib/constants";

export async function criarUsuario(formData: FormData) {
  await requireAdmin();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/usuarios?erro=config");

  const nome = txt(formData, "nome");
  const email = txt(formData, "email")?.toLowerCase() ?? null;
  const senha = String(formData.get("senha") ?? "");
  const perfil = txt(formData, "perfil");

  if (!nome || !email || !perfil || !PERFIS.some((p) => p.valor === perfil)) redirect("/usuarios?erro=campos");
  if (senha.length < 8) redirect("/usuarios?erro=criar");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !data.user) redirect("/usuarios?erro=criar");

  // O gatilho do banco cria o perfil como "tecnico"; aqui ajustamos para o perfil escolhido.
  const { error: erroPerfil } = await admin
    .from("perfis")
    .update({ perfil, nome })
    .eq("id", data.user.id);
  if (erroPerfil) redirect("/usuarios?erro=salvar");

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=usuario_ok");
}

export async function alternarAtivo(formData: FormData) {
  const eu = await requireAdmin();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/usuarios?erro=config");

  const id = txt(formData, "id");
  const ativar = txt(formData, "ativar") === "1";
  if (!id) redirect("/usuarios?erro=salvar");
  if (id === eu.user.id) redirect("/usuarios?erro=permissao"); // ninguém desativa a si mesmo

  const admin = createAdminClient();
  const { error } = await admin.from("perfis").update({ ativo: ativar }).eq("id", id);
  if (error) redirect("/usuarios?erro=salvar");

  revalidatePath("/usuarios");
  redirect("/usuarios?ok=ok");
}
