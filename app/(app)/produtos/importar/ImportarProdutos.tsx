"use client";

import { useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { importarProdutos } from "../actions";

type CampoProduto = "nome" | "categoria" | "unidade_medida" | "valor" | "fabricante";
type Linha = unknown[];
type DadosProduto = {
  nome: string;
  categoria: string;
  unidade_medida: string;
  valor: string;
  fabricante: string;
};

const CAMPOS: Array<{ chave: CampoProduto; titulo: string; obrigatorio: boolean; aliases: string[] }> = [
  { chave: "nome", titulo: "Produto / nome", obrigatorio: true, aliases: ["produto", "nome", "descricao", "descricaodoproduto", "item"] },
  { chave: "categoria", titulo: "Categoria", obrigatorio: true, aliases: ["categoria", "grupo", "tipoproduto", "classificacao"] },
  { chave: "unidade_medida", titulo: "Unidade de medida", obrigatorio: true, aliases: ["unidadedemedida", "unidade", "und", "un", "medida"] },
  { chave: "valor", titulo: "Valor", obrigatorio: true, aliases: ["valor", "preco", "precounitario", "valorunitario", "custounitario"] },
  { chave: "fabricante", titulo: "Fabricante", obrigatorio: false, aliases: ["fabricante", "marca", "fornecedor"] },
];

function normalizarCabecalho(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]/g, "");
}

function nomeColuna(valor: unknown, indice: number) {
  const nome = String(valor ?? "").trim();
  return nome || `Coluna ${indice + 1}`;
}

function paraTexto(valor: Linha[number] | undefined) {
  if (valor === null || valor === undefined) return "";
  if (valor === Date) return "";
  return valor instanceof Date ? valor.toLocaleDateString("pt-BR") : String(valor).trim();
}

export default function ImportarProdutos() {
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<CampoProduto, string>>({
    nome: "",
    categoria: "",
    unidade_medida: "",
    valor: "",
    fabricante: "",
  });
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
        setErro("A primeira aba precisa ter uma linha de títulos e pelo menos um produto.");
        return;
      }
      const titulos = primeira[0].map((valor, indice) => nomeColuna(valor, indice));
      const dados = primeira.slice(1).filter((linha) => linha.some((valor) => paraTexto(valor).length > 0));
      if (dados.length === 0) {
        setErro("Não encontrei linhas de produtos abaixo dos títulos.");
        return;
      }
      if (dados.length > 2000) {
        setErro("A importação aceita até 2.000 produtos por vez.");
        return;
      }

      const automatico = Object.fromEntries(
        CAMPOS.map((campo) => {
          const indice = titulos.findIndex((titulo) => campo.aliases.includes(normalizarCabecalho(titulo)));
          return [campo.chave, indice < 0 ? "" : String(indice)];
        })
      ) as Record<CampoProduto, string>;

      setCabecalhos(titulos);
      setLinhas(dados);
      setMapeamento(automatico);
      setArquivo(file.name);
    } catch {
      setErro("Não foi possível ler a planilha. Confira se o arquivo .xlsx está válido e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function mudarMapeamento(campo: CampoProduto, indice: string) {
    setMapeamento((atual) => ({ ...atual, [campo]: indice }));
  }

  async function enviar() {
    setErro("");
    setMensagem("");
    const obrigatorios = CAMPOS.filter((campo) => campo.obrigatorio && mapeamento[campo.chave] === "");
    if (obrigatorios.length > 0) {
      setErro(`Selecione as colunas para: ${obrigatorios.map((campo) => campo.titulo).join(", ")}.`);
      return;
    }

    const produtos: DadosProduto[] = linhas.map((linha) => {
      const valor = (campo: CampoProduto) => {
        const indice = mapeamento[campo];
        return indice === "" ? "" : paraTexto(linha[Number(indice)]);
      };
      return {
        nome: valor("nome"),
        categoria: valor("categoria"),
        unidade_medida: valor("unidade_medida"),
        valor: valor("valor"),
        fabricante: valor("fabricante"),
      };
    });

    setCarregando(true);
    try {
      const resultado = await importarProdutos(JSON.stringify(produtos));
      if ("erro" in resultado) setErro(resultado.erro);
      else {
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
      <p>Envie um arquivo .xlsx. A primeira linha da primeira aba deve conter os títulos das colunas.</p>
      <p className="produto-ajuda">
        Os campos obrigatórios são produto, categoria, unidade de medida e valor. Você poderá conferir e relacionar
        as colunas antes de importar. O sistema gera os códigos internos automaticamente.
      </p>
      <label className="campo importacao-arquivo">
        <span>Planilha Excel</span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={carregando}
          onChange={(evento) => void lerPlanilha(evento.target.files?.[0])}
        />
      </label>
      {arquivo && <p className="produto-ajuda">Arquivo: <strong>{arquivo}</strong> · {linhas.length} produtos encontrados.</p>}

      {cabecalhos.length > 0 && (
        <>
          <h3>Relacione as colunas da planilha</h3>
          <div className="grid2">
            {CAMPOS.map((campo) => (
              <label className="campo" key={campo.chave}>
                <span>{campo.titulo}{campo.obrigatorio ? " *" : ""}</span>
                <select
                  value={mapeamento[campo.chave]}
                  onChange={(evento) => mudarMapeamento(campo.chave, evento.target.value)}
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
              <thead><tr>{CAMPOS.map((campo) => <th key={campo.chave}>{campo.titulo}</th>)}</tr></thead>
              <tbody>
                {linhas.slice(0, 5).map((linha, indice) => (
                  <tr key={indice}>
                    {CAMPOS.map((campo) => {
                      const coluna = mapeamento[campo.chave];
                      return <td key={campo.chave}>{coluna === "" ? "—" : paraTexto(linha[Number(coluna)]) || "—"}</td>;
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
          {carregando ? "Aguarde..." : `Importar ${linhas.length || ""} produtos`}
        </button>
      </div>
    </section>
  );
}
