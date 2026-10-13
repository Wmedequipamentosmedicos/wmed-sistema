"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfil, txt, num } from "@/lib/auth";
import { TIPOS_EMPRESA } from "@/lib/constants";

export async function salvarEmpresa(formData: FormData) {
  await getPerfil();

  const idTexto = txt(formData, "id");
  const id = idTexto ? Number(idTexto) : null;
  const voltar = id ? `/empresas/${id}` : "/empresas/novo";

  if (idTexto && !Number.isInteger(id)) redirect("/empresas?erro=salvar");

  const nome = txt(formData, "nome");
  const tipo = txt(formData, "tipo");
  if (!nome || !tipo || !TIPOS_EMPRESA.includes(tipo)) redirect(`${voltar}?erro=campos`);

  let superior = num(formData, "superior_id");
  if (superior !== null && superior === id) superior = null; // uma empresa não pode ser superior de si mesma

  const linha = {
    nome,
    nome_fantasia: txt(formData, "nome_fantasia"),
    tipo,
    superior_id: superior,
    cpf_cnpj: txt(formData, "cpf_cnpj"),
    cep: txt(formData, "cep"),
    rua: txt(formData, "rua"),
    numero: txt(formData, "numero"),
    complemento: txt(formData, "complemento"),
    bairro: txt(formData, "bairro"),
    cidade: txt(formData, "cidade"),
    estado: txt(formData, "estado"),
    contato: txt(formData, "contato"),
    telefone: txt(formData, "telefone"),
    email: txt(formData, "email"),
    observacoes: txt(formData, "observacoes"),
    atualizado_em: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("empresas").update(linha).eq("id", id)
    : await supabase.from("empresas").insert(linha);

  if (error) redirect(`${voltar}?erro=salvar`);

  revalidatePath("/empresas");
  redirect("/empresas?ok=ok");
}

export async function excluirEmpresa(formData: FormData) {
  const p = await getPerfil();
  if (p.perfil !== "admin") redirect("/empresas?erro=permissao");

  const id = num(formData, "id");
  if (id === null) redirect("/empresas?erro=salvar");

  const supabase = await createClient();
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) redirect("/empresas?erro=vinculos");

  revalidatePath("/empresas");
  redirect("/empresas?ok=excluido");
}
