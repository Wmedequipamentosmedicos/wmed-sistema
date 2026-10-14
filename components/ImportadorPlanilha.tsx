"use client";

import { useState } from "react";
import readXlsxFile from "read-excel-file/browser";

export type CampoImportacao = {
  chave: string;
  titulo: string;
  obrigatorio?: boolean;
  aliases: string[];
};

type Linha = unknown[];
type AcaoImportacao = (conteudo: string) => Promise<{ erro: string } | { mensagem: string }>;

function normalizarCabecalho(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]/g, "");
}

function paraTexto(valor: unknown) {
  if (valor === null || valor === undefined || valor === Date) return "";
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).trim();
}

export default function ImportadorPlanilha({
  campos,
  acao,
  orientacao,
}: {
  campos: CampoImportacao[];
  acao: AcaoImportacao;
  orientacao: string;
}) {
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [arquivo, setArquivo] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function lerPlanilha(file?: File) {
    setErro("");
    setMensagem("");
    setCabecalhos([]);
    setLinhas([]);
    setArquivo("");
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(".xlsx")) {
      setErro("Selecione uma planilha .xlsx. Arquivos .xls antigos precisam ser salvos como .xlsx no Excel.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErro("A planilha deve ter no máximo 10 MB.");
      return;
    }

    setCarregando(true);
    try {
      const planilhas = await readXlsxFile(file);
      const primeira = planilhas[0]?.data ?? [];
      if (primeira.length < 2) {
        setErro("A primeira aba precisa ter uma linha de títulos e pelo menos um registro.");
        return;
      }
      const titulos = primeira[0].map((valor, indice) => {
        const titulo = String(valor ?? "").trim();
        return titulo || `Coluna ${indice + 1}`;
      });
      const dados = primeira.slice(1).filter((linha) => linha.some((valor) => paraTexto(valor).length > 0));
      if (dados.length === 0) {
        setErro("Não encontrei linhas de dados abaixo dos títulos.");
        return;
      }
      if (dados.length > 2000) {
        setErro("A importação aceita até 2.000 registros por vez.");
        return;
      }

      const inicial = Object.fromEntries(
        campos.map((campo) => {
          const indice = titulos.findIndex((titulo) => campo.aliases.includes(normalizarCabecalho(titulo)));
          return [campo.chave, indice < 0 ? "" : String(indice)];
        })
      );
      setCabecalhos(titulos);
      setLinhas(dados);
      setMapeamento(inicial);
      setArquivo(file.name);
    } catch {
      setErro("Não foi possível ler a planilha. Confira se o arquivo .xlsx está válido e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function enviar() {
    setErro("");
    setMensagem("");
    const faltantes = campos.filter((campo) => campo.obrigatorio && mapeamento[campo.chave] === "");
    if (faltantes.length > 0) {
      setErro(`Selecione as colunas para: ${faltantes.map((campo) => campo.titulo).join(", ")}.`);
      return;
    }

    const registros = linhas.map((linha) => Object.fromEntries(
      campos.map((campo) => {
        const coluna = mapeamento[campo.chave];
        return [campo.chave, coluna === undefined || coluna === "" ? "" : paraTexto(linha[Number(coluna)])];
      })
    ));
    const conteudo = JSON.stringify(registros);
    if (new TextEncoder().encode(conteudo).byteLength > 4 * 1024 * 1024) {
      setErro("A planilha gerou dados demais para uma única importação. Divida os registros em arquivos menores e tente novamente.");
      return;
    }

    setCarregando(true);
    try {
      const resultado = await acao(conteudo);
      if ("erro" in resultado) {
        setErro(resultado.erro);
      } else {
        setMensagem(resultado.mensagem);
        setLinhas([]);
        setCabecalhos([]);
        setArquivo("");
      }
    } catch {
      setErro("Não foi possível concluir a importação. Atualize a página e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="form-card">
      <h2>Importação em lote</h2>
      <p>{orientacao}</p>
      <p className="produto-ajuda">
        A primeira linha da primeira aba deve conter os títulos. Relacione as colunas e confira a amostra antes de importar.
        O arquivo deve ter até 10 MB e 2.000 registros.
      </p>
      <label className="campo importacao-arquivo">
        <span>Planilha Excel (.xlsx)</span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={carregando}
          onChange={(evento) => void lerPlanilha(evento.target.files?.[0])}
        />
      </label>
      {arquivo && <p className="produto-ajuda">Arquivo: <strong>{arquivo}</strong> · {linhas.length} registros encontrados.</p>}

      {cabecalhos.length > 0 && (
        <>
          <h3>Relacione as colunas da planilha</h3>
          <div className="grid2">
            {campos.map((campo) => (
              <label className="campo" key={campo.chave}>
                <span>{campo.titulo}{campo.obrigatorio ? " *" : ""}</span>
                <select
                  value={mapeamento[campo.chave] ?? ""}
                  onChange={(evento) => setMapeamento((atual) => ({ ...atual, [campo.chave]: evento.target.value }))}
                >
                  <option value="">— Não usar —</option>
                  {cabecalhos.map((cabecalho, indice) => (
                    <option key={`${indice}-${cabecalho}`} value={String(indice)}>{cabecalho}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <h3>Amostra para conferência</h3>
          <div className="wrap">
            <table>
              <thead><tr>{campos.map((campo) => <th key={campo.chave}>{campo.titulo}</th>)}</tr></thead>
              <tbody>
                {linhas.slice(0, 5).map((linha, indice) => (
                  <tr key={indice}>
                    {campos.map((campo) => {
                      const coluna = mapeamento[campo.chave];
                      return <td key={campo.chave}>{coluna === undefined || coluna === "" ? "—" : paraTexto(linha[Number(coluna)]) || "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {erro && <div className="aviso erro" role="alert">{erro}</div>}
      {mensagem && <div className="aviso ok" role="status">{mensagem}</div>}
      <div className="rodape-form">
        <button className="btn" type="button" disabled={carregando || linhas.length === 0} onClick={() => void enviar()}>
          {carregando ? "Aguarde..." : `Importar ${linhas.length || ""} registros`}
        </button>
      </div>
    </section>
  );
}
