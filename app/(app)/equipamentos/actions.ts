"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfil, txt, num } from "@/lib/auth";
import { ESTADOS_EQUIPAMENTO, PRIORIDADES, MODOS_USO } from "@/lib/constants";

// Resolve uma lista com "+": se o usuário digitou um item novo, cria (ou reaproveita) e devolve o id.
async function resolverLista(
  supabase: any,
  tabela: "tipos_equipamento" | "quadros_trabalho",
  formData: FormData,
  campoId: string,
  campoNovo: string
): Promise<{ id: number | null; falhou: boolean }> {
  const novo = txt(formData, campoNovo);
  if (novo) {
    const { data, error } = await supabase
      .from(tabela)
      .upsert({ nome: novo }, { onConflict: "nome" })
      .select("id")
      .single();
    if (error || !data) return { id: null, falhou: true };
    return { id: data.id as number, falhou: false };
  }
  return { id: num(formData, campoId), falhou: false };
}

export async function salvarEquipamento(formData: FormData) {
  await getPerfil();

  const idTexto = txt(formData, "id");
  const id = idTexto ? Number(idTexto) : null;
  const voltar = id ? `/equipamentos/${id}` : "/equipamentos/novo";
  if (idTexto && !Number.isInteger(id)) redirect("/equipamentos?erro=salvar");

  const supabase = await createClient();

  const tipo = await resolverLista(supabase, "tipos_equipamento", formData, "tipo_id", "novo_tipo");
  const quadro = await resolverLista(supabase, "quadros_trabalho", formData, "quadro_id", "novo_quadro");
  if (tipo.falhou || quadro.falhou) redirect(`${voltar}?erro=salvar`);

  const proprietario = num(formData, "proprietario_id");
  const estado = txt(formData, "estado");
  const prioridade = txt(formData, "prioridade");
  const modoUso = txt(formData, "modo_uso");

  if (
    tipo.id === null ||
    proprietario === null ||
    !estado || !ESTADOS_EQUIPAMENTO.includes(estado) ||
    !prioridade || !PRIORIDADES.includes(prioridade) ||
    !modoUso || !MODOS_USO.includes(modoUso)
  ) {
    redirect(`${voltar}?erro=campos`);
  }

  const linha = {
    tipo_id: tipo.id,
    quadro_id: quadro.id,
    fabricante: txt(formData, "fabricante"),
    modelo: txt(formData, "modelo"),
    estado,
    proprietario_id: proprietario,
    identificacao_tag: txt(formData, "identificacao_tag"),
    numero_serie: txt(formData, "numero_serie"),
    patrimonio: txt(formData, "patrimonio"),
    portaria_inmetro: txt(formData, "portaria_inmetro"),
    prioridade,
    modo_uso: modoUso,
    data_fabricacao: txt(formData, "data_fabricacao"),
    data_aquisicao: txt(formData, "data_aquisicao"),
    informacoes_extras: txt(formData, "informacoes_extras"),
    informacoes_contrato: txt(formData, "informacoes_contrato"),
    observacoes: txt(formData, "observacoes"),
    atualizado_em: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("equipamentos").update(linha).eq("id", id)
    : await supabase.from("equipamentos").insert(linha);

  if (error) redirect(`${voltar}?erro=salvar`);

  revalidatePath("/equipamentos");
  redirect("/equipamentos?ok=ok");
}

export async function excluirEquipamento(formData: FormData) {
  const p = await getPerfil();
  if (p.perfil !== "admin") redirect("/equipamentos?erro=permissao");

  const id = num(formData, "id");
  if (id === null) redirect("/equipamentos?erro=salvar");

  const supabase = await createClient();
  const { error } = await supabase.from("equipamentos").delete().eq("id", id);
  if (error) redirect("/equipamentos?erro=vinculos");

  revalidatePath("/equipamentos");
  redirect("/equipamentos?ok=excluido");
}
