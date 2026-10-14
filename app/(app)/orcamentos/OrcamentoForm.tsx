"use client";

import Link from "next/link";
import { useState } from "react";

type Empresa = { id: number; nome: string; nome_fantasia: string | null };
type TipoOrcamento = "pecas" | "servicos" | "pecas-servicos";

export default function OrcamentoForm({
  empresas,
  erro,
}: {
  empresas: Empresa[];
  erro?: string;
}) {
  const [etapa, setEtapa] = useState(0);
  const [solicitanteId, setSolicitanteId] = useState("");
  const [tipoOrcamento, setTipoOrcamento] = useState<TipoOrcamento | "">("");

  return (
    <div className="form-card orcamento-card">
      <div className="orcamento-header">
        <div className="orcamento-brand">
          <span className="marca-ponto">W</span>
          <span>Novo orçamento</span>
        </div>
      </div>

      <div className="tabs-bar orcamento-tabs" role="tablist" aria-label="Etapas do orçamento">
        <button
          id="orcamento-tab-solicitante"
          type="button"
          role="tab"
          aria-selected={etapa === 0}
          aria-controls="orcamento-panel-solicitante"
          className={etapa === 0 ? "on" : ""}
          onClick={() => setEtapa(0)}
        >
          Solicitante
        </button>
        <button
          id="orcamento-tab-tipo"
          type="button"
          role="tab"
          aria-selected={etapa === 1}
          aria-controls="orcamento-panel-tipo"
          className={etapa === 1 ? "on" : ""}
          disabled={!solicitanteId}
          onClick={() => setEtapa(1)}
        >
          Tipo de orçamento
        </button>
      </div>

      {etapa === 0 ? (
        <div
          id="orcamento-panel-solicitante"
          className="orcamento-panel"
          role="tabpanel"
          aria-labelledby="orcamento-tab-solicitante"
        >
          {erro && (
            <div className="aviso erro" role="alert">
              Não foi possível carregar as empresas e clientes cadastrados.
            </div>
          )}
          <label className="campo">
            <span>Solicitante</span>
            <select
              name="solicitante_id"
              value={solicitanteId}
              required
              disabled={Boolean(erro) || empresas.length === 0}
              onChange={(event) => {
                setSolicitanteId(event.target.value);
                setEtapa(1);
              }}
            >
              <option value="" disabled>
                {empresas.length ? "Selecione uma empresa ou cliente" : "Nenhuma empresa ou cliente cadastrado"}
              </option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome_fantasia ? `${empresa.nome} (${empresa.nome_fantasia})` : empresa.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div
          id="orcamento-panel-tipo"
          className="orcamento-panel"
          role="tabpanel"
          aria-labelledby="orcamento-tab-tipo"
        >
          <fieldset className="orcamento-tipo">
            <legend>Como será o orçamento?</legend>
            <div className="orcamento-tipo-opcoes">
              {([
                ["pecas", "Produtos"],
                ["servicos", "Serviços"],
                ["pecas-servicos", "Produtos/Serviços"],
              ] as const).map(([value, label]) => (
                <label className={tipoOrcamento === value ? "selecionado" : ""} key={value}>
                  <input
                    type="radio"
                    name="tipo_orcamento"
                    value={value}
                    checked={tipoOrcamento === value}
                    onChange={() => setTipoOrcamento(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      <div className="rodape-form orcamento-rodape">
        {etapa === 1 && (
          <button className="btn sec" type="button" onClick={() => setEtapa(0)}>
            Voltar
          </button>
        )}
        <Link className="btn cinza" href="/orcamentos">Cancelar</Link>
      </div>
    </div>
  );
}
