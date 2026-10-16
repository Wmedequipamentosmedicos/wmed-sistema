"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPerfil, num, txt } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ItemOrcamento = { tipo: "produto" | "servico"; id: number; quantidade: number };
const FORMAS_PAGAMENTO = ["avista", "pix", "boleto", "transferencia", "cartao", "faturado", "outro"];

function falhaBanco(codigo: string | undefined) {
  if (codigo === "42P01" || codigo === "PGRST202" || codigo === "PGRST205") return "orcamentos_configuracao";
  if (codigo === "42501") return "permissao";
  if (codigo === "55000") return "orcamento_empresa";
  return "orcamento_salvar";
}

export async function finalizarOrcamento(formData: FormData): Promise<never> {
  const perfil = await getPerfil();
  const voltar = "/orcamentos/novo";
  const empresaId = num(formData, "empresa_id");
  const tipo = txt(formData, "tipo_orcamento");
  const formaPagamento = txt(formData, "forma_pagamento");
  const descontoPercentual = Number(txt(formData, "desconto_percentual") ?? "0");
  const descontoValor = Number(txt(formData, "desconto_valor") ?? "0");
  const frete = Number(txt(formData, "frete") ?? "0");
  const itensTexto = txt(formData, "itens");

  if (
    empresaId === null || empresaId <= 0 ||
    !["produtos", "servicos", "produtos-servicos"].includes(tipo ?? "") ||
    (formaPagamento !== null && !FORMAS_PAGAMENTO.includes(formaPagamento)) ||
    !Number.isFinite(descontoPercentual) || descontoPercentual < 0 || descontoPercentual > 100 ||
    !Number.isFinite(descontoValor) || descontoValor < 0 ||
    !Number.isFinite(frete) || frete < 0 ||
    !itensTexto
  ) redirect(`${voltar}?erro=orcamento_campos`);

  let itens: ItemOrcamento[];
  try {
    const parseado: unknown = JSON.parse(itensTexto);
    if (!Array.isArray(parseado) || parseado.length === 0 || parseado.length > 200) {
      redirect(`${voltar}?erro=orcamento_campos`);
    }
    itens = parseado.map((item: unknown) => {
      if (
        typeof item !== "object" || item === null ||
        !("tipo" in item) || !("id" in item) || !("quantidade" in item) ||
        (item.tipo !== "produto" && item.tipo !== "servico") ||
        typeof item.id !== "number" || !Number.isSafeInteger(item.id) || item.id <= 0 ||
        typeof item.quantidade !== "number" || !Number.isFinite(item.quantidade) ||
        item.quantidade <= 0 || item.quantidade > 1000000
      ) throw new Error("Invalid quote item");
      return { tipo: item.tipo, id: item.id, quantidade: item.quantidade };
    });
  } catch {
    redirect(`${voltar}?erro=orcamento_campos`);
  }

  const tipoOrcamento = tipo as "produtos" | "servicos" | "produtos-servicos";
  const tiposPermitidos: Record<typeof tipoOrcamento, ItemOrcamento["tipo"][]> = {
    produtos: ["produto"],
    servicos: ["servico"],
    "produtos-servicos": ["produto", "servico"],
  };
  if (itens.some((item) => !tiposPermitidos[tipoOrcamento].includes(item.tipo))) {
    redirect(`${voltar}?erro=orcamento_campos`);
  }
  const itensUnicos = new Set(itens.map((item) => `${item.tipo}:${item.id}`));
  if (itensUnicos.size !== itens.length) redirect(`${voltar}?erro=orcamento_campos`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalizar_orcamento", {
    p_empresa_id: empresaId,
    p_criado_por: perfil.user.id,
    p_tipo: tipoOrcamento,
    p_itens: itens,
    p_forma_pagamento: formaPagamento || null,
    p_desconto_percentual: descontoPercentual,
    p_desconto_valor: descontoValor,
    p_frete: frete,
    p_prazo_entrega: txt(formData, "prazo_entrega"),
    p_informacoes_adicionais: txt(formData, "informacoes_adicionais"),
    p_responsavel: txt(formData, "responsavel"),
  });

  if (error || typeof data !== "number") {
    console.error("Falha ao finalizar orçamento:", { code: error?.code, message: error?.message });
    redirect(`${voltar}?erro=${falhaBanco(error?.code)}`);
  }

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${data}/pdf`);
}

export async function excluirOrcamento(formData: FormData): Promise<never> {
  const perfil = await getPerfil();
  if (!perfil.ativo || perfil.perfil !== "admin") redirect("/orcamentos?erro=permissao");

  const id = num(formData, "id");
  if (id === null || id <= 0) redirect("/orcamentos?erro=orcamento_excluir");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Falha ao excluir orçamento:", { code: error.code, message: error.message });
    if (error.code === "42P01" || error.code === "PGRST205") {
      redirect("/orcamentos?erro=orcamentos_configuracao");
    }
    redirect(`/orcamentos?erro=${error.code === "42501" ? "permissao" : "orcamento_excluir"}`);
  }
  if (!data) redirect("/orcamentos?erro=orcamento_excluir");

  revalidatePath("/orcamentos");
  redirect("/orcamentos?ok=excluido");
}
