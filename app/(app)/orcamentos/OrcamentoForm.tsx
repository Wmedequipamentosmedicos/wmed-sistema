"use client";

import Link from "next/link";
import { useState } from "react";
import SearchDialog from "@/components/SearchDialog";
import OrcamentoCondicoes from "./OrcamentoCondicoes";
import OrcamentoItens from "./OrcamentoItens";
import VoiceOrcamento, { type DadosOrcamentoVoz } from "./VoiceOrcamento";
import { finalizarOrcamento } from "./actions";

type Empresa = { id: number; nome: string; nome_fantasia: string | null };
type TipoOrcamento = "produtos" | "servicos" | "produtos-servicos";
type Produto = { id: number; codigo_interno: number; nome: string; unidade_medida: string; valor: number };
type Servico = { id: number; nome: string; valor: number };
type LinhaSalva = { tipo: "produto" | "servico"; id: number; quantidade: number; valorUnitario?: number };
type ValoresIniciais = {
  formaPagamento: string;
  descontoPercentual: string;
  descontoValor: string;
  prazoEntrega: string;
  frete: string;
  responsavel: string;
  informacoesAdicionais: string;
};

export default function OrcamentoForm({
  empresas,
  produtos,
  servicos,
  erroEmpresas,
  erroProdutos,
  erroServicos,
  erroFinalizacao,
  inicial,
  acao = finalizarOrcamento,
}: {
  empresas: Empresa[];
  produtos: Produto[];
  servicos: Servico[];
  erroEmpresas?: string;
  erroProdutos?: string;
  erroServicos?: string;
  erroFinalizacao?: string;
  inicial?: {
    id: number;
    empresaId: number;
    tipo: TipoOrcamento;
    itens: LinhaSalva[];
    condicoes: ValoresIniciais;
  };
  acao?: (formData: FormData) => void | Promise<void>;
}) {
  const [etapa, setEtapa] = useState(inicial ? 2 : 0);
  const [solicitanteId, setSolicitanteId] = useState(inicial ? String(inicial.empresaId) : "");
  const [tipoOrcamento, setTipoOrcamento] = useState<TipoOrcamento | "">(inicial?.tipo ?? "");
  const [itensConfirmados, setItensConfirmados] = useState(false);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [totalServicos, setTotalServicos] = useState(0);
  const [itens, setItens] = useState<LinhaSalva[]>(inicial?.itens ?? []);
  const [mostrarAssistente, setMostrarAssistente] = useState(false);
  const [mensagemVoz, setMensagemVoz] = useState("");
  const [itensVoz, setItensVoz] = useState<LinhaSalva[]>(inicial?.itens ?? []);
  const [condicoesVoz, setCondicoesVoz] = useState<ValoresIniciais>({
    formaPagamento: inicial?.condicoes.formaPagamento ?? "",
    descontoPercentual: inicial?.condicoes.descontoPercentual ?? "",
    descontoValor: inicial?.condicoes.descontoValor ?? "",
    prazoEntrega: inicial?.condicoes.prazoEntrega ?? "",
    frete: inicial?.condicoes.frete ?? "",
    responsavel: inicial?.condicoes.responsavel ?? "",
    informacoesAdicionais: inicial?.condicoes.informacoesAdicionais ?? "",
  });
  const solicitante = empresas.find((empresa) => String(empresa.id) === solicitanteId);

  return (
    <div className="form-card orcamento-card">
      <div className="orcamento-header">
        <div className="orcamento-brand">
          <span className="marca-ponto">W</span>
          <span>{inicial ? `Editar orçamento ${String(inicial.id).padStart(6, "0")}` : "Novo orçamento"}</span>
        </div>
        <button className="btn voz-btn" type="button" onClick={() => setMostrarAssistente((aberto) => !aberto)}>
          🎙️ Criar por voz
        </button>
      </div>
      {inicial && (
        <p className="orcamento-preco-ajuda">
          Os preços dos itens já salvos serão mantidos. Itens adicionados agora usarão o preço atual do catálogo.
        </p>
      )}

      {erroFinalizacao && <div className="aviso erro" role="alert">{erroFinalizacao}</div>}
      {mensagemVoz && <div className="aviso" role="status">{mensagemVoz}</div>}
      {mostrarAssistente && (
        <VoiceOrcamento
          empresas={empresas}
          produtos={produtos}
          servicos={servicos}
          onCancel={() => setMostrarAssistente(false)}
          onComplete={(dados: DadosOrcamentoVoz) => {
            setMensagemVoz("Dados de voz aplicados. Confira cliente e itens; os campos opcionais não informados ficarão vazios. Revise tudo antes de finalizar.");
            setSolicitanteId(dados.empresaId === null ? "" : String(dados.empresaId));
            setTipoOrcamento(dados.tipoOrcamento);
            setItensVoz(dados.itens.map((item) => {
              const existente = inicial?.itens.find((linha) => linha.tipo === item.tipo && linha.id === item.id);
              return existente ? { ...item, valorUnitario: existente.valorUnitario } : item;
            }));
            setCondicoesVoz({
              formaPagamento: dados.formaPagamento,
              descontoPercentual: dados.descontoPercentual,
              descontoValor: dados.descontoValor,
              prazoEntrega: dados.prazoEntrega,
              frete: dados.frete,
              responsavel: dados.responsavel,
              informacoesAdicionais: dados.informacoesAdicionais,
            });
            setItensConfirmados(false);
            setEtapa(dados.empresaId === null ? 0 : dados.tipoOrcamento ? 2 : 1);
            setMostrarAssistente(false);
          }}
        />
      )}

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
                setEtapa(tipoOrcamento ? 2 : 1);
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
                itensIniciais={itensVoz}
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
                action={acao}
                botaoTexto={inicial ? "Salvar alterações e visualizar orçamento" : "Finalizar e visualizar orçamento"}
                empresaId={Number(solicitanteId)}
                tipoOrcamento={tipoOrcamento}
                itens={itens}
                totalProdutos={totalProdutos}
                totalServicos={totalServicos}
                valoresIniciais={condicoesVoz}
                orcamentoId={inicial?.id}
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
