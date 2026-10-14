"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfil, txt } from "@/lib/auth";

export async function salvarDadosEmpresa(formData: FormData) {
  const perfil = await getPerfil();
  if (perfil.perfil !== "admin") redirect("/?erro=permissao");

  const razaoSocial = txt(formData, "razao_social");
  const cnpj = txt(formData, "cnpj");
  const rua = txt(formData, "rua");
  const cidade = txt(formData, "cidade");
  const estado = txt(formData, "estado");
  const telefone = txt(formData, "telefone");
  const email = txt(formData, "email");
  if (!razaoSocial || !cnpj || !rua || !cidade || !estado || !telefone || !email) {
    redirect("/configuracoes/empresa?erro=campos");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("configuracoes_empresa")
    .update({
      razao_social: razaoSocial,
      nome_fantasia: txt(formData, "nome_fantasia") ?? razaoSocial,
      cnpj,
      rua,
      numero: txt(formData, "numero") ?? "",
      complemento: txt(formData, "complemento") ?? "",
      bairro: txt(formData, "bairro") ?? "",
      cidade,
      estado,
      cep: txt(formData, "cep") ?? "",
      telefone,
      email,
      site: txt(formData, "site") ?? "",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    console.error("Falha ao salvar dados da empresa emissora:", { code: error.code, message: error.message });
    redirect(`/configuracoes/empresa?erro=${error.code === "42P01" || error.code === "PGRST205" ? "orcamentos_configuracao" : "salvar"}`);
  }

  revalidatePath("/configuracoes/empresa");
  revalidatePath("/orcamentos");
  redirect("/configuracoes/empresa?ok=ok");
}
