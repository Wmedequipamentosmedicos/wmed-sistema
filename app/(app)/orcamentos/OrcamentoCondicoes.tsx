"use client";

import { useEffect, useState } from "react";
import type { TipoOrcamento } from "./types";

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function valorNumerico(valor: string) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

export default function OrcamentoCondicoes({
  action,
  botaoTexto,
  empresaId,
  tipoOrcamento,
  itens,
  totalProdutos,
  totalServicos,
  valoresIniciais,
  orcamentoId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  botaoTexto: string;
  empresaId: number;
  tipoOrcamento: TipoOrcamento;
  itens: Array<{ tipo: "produto" | "servico"; id: number; quantidade: number }>;
  totalProdutos: number;
  totalServicos: number;
  orcamentoId?: number;
  valoresIniciais: {
    formaPagamento: string;
    descontoPercentual: string;
    descontoValor: string;
    prazoEntrega: string;
    frete: string;
    responsavel: string;
    informacoesAdicionais: string;
  };
}) {
  const [percentual, setPercentual] = useState(valoresIniciais.descontoPercentual);
  const [descontoFixo, setDescontoFixo] = useState(valoresIniciais.descontoValor);
  const [frete, setFrete] = useState(valoresIniciais.frete);
  const [formaPagamento, setFormaPagamento] = useState(valoresIniciais.formaPagamento);
  const [prazoEntrega, setPrazoEntrega] = useState(valoresIniciais.prazoEntrega);
  const [responsavel, setResponsavel] = useState(valoresIniciais.responsavel);
  const [informacoesAdicionais, setInformacoesAdicionais] = useState(valoresIniciais.informacoesAdicionais);

  useEffect(() => {
    setPercentual(valoresIniciais.descontoPercentual);
    setDescontoFixo(valoresIniciais.descontoValor);
    setFrete(valoresIniciais.frete);
    setFormaPagamento(valoresIniciais.formaPagamento);
    setPrazoEntrega(valoresIniciais.prazoEntrega);
    setResponsavel(valoresIniciais.responsavel);
    setInformacoesAdicionais(valoresIniciais.informacoesAdicionais);
  }, [
    valoresIniciais.descontoPercentual,
    valoresIniciais.descontoValor,
    valoresIniciais.frete,
    valoresIniciais.formaPagamento,
    valoresIniciais.prazoEntrega,
    valoresIniciais.responsavel,
    valoresIniciais.informacoesAdicionais,
  ]);

  const subtotal = totalProdutos + totalServicos;
  const descontoPercentual = subtotal * Math.min(valorNumerico(percentual), 100) / 100;
  const aposDescontoPercentual = Math.max(0, subtotal - descontoPercentual);
  const descontoEmReais = Math.min(valorNumerico(descontoFixo), aposDescontoPercentual);
  const totalComDescontos = Math.max(0, aposDescontoPercentual - descontoEmReais);
  const totalFinal = totalComDescontos + valorNumerico(frete);

  return (
    <form action={action} id="orcamento-panel-condicoes" className="orcamento-panel" role="tabpanel" aria-labelledby="orcamento-tab-condicoes">
      <h2 className="orcamento-itens-titulo">Condições do orçamento</h2>
      {orcamentoId && <input type="hidden" name="orcamento_id" value={orcamentoId} />}
      <input type="hidden" name="empresa_id" value={empresaId} />
      <input type="hidden" name="tipo_orcamento" value={tipoOrcamento} />
      <input type="hidden" name="itens" value={JSON.stringify(itens)} />

      <div className="grid2">
        <label className="campo">
          <span>Forma de Pagamento</span>
          <select name="forma_pagamento" value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value)}>
            <option value="">Não informado</option>
            <option value="avista">À vista</option>
            <option value="pix">PIX</option>
            <option value="boleto">Boleto</option>
            <option value="transferencia">Transferência bancária</option>
            <option value="cartao">Cartão</option>
            <option value="faturado">Faturado</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label className="campo">
          <span>Prazo de Entrega</span>
          <input name="prazo_entrega" placeholder="Ex.: 15 dias úteis" maxLength={100} value={prazoEntrega} onChange={(event) => setPrazoEntrega(event.target.value)} />
        </label>
        <label className="campo">
          <span>Desconto (%)</span>
          <input
            name="desconto_percentual"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={percentual}
            onChange={(event) => setPercentual(event.target.value)}
          />
        </label>
        <label className="campo">
          <span>Desconto (R$)</span>
          <input
            name="desconto_valor"
            type="number"
            min="0"
            step="0.01"
            value={descontoFixo}
            onChange={(event) => setDescontoFixo(event.target.value)}
          />
        </label>
        <label className="campo">
          <span>Frete (R$)</span>
          <input
            name="frete"
            type="number"
            min="0"
            step="0.01"
            value={frete}
            onChange={(event) => setFrete(event.target.value)}
          />
        </label>
        <label className="campo">
          <span>Responsável pelo Orçamento</span>
          <input name="responsavel" maxLength={200} value={responsavel} onChange={(event) => setResponsavel(event.target.value)} />
        </label>
        <label className="campo col-2">
          <span>Informações Adicionais</span>
          <textarea name="informacoes_adicionais" maxLength={2000} value={informacoesAdicionais} onChange={(event) => setInformacoesAdicionais(event.target.value)} />
        </label>
      </div>

      <section className="orcamento-resumo" aria-label="Resumo dos valores">
        {totalProdutos > 0 && <p>Produtos: <strong>{moeda(totalProdutos)}</strong></p>}
        {totalServicos > 0 && <p>Serviços: <strong>{moeda(totalServicos)}</strong></p>}
        <p>Subtotal: <strong>{moeda(subtotal)}</strong></p>
        {descontoPercentual > 0 && <p>Desconto percentual: <strong>− {moeda(descontoPercentual)}</strong></p>}
        {descontoEmReais > 0 && <p>Desconto em reais: <strong>− {moeda(descontoEmReais)}</strong></p>}
        <p>Frete: <strong>{moeda(valorNumerico(frete))}</strong></p>
        <p className="orcamento-total-final">Total do orçamento: <strong>{moeda(totalFinal)}</strong></p>
      </section>
      <div className="orcamento-acoes-itens">
        <button className="btn" type="submit">{botaoTexto}</button>
      </div>
    </form>
  );
}
