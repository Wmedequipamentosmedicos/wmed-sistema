import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { MENSAGENS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import OrcamentoForm from "../../OrcamentoForm";
import { editarOrcamento } from "../../actions";

const TIPOS_ORCAMENTO = ["produtos", "servicos", "produtos-servicos"] as const;

export default async function EditarOrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ id: idTexto }, { erro }, perfil] = await Promise.all([
    params,
    searchParams,
    getPerfil(),
  ]);
  const id = Number(idTexto);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  if (!perfil.ativo) redirect("/orcamentos?erro=permissao");

  const supabase = await createClient();
  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamentos")
    .select("id, criado_por, empresa_id, tipo, forma_pagamento, desconto_percentual, desconto_valor, frete, prazo_entrega, responsavel, informacoes_adicionais")
    .eq("id", id)
    .maybeSingle();
  if (erroOrcamento) {
    console.error("Falha ao carregar orçamento para edição:", erroOrcamento.message);
  }
  if (!orcamento) notFound();
  if (perfil.perfil !== "admin" && orcamento.criado_por !== perfil.user.id) {
    redirect("/orcamentos?erro=permissao");
  }
  if (!TIPOS_ORCAMENTO.includes(orcamento.tipo as (typeof TIPOS_ORCAMENTO)[number])) notFound();

  const [itensResult, empresasResult, produtosResult, servicosResult] = await Promise.all([
    supabase
      .from("orcamento_itens")
      .select("tipo_item, produto_id, servico_id, quantidade, valor_unitario")
      .eq("orcamento_id", id)
      .order("id"),
    supabase.from("empresas").select("id, nome, nome_fantasia"),
    supabase.from("produtos").select("id, codigo_interno, nome, unidade_medida, valor"),
    supabase.from("servicos").select("id, nome, valor"),
  ]);
  const itens = (itensResult.data ?? []).flatMap((item) => {
    if (item.tipo_item === "produto" && item.produto_id !== null) {
      return [{
        tipo: "produto" as const,
        id: item.produto_id,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.valor_unitario),
      }];
    }
    if (item.tipo_item === "servico" && item.servico_id !== null) {
      return [{
        tipo: "servico" as const,
        id: item.servico_id,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.valor_unitario),
      }];
    }
    return [];
  });
  const catalogoIncompleto = Boolean(itensResult.error || itens.length === 0);
  const empresas = empresasResult.data ?? [];
  const produtos = produtosResult.data ?? [];
  const servicos = servicosResult.data ?? [];
  empresas.sort((a, b) => a.nome.localeCompare(b.nome));
  produtos.sort((a, b) => a.nome.localeCompare(b.nome));
  servicos.sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <div className="topo">
        <h1>Editar orçamento</h1>
        <Link className="btn cinza" href="/orcamentos">Voltar aos orçamentos</Link>
      </div>
      {catalogoIncompleto ? (
        <div className="aviso erro" role="alert">
          Não foi possível carregar os itens deste orçamento. Confira a configuração dos catálogos no Supabase e tente novamente.
        </div>
      ) : (
        <OrcamentoForm
          empresas={empresas}
          produtos={produtos}
          servicos={servicos}
          erroEmpresas={empresasResult.error ? "empresas" : undefined}
          erroProdutos={produtosResult.error ? "produtos" : undefined}
          erroServicos={servicosResult.error ? "servicos" : undefined}
          erroFinalizacao={erro ? MENSAGENS[erro]?.texto : undefined}
          acao={editarOrcamento}
          inicial={{
            id,
            empresaId: orcamento.empresa_id,
            tipo: orcamento.tipo as (typeof TIPOS_ORCAMENTO)[number],
            itens,
            condicoes: {
              formaPagamento: orcamento.forma_pagamento ?? "",
              descontoPercentual: String(orcamento.desconto_percentual),
              descontoValor: String(orcamento.desconto_valor),
              prazoEntrega: orcamento.prazo_entrega ?? "",
              frete: String(orcamento.frete),
              responsavel: orcamento.responsavel ?? "",
              informacoesAdicionais: orcamento.informacoes_adicionais ?? "",
            },
          }}
        />
      )}
    </>
  );
}
