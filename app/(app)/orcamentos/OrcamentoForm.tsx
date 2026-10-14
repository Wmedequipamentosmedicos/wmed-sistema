"use client";

import Link from "next/link";
import { useState } from "react";

const tabs = ["Solicitante", "Dados do orçamento", "Ajustes financeiros", "Informações"];

export default function OrcamentoForm() {
  const [tab, setTab] = useState(0);

  return (
    <div className="form-card orcamento-card">
      <div className="orcamento-header">
        <div className="orcamento-brand">
          <span className="marca-ponto">W</span>
          <span>Orçamento de peças</span>
        </div>
      </div>

      <div className="tabs-bar orcamento-tabs" role="tablist" aria-label="Etapas do orçamento">
        {tabs.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={tab === index}
            className={tab === index ? "on" : ""}
            onClick={() => setTab(index)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="orcamento-panel">
          <div className="linha-campos">
            <label className="campo">
              <span>Solicitante</span>
              <input defaultValue="" placeholder="Buscar solicitante" />
            </label>
            <label className="campo">
              <span>Unidade de medida</span>
              <input defaultValue="" placeholder="Selecione" />
            </label>
          </div>

          <div className="linha-campos">
            <label className="campo">
              <span>Tipo de solicitação</span>
              <input defaultValue="" placeholder="Selecione" />
            </label>
            <label className="campo">
              <span>Empresa</span>
              <input defaultValue="" placeholder="Empresa solicitante" />
            </label>
          </div>

          <div className="linha-campos">
            <label className="campo">
              <span>Contato</span>
              <input defaultValue="" placeholder="Nome do contato" />
            </label>
            <label className="campo">
              <span>Telefone</span>
              <input defaultValue="" placeholder="(00) 00000-0000" />
            </label>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="orcamento-panel">
          <div className="linha-campos">
            <label className="campo">
              <span>Peça</span>
              <input defaultValue="" placeholder="Nome da peça" />
            </label>
            <label className="campo">
              <span>Quantidade</span>
              <input defaultValue="1" />
            </label>
          </div>

          <div className="linha-campos">
            <label className="campo">
              <span>Valor unitário (R$)</span>
              <input defaultValue="3.00" />
            </label>
            <label className="campo">
              <span>Valor total (R$)</span>
              <input defaultValue="3.00" />
            </label>
          </div>

          <div className="linha-campos">
            <label className="campo">
              <span>Forma de pagamento</span>
              <select defaultValue="">
                <option value="">Selecione</option>
                <option value="avista">À vista</option>
                <option value="parcelado">Parcelado</option>
                <option value="prazo">Prazo</option>
              </select>
            </label>
            <label className="campo">
              <span>Modo de pagamento</span>
              <select defaultValue="">
                <option value="">Selecione</option>
                <option value="outros">Outros</option>
                <option value="boleto">Boleto</option>
                <option value="transferencia">Transferência</option>
              </select>
            </label>
          </div>

          <label className="campo col-2">
            <span>Descrição</span>
            <textarea defaultValue="" placeholder="Descreva a peça ou o item do orçamento" />
          </label>
        </div>
      )}

      {tab === 2 && (
        <div className="orcamento-panel">
          <div className="linha-campos">
            <label className="campo">
              <span>Desconto (%)</span>
              <input defaultValue="0" />
            </label>
            <label className="campo">
              <span>Valor do desconto</span>
              <input defaultValue="R$ 0,00" />
            </label>
          </div>

          <div className="linha-campos">
            <label className="campo">
              <span>Valor total com desconto</span>
              <input defaultValue="R$ 0,00" />
            </label>
            <label className="campo">
              <span>Prazo de entrega</span>
              <input defaultValue="15 dias" />
            </label>
          </div>

          <div className="linha-campos">
            <label className="campo">
              <span>Observações financeiras</span>
              <textarea defaultValue="" placeholder="Condições, pagamentos e descontos" />
            </label>
          </div>
        </div>
      )}

      {tab === 3 && (
        <div className="orcamento-panel">
          <div className="linha-campos">
            <label className="campo">
              <span>Observações gerais</span>
              <textarea defaultValue="" placeholder="Informações adicionais para o cliente" />
            </label>
          </div>

          <div className="linha-campos">
            <label className="campo">
              <span>Responsável</span>
              <input defaultValue="" placeholder="Nome do responsável" />
            </label>
            <label className="campo">
              <span>Contato do responsável</span>
              <input defaultValue="" placeholder="E-mail ou telefone" />
            </label>
          </div>
        </div>
      )}

      <div className="rodape-form orcamento-rodape">
        <button className="btn sec" type="button">Voltar</button>
        <button className="btn" type="button">Próximo</button>
        <Link className="btn cinza" href="/orcamentos">Cancelar</Link>
      </div>
    </div>
  );
}
