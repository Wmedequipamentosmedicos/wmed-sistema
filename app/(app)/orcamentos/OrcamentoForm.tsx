"use client";

import Link from "next/link";
import { useState } from "react";
import SearchDialog from "@/components/SearchDialog";
import OrcamentoCondicoes from "./OrcamentoCondicoes";
import OrcamentoItens from "./OrcamentoItens";

type Empresa = { id: number; nome: string; nome_fantasia: string | null };
type TipoOrcamento = "produtos" | "servicos" | "produtos-servicos";
type Produto = { id: number; codigo_interno: number; nome: string; unidade_medida: string; valor: number };
type Servico = { id: number; nome: string; valor: number };
type LinhaSalva = { tipo: "produto" | "servico"; id: number; quantidade: number };

export default function OrcamentoForm({
  empresas,
  produtos,
  servicos,
  erroEmpresas,
  erroProdutos,
  erroServicos,
  erroFinalizacao,
}: {
  empresas: Empresa[];
  produtos: Produto[];
  servicos: Servico[];
  erroEmpresas?: string;
  erroProdutos?: string;
  erroServicos?: string;
  erroFinalizacao?: string;
}) {
  const [etapa, setEtapa] = useState(0);
  const [solicitanteId, setSolicitanteId] = useState("");
  const [tipoOrcamento, setTipoOrcamento] = useState<TipoOrcamento | "">("");
  const [itensConfirmados, setItensConfirmados] = useState(false);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [totalServicos, setTotalServicos] = useState(0);
  const [itens, setItens] = useState<LinhaSalva[]>([]);
  const solicitante = empresas.find((empresa) => String(empresa.id) === solicitanteId);

  return (
    <div className="form-card orcamento-card">
      <div className="orcamento-header">
        <div className="orcamento-brand">
          <span className="marca-ponto">W</span>
          <span>Novo orçamento</span>
        </div>
      </div>

      {erroFinalizacao && <div className="aviso erro" role="alert">{erroFinalizacao}</div>}

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
        <button
          id="orcamento-tab-itens"
          type="button"
          role="tab"
          aria-selected={etapa === 2}
          aria-controls="orcamento-panel-itens"
          className={etapa === 2 ? "on" : ""}
          disabled={!tipoOrcamento}
          onClick={() => setEtapa(2)}
        >
          Produtos e serviços
        </button>
        <button
          id="orcamento-tab-condicoes"
          type="button"
          role="tab"
          aria-selected={etapa === 3}
          aria-controls="orcamento-panel-condicoes"
          className={etapa === 3 ? "on" : ""}
          disabled={!itensConfirmados}
          onClick={() => setEtapa(3)}
        >
          Condições do orçamento
        </button>
      </div>

      {etapa === 0 ? (
        <div
          id="orcamento-panel-solicitante"
          className="orcamento-panel"
          role="tabpanel"
          aria-labelledby="orcamento-tab-solicitante"
        >
          {erroEmpresas && (
            <div className="aviso erro" role="alert">
              Não foi possível carregar as empresas e clientes cadastrados.
            </div>
          )}
          <div className="campo">
            <span>Solicitante</span>
            <SearchDialog
              title="Buscar cliente ou empresa"
              searchLabel="Nome, nome fantasia ou identificação"
              placeholder={empresas.length ? "Buscar e selecionar cliente" : "Nenhum cliente cadastrado"}
              disabled={Boolean(erroEmpresas) || empresas.length === 0}
              items={empresas.map((empresa) => ({
                id: empresa.id,
                label: empresa.nome,
                detail: empresa.nome_fantasia ?? undefined,
              }))}
              selectedId={solicitante ? solicitante.id : null}
              onSelect={(empresa) => {
                setSolicitanteId(String(empresa.id));
                setEtapa(1);
              }}
            />
            {!solicitante && empresas.length > 0 && <small>Selecione o cliente para continuar.</small>}
            {solicitante && <input type="hidden" name="solicitante_id" value={solicitante.id} />}
          </div>
        </div>
      ) : etapa === 1 ? (
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
                ["produtos", "Produtos"],
                ["servicos", "Serviços"],
                ["produtos-servicos", "Produtos/Serviços"],
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
      ) : (
        tipoOrcamento && (
          <>
            <div hidden={etapa !== 2}>
              <OrcamentoItens
                tipo={tipoOrcamento}
                produtos={produtos}
                servicos={servicos}
                erroProdutos={erroProdutos}
                erroServicos={erroServicos}
                onContinue={(subtotalProdutos, subtotalServicos, itensSelecionados) => {
                  setTotalProdutos(subtotalProdutos);
                  setTotalServicos(subtotalServicos);
                  setItens(itensSelecionados);
                  setItensConfirmados(true);
                  setEtapa(3);
                }}
              />
            </div>
            <div hidden={etapa !== 3}>
              <OrcamentoCondicoes
                empresaId={Number(solicitanteId)}
                tipoOrcamento={tipoOrcamento}
                itens={itens}
                totalProdutos={totalProdutos}
                totalServicos={totalServicos}
              />
            </div>
          </>
        )
      )}

      <div className="rodape-form orcamento-rodape">
        {etapa > 0 && (
          <button className="btn sec" type="button" onClick={() => setEtapa(etapa - 1)}>
            Voltar
          </button>
        )}
        {etapa === 1 && (
          <button className="btn" type="button" disabled={!tipoOrcamento} onClick={() => setEtapa(2)}>
            Escolher produtos e serviços
          </button>
        )}
        <Link className="btn cinza" href="/orcamentos">Cancelar</Link>
      </div>
    </div>
  );
}
