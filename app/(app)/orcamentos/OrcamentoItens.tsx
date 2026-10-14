"use client";

import { useState, type FormEvent } from "react";
import SearchDialog from "@/components/SearchDialog";
import {
  criarProdutoNoOrcamento,
  criarServicoNoOrcamento,
  type ProdutoOrcamento,
  type ServicoOrcamento,
} from "./catalog-actions";

type TipoOrcamento = "produtos" | "servicos" | "produtos-servicos";
type Linha = { chave: string; itemId: string; quantidade: string };
type LinhaSalva = { tipo: "produto" | "servico"; id: number; quantidade: number };

function novaLinha(): Linha {
  return { chave: crypto.randomUUID(), itemId: "", quantidade: "1" };
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function OrcamentoItens({
  tipo,
  produtos: produtosIniciais,
  servicos: servicosIniciais,
  erroProdutos,
  erroServicos,
  onContinue,
}: {
  tipo: TipoOrcamento;
  produtos: ProdutoOrcamento[];
  servicos: ServicoOrcamento[];
  erroProdutos?: string;
  erroServicos?: string;
  onContinue: (totalProdutos: number, totalServicos: number, itens: LinhaSalva[]) => void;
}) {
  const [produtos, setProdutos] = useState(produtosIniciais);
  const [servicos, setServicos] = useState(servicosIniciais);
  const [linhasProdutos, setLinhasProdutos] = useState<Linha[]>([novaLinha()]);
  const [linhasServicos, setLinhasServicos] = useState<Linha[]>([novaLinha()]);
  const [erro, setErro] = useState("");

  const incluiProdutos = tipo !== "servicos";
  const incluiServicos = tipo !== "produtos";

  function atualizarLinha(
    linhas: Linha[],
    setLinhas: (linhas: Linha[]) => void,
    chave: string,
    atualizacao: Partial<Linha>
  ) {
    setLinhas(linhas.map((linha) => linha.chave === chave ? { ...linha, ...atualizacao } : linha));
  }

  function selecionarProduto(chave: string, id: number) {
    if (linhasProdutos.some((linha) => linha.chave !== chave && linha.itemId === String(id))) {
      setErro("Esse produto já foi adicionado ao orçamento.");
      return;
    }
    setErro("");
    atualizarLinha(linhasProdutos, setLinhasProdutos, chave, { itemId: String(id) });
  }

  function selecionarServico(chave: string, id: number) {
    if (linhasServicos.some((linha) => linha.chave !== chave && linha.itemId === String(id))) {
      setErro("Esse serviço já foi adicionado ao orçamento.");
      return;
    }
    setErro("");
    atualizarLinha(linhasServicos, setLinhasServicos, chave, { itemId: String(id) });
  }

  function total(linhas: Linha[], itens: Array<{ id: number; valor: number }>) {
    return linhas.reduce((soma, linha) => {
      const item = itens.find((opcao) => String(opcao.id) === linha.itemId);
      const quantidade = Number(linha.quantidade);
      return soma + (item && Number.isFinite(quantidade) ? item.valor * quantidade : 0);
    }, 0);
  }

  function continuar() {
    const produtoInvalido = incluiProdutos && !linhasProdutos.some((linha) => {
      const quantidade = Number(linha.quantidade);
      return linha.itemId && Number.isFinite(quantidade) && quantidade > 0;
    });
    const servicoInvalido = incluiServicos && !linhasServicos.some((linha) => {
      const quantidade = Number(linha.quantidade);
      return linha.itemId && Number.isFinite(quantidade) && quantidade > 0;
    });
    if (produtoInvalido || servicoInvalido) {
      setErro("Selecione ao menos um item válido e informe uma quantidade maior que zero em cada categoria do orçamento.");
      return;
    }
    setErro("");
    const itens: LinhaSalva[] = [
      ...(incluiProdutos ? linhasProdutos.flatMap((linha) => {
        const id = Number(linha.itemId);
        const quantidade = Number(linha.quantidade);
        return linha.itemId && Number.isSafeInteger(id) && id > 0 && Number.isFinite(quantidade) && quantidade > 0
          ? [{ tipo: "produto" as const, id, quantidade }]
          : [];
      }) : []),
      ...(incluiServicos ? linhasServicos.flatMap((linha) => {
        const id = Number(linha.itemId);
        const quantidade = Number(linha.quantidade);
        return linha.itemId && Number.isSafeInteger(id) && id > 0 && Number.isFinite(quantidade) && quantidade > 0
          ? [{ tipo: "servico" as const, id, quantidade }]
          : [];
      }) : []),
    ];
    onContinue(
      incluiProdutos ? total(linhasProdutos, produtos) : 0,
      incluiServicos ? total(linhasServicos, servicos) : 0,
      itens
    );
  }

  async function salvarProduto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    const form = event.currentTarget;
    const resultado = await criarProdutoNoOrcamento(new FormData(form));
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setProdutos((atuais) => [...atuais, resultado.item].sort((a, b) => a.nome.localeCompare(b.nome)));
    setLinhasProdutos((atuais) => {
      const linhaVazia = atuais.find((linha) => !linha.itemId);
      return linhaVazia
        ? atuais.map((linha) => linha.chave === linhaVazia.chave ? { ...linha, itemId: String(resultado.item.id) } : linha)
        : [...atuais, { ...novaLinha(), itemId: String(resultado.item.id) }];
    });
    form.reset();
    form.closest("details")?.removeAttribute("open");
  }

  async function salvarServico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    const form = event.currentTarget;
    const resultado = await criarServicoNoOrcamento(new FormData(form));
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setServicos((atuais) => [...atuais, resultado.item].sort((a, b) => a.nome.localeCompare(b.nome)));
    setLinhasServicos((atuais) => {
      const linhaVazia = atuais.find((linha) => !linha.itemId);
      return linhaVazia
        ? atuais.map((linha) => linha.chave === linhaVazia.chave ? { ...linha, itemId: String(resultado.item.id) } : linha)
        : [...atuais, { ...novaLinha(), itemId: String(resultado.item.id) }];
    });
    form.reset();
    form.closest("details")?.removeAttribute("open");
  }

  return (
    <div id="orcamento-panel-itens" className="orcamento-panel" role="tabpanel" aria-labelledby="orcamento-tab-itens">
      <h2 className="orcamento-itens-titulo">Selecione os itens do orçamento</h2>
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {incluiProdutos && (
        <section className="orcamento-secao-itens" aria-labelledby="orcamento-produtos-titulo">
          <h3 id="orcamento-produtos-titulo">Produtos</h3>
          {erroProdutos && (
            <div className="aviso erro" role="alert">
              O catálogo de produtos não está disponível. Execute supabase/produtos.sql no SQL Editor do Supabase.
            </div>
          )}
          {linhasProdutos.map((linha, indice) => {
            const produto = produtos.find((opcao) => String(opcao.id) === linha.itemId);
            return (
              <div className="orcamento-item-linha" key={linha.chave}>
                <div className="campo">
                  <span>Produto {indice + 1}</span>
                  <SearchDialog
                    title="Buscar produto"
                    searchLabel="Código interno ou nome do produto"
                    placeholder="Buscar produto"
                    disabled={Boolean(erroProdutos)}
                    items={produtos
                      .filter((item) => item.id === produto?.id || !linhasProdutos.some((selecionado) => selecionado.chave !== linha.chave && selecionado.itemId === String(item.id)))
                      .map((item) => ({
                        id: item.id,
                        label: `${item.codigo_interno} — ${item.nome}`,
                        detail: `${moeda(Number(item.valor))}/${item.unidade_medida}`,
                      }))}
                    selectedId={produto?.id ?? null}
                    onSelect={(item) => selecionarProduto(linha.chave, item.id)}
                  />
                </div>
                <label className="campo">
                  <span>Quantidade</span>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={linha.quantidade}
                    onChange={(event) => atualizarLinha(linhasProdutos, setLinhasProdutos, linha.chave, { quantidade: event.target.value })}
                  />
                </label>
                {produto && <span className="orcamento-item-subtotal">Subtotal: {moeda(Number(produto.valor) * Number(linha.quantidade || 0))}</span>}
                {linhasProdutos.length > 1 && (
                  <button className="btn sec" type="button" onClick={() => setLinhasProdutos(linhasProdutos.filter((item) => item.chave !== linha.chave))}>
                    Remover
                  </button>
                )}
              </div>
            );
          })}
          <div className="orcamento-acoes-itens">
            <button className="btn sec" type="button" onClick={() => setLinhasProdutos([...linhasProdutos, novaLinha()])}>
              + Adicionar produto
            </button>
            <details className="orcamento-cadastro-rapido">
              <summary className="btn sec">+ Cadastrar produto</summary>
              <form className="grid2" onSubmit={salvarProduto}>
                <label className="campo"><span>Produto*</span><input name="nome" required maxLength={200} /></label>
                <label className="campo"><span>Categoria*</span><input name="categoria" required maxLength={100} /></label>
                <label className="campo"><span>Unidade de medida*</span><input name="unidade_medida" required maxLength={50} /></label>
                <label className="campo"><span>Valor (R$)*</span><input name="valor" type="number" min="0" step="0.01" required /></label>
                <label className="campo"><span>Fabricante</span><input name="fabricante" maxLength={200} /></label>
                <label className="campo"><span>Imagem</span><input name="imagem" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
                <button className="btn" type="submit">Cadastrar produto</button>
              </form>
            </details>
          </div>
          <p className="orcamento-total-secao">Total de produtos: {moeda(total(linhasProdutos, produtos))}</p>
        </section>
      )}

      {incluiServicos && (
        <section className="orcamento-secao-itens" aria-labelledby="orcamento-servicos-titulo">
          <h3 id="orcamento-servicos-titulo">Serviços</h3>
          {erroServicos && (
            <div className="aviso erro" role="alert">
              O catálogo de serviços não está disponível. Execute supabase/servicos.sql no SQL Editor do Supabase.
            </div>
          )}
          {linhasServicos.map((linha, indice) => {
            const servico = servicos.find((opcao) => String(opcao.id) === linha.itemId);
            return (
              <div className="orcamento-item-linha" key={linha.chave}>
                <div className="campo">
                  <span>Serviço {indice + 1}</span>
                  <SearchDialog
                    title="Buscar serviço"
                    searchLabel="Nome do serviço"
                    placeholder="Buscar serviço"
                    disabled={Boolean(erroServicos)}
                    items={servicos
                      .filter((item) => item.id === servico?.id || !linhasServicos.some((selecionado) => selecionado.chave !== linha.chave && selecionado.itemId === String(item.id)))
                      .map((item) => ({
                        id: item.id,
                        label: item.nome,
                        detail: moeda(Number(item.valor)),
                      }))}
                    selectedId={servico?.id ?? null}
                    onSelect={(item) => selecionarServico(linha.chave, item.id)}
                  />
                </div>
                <label className="campo">
                  <span>Quantidade</span>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={linha.quantidade}
                    onChange={(event) => atualizarLinha(linhasServicos, setLinhasServicos, linha.chave, { quantidade: event.target.value })}
                  />
                </label>
                {servico && <span className="orcamento-item-subtotal">Subtotal: {moeda(Number(servico.valor) * Number(linha.quantidade || 0))}</span>}
                {linhasServicos.length > 1 && (
                  <button className="btn sec" type="button" onClick={() => setLinhasServicos(linhasServicos.filter((item) => item.chave !== linha.chave))}>
                    Remover
                  </button>
                )}
              </div>
            );
          })}
          <div className="orcamento-acoes-itens">
            <button className="btn sec" type="button" onClick={() => setLinhasServicos([...linhasServicos, novaLinha()])}>
              + Adicionar serviço
            </button>
            <details className="orcamento-cadastro-rapido">
              <summary className="btn sec">+ Cadastrar serviço</summary>
              <form className="grid2" onSubmit={salvarServico}>
                <label className="campo"><span>Serviço*</span><input name="nome" required maxLength={200} /></label>
                <label className="campo"><span>Valor (R$)*</span><input name="valor" type="number" min="0" step="0.01" required /></label>
                <button className="btn" type="submit">Cadastrar serviço</button>
              </form>
            </details>
          </div>
          <p className="orcamento-total-secao">Total de serviços: {moeda(total(linhasServicos, servicos))}</p>
        </section>
      )}

      <div className="orcamento-acoes-itens">
        <button className="btn" type="button" onClick={continuar}>
          Continuar para as condições
        </button>
      </div>
    </div>
  );
}
