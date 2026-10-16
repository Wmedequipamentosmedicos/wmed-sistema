"use client";

import { useEffect, useRef, useState } from "react";

type Empresa = { id: number; nome: string; nome_fantasia: string | null };
type Produto = { id: number; nome: string };
type Servico = { id: number; nome: string };
type TipoOrcamento = "produtos" | "servicos" | "produtos-servicos";
type ItemVoz = { tipo: "produto" | "servico"; id: number; quantidade: number };

export type DadosOrcamentoVoz = {
  empresaId: number | null;
  tipoOrcamento: TipoOrcamento | "";
  itens: ItemVoz[];
  formaPagamento: string;
  condicaoPagamento: string;
  descontoPercentual: string;
  descontoValor: string;
  prazoEntrega: string;
  frete: string;
  responsavel: string;
  informacoesAdicionais: string;
};

type ResultadoReconhecimento = ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>>;

type Reconhecimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ResultadoReconhecimento }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type ConstrutorReconhecimento = new () => Reconhecimento;

const PERGUNTAS = [
  "Diga o nome do cliente e os itens, ou o orçamento completo. Exemplo: Clínica Central, 2 luvas, boleto em 30 dias, desconto de 5%, frete de 20 reais, responsável Ana.",
  "Quais produtos e/ou serviços deseja incluir? Diga o nome de cada item e a quantidade.",
  "Qual é a forma e a condição de pagamento? Exemplo: PIX à vista ou boleto em 30 dias. É opcional.",
  "Há desconto percentual? Diga, por exemplo, 10 por cento. É opcional.",
  "Há desconto em reais? Diga, por exemplo, 50 reais. É opcional.",
  "Qual é o prazo de entrega? É opcional.",
  "Qual é o valor do frete em reais? É opcional.",
  "Quem é o responsável pelo orçamento? É opcional.",
  "Há informações adicionais? É opcional.",
];

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function distanciaEdicao(a: string, b: string) {
  let linhaAnterior = Array.from({ length: b.length + 1 }, (_, indice) => indice);
  for (let indiceA = 1; indiceA <= a.length; indiceA++) {
    const linhaAtual = [indiceA];
    for (let indiceB = 1; indiceB <= b.length; indiceB++) {
      linhaAtual[indiceB] = Math.min(
        linhaAnterior[indiceB] + 1,
        linhaAtual[indiceB - 1] + 1,
        linhaAnterior[indiceB - 1] + (a[indiceA - 1] === b[indiceB - 1] ? 0 : 1)
      );
    }
    linhaAnterior = linhaAtual;
  }
  return linhaAnterior[b.length];
}

function palavras(texto: string) {
  const ignorar = new Set(["a", "as", "o", "os", "de", "da", "das", "do", "dos", "e", "em", "para", "por", "unidade", "unidades"]);
  return normalizar(texto).split(" ").filter((palavra) => palavra.length > 1 && !ignorar.has(palavra));
}

type CorrespondenciaNome = {
  inicio: number;
  fim: number;
  exata: boolean;
  termosEncontrados: number;
  proporcao: number;
};

function localizarNome(texto: string, nome: string, minimoTermos = 1): CorrespondenciaNome | null {
  const nomeNormalizado = normalizar(nome);
  const inicioExato = ` ${texto} `.indexOf(` ${nomeNormalizado} `);
  if (inicioExato >= 0) {
    return {
      inicio: inicioExato,
      fim: inicioExato + nomeNormalizado.length,
      exata: true,
      termosEncontrados: palavras(nome).length,
      proporcao: 1,
    };
  }

  const termos = palavras(nome);
  const tokens = [...texto.matchAll(/\S+/g)].map((resultado) => ({
    palavra: resultado[0],
    inicio: resultado.index ?? 0,
    fim: (resultado.index ?? 0) + resultado[0].length,
  }));
  const termosTexto = tokens.flatMap((token, indice) => [
    token,
    ...[2, 3].flatMap((tamanho) => {
      const grupo = tokens.slice(indice, indice + tamanho);
      if (grupo.length !== tamanho || !grupo.some((parte) => parte.palavra.length <= 2) || grupo.some((parte, posicao) =>
        posicao > 0 && tokens[indice + posicao - 1].fim !== parte.inicio - 1
      )) return [];
      return [{
        palavra: grupo.map((parte) => parte.palavra).join(""),
        inicio: grupo[0].inicio,
        fim: grupo[grupo.length - 1].fim,
      }];
    }),
  ]);
  const usados: Array<{ inicio: number; fim: number }> = [];
  const correspondencias = termos.flatMap((termo) => {
    const candidatos = termosTexto
      .filter((candidato) => !usados.some((usado) =>
        candidato.inicio < usado.fim && candidato.fim > usado.inicio
      ))
      .map((candidato) => {
        const palavra = candidato.palavra;
        const exato = palavra === termo;
        const flexionado = palavra.replace(/s$/, "") === termo.replace(/s$/, "");
        const prefixoFonetico = Math.min(palavra.length, termo.length) >= 3 &&
          Math.min(palavra.length, termo.length) / Math.max(palavra.length, termo.length) >= 0.6 &&
          (palavra.startsWith(termo) || termo.startsWith(palavra));
        const diferenca = distanciaEdicao(palavra, termo);
        const quaseExato = Math.min(palavra.length, termo.length) >= 4 &&
          Math.min(palavra.length, termo.length) / Math.max(palavra.length, termo.length) >= 0.75 &&
          diferenca <= Math.max(1, Math.floor(Math.max(palavra.length, termo.length) * 0.2));
        return {
          ...candidato,
          score: exato ? 4 : flexionado ? 3 : prefixoFonetico ? 2 : quaseExato ? 1 : 0,
        };
      })
      .filter((candidato) => candidato.score > 0)
      .sort((a, b) => b.score - a.score || a.palavra.length - b.palavra.length);
    const melhor = candidatos[0];
    if (!melhor) return [];
    usados.push(melhor);
    return [melhor];
  });
  const proporcao = termos.length ? correspondencias.length / termos.length : 0;
  if (
    !termos.length ||
    correspondencias.length < Math.min(minimoTermos, termos.length) ||
    proporcao < (minimoTermos > 1 ? 0.5 : 0.25)
  ) return null;

  const inicio = Math.min(...correspondencias.map((termo) => termo.inicio));
  const fim = Math.max(...correspondencias.map((termo) => termo.fim));
  return { inicio, fim, exata: false, termosEncontrados: correspondencias.length, proporcao };
}

function pontuarEmpresa(texto: string, empresa: Empresa) {
  const correspondencias = [empresa.nome, empresa.nome_fantasia]
    .filter((nome): nome is string => Boolean(nome))
    .flatMap((nome) => {
      const correspondencia = localizarNome(texto, nome);
      return correspondencia ? [correspondencia] : [];
    });
  return correspondencias.sort((a, b) =>
    Number(b.exata) - Number(a.exata) ||
    b.proporcao - a.proporcao ||
    b.termosEncontrados - a.termosEncontrados
  )[0] ?? null;
}

export function resolverEmpresa(texto: string, empresas: Empresa[]) {
  const candidatas = empresas.flatMap((empresa) => {
    const correspondencia = pontuarEmpresa(normalizar(texto), empresa);
    return correspondencia ? [{ id: empresa.id, correspondencia }] : [];
  }).sort((a, b) =>
    Number(b.correspondencia.exata) - Number(a.correspondencia.exata) ||
    b.correspondencia.proporcao - a.correspondencia.proporcao ||
    b.correspondencia.termosEncontrados - a.correspondencia.termosEncontrados
  );
  const primeira = candidatas[0];
  const segunda = candidatas.find((candidata) => candidata.id !== primeira?.id);
  if (!primeira) return { id: null, ambiguo: false };
  if (segunda &&
    primeira.correspondencia.exata === segunda.correspondencia.exata &&
    primeira.correspondencia.proporcao === segunda.correspondencia.proporcao &&
    primeira.correspondencia.termosEncontrados === segunda.correspondencia.termosEncontrados
  ) return { id: null, ambiguo: true };
  return { id: primeira.id, ambiguo: false };
}

const QUANTIDADES_POR_EXTENSO: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
  cem: 100,
};

function mapearPagamento(texto: string) {
  const resposta = normalizar(texto);
  if (resposta.includes("pix")) return "pix";
  if (resposta.includes("boleto")) return "boleto";
  if (resposta.includes("transferencia")) return "transferencia";
  if (resposta.includes("cartao")) return "cartao";
  if (resposta.includes("faturado")) return "faturado";
  if (resposta.includes("avista") || resposta.includes("a vista")) return "avista";
  if (resposta.includes("outro")) return "outro";
  return "";
}

function extrairCondicaoPagamento(texto: string) {
  return texto.match(/\b(?:pix|boleto|transfer[eê]ncia|cart[aã]o|faturado|[àa]\s+vista|outro)\b(?:\s+(?:em\s+\d+\s+(?:dias?|vezes|parcelas?|meses?)|[àa]\s+vista|parcelado em\s+\d+\s+vezes))?/i)?.[0] ?? "";
}

function valorNumericoFalado(texto: string) {
  const numero = texto.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[,.]\d+)?/)?.[0];
  if (numero) {
    const normalizado = numero.includes(",")
      ? numero.replace(/\./g, "").replace(",", ".")
      : numero;
    const valor = Number(normalizado);
    return Number.isFinite(valor) ? String(valor) : "";
  }

  const unidades: Record<string, number> = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
    treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16,
    dezessete: 17, dezoito: 18, dezenove: 19,
  };
  const dezenas: Record<string, number> = {
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
    setenta: 70, oitenta: 80, noventa: 90,
  };
  const centenas: Record<string, number> = {
    cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
    quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800,
    novecentos: 900,
  };
  const palavrasNumero = normalizar(texto)
    .split(" ")
    .filter((palavra) => !["e", "por", "cento", "reais", "real", "percento"].includes(palavra));
  if (palavrasNumero.length === 1 && unidades[palavrasNumero[0]] !== undefined) {
    return String(unidades[palavrasNumero[0]]);
  }
  if (palavrasNumero.length === 1 && dezenas[palavrasNumero[0]] !== undefined) {
    return String(dezenas[palavrasNumero[0]]);
  }
  if (palavrasNumero.length === 2 && dezenas[palavrasNumero[0]] !== undefined && unidades[palavrasNumero[1]] !== undefined) {
    return String(dezenas[palavrasNumero[0]] + unidades[palavrasNumero[1]]);
  }
  if (palavrasNumero.length === 1 && centenas[palavrasNumero[0]] !== undefined) {
    return String(centenas[palavrasNumero[0]]);
  }
  if (palavrasNumero.length === 2 && centenas[palavrasNumero[0]] !== undefined && unidades[palavrasNumero[1]] !== undefined) {
    return String(centenas[palavrasNumero[0]] + unidades[palavrasNumero[1]]);
  }
  if (palavrasNumero.length === 2 && centenas[palavrasNumero[0]] !== undefined && dezenas[palavrasNumero[1]] !== undefined) {
    return String(centenas[palavrasNumero[0]] + dezenas[palavrasNumero[1]]);
  }
  if (palavrasNumero.length === 1 && palavrasNumero[0] === "cem") return "100";
  return "";
}

function semValorInformado(texto: string) {
  return /^(?:sem(?:\s+\w+){0,2}|nenhum(?:a)?|nao(?:\s+tem)?|nada|zero)$/i.test(normalizar(texto));
}

function extrairPercentual(texto: string) {
  const percentualOriginal = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por cento|porcento)/i);
  if (percentualOriginal) return String(Number(percentualOriginal[1].replace(",", ".")));
  const resposta = normalizar(texto);
  const comContexto = resposta.match(/(?:desconto|descontar)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:%|por cento|porcento)/i)
    ?? resposta.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por cento|porcento)\s*(?:de\s+)?desconto/i);
  if (comContexto) return String(Number(comContexto[1].replace(",", ".")));
  if (/\b(?:%|por cento|porcento)\b/.test(resposta)) return valorNumericoFalado(resposta);
  return "";
}

function extrairDescontoEmReais(texto: string) {
  const resposta = normalizar(texto);
  const comContexto = texto.match(/(?:desconto|descontar)\s+(?:em\s+)?(?:reais?\s+)?(?:de\s+)?r\s*\$\s*(\d[\d.,]*)/i)
    ?? resposta.match(/desconto\s+em\s+reais\s+(?:de\s+)?(\d[\d.,]*)/i)
    ?? resposta.match(/(?:desconto|descontar)\s+(?:de\s+)?r\s*\$\s*(\d[\d.,]*)/i)
    ?? resposta.match(/(?:desconto|descontar)\s+(?:de\s+)?(\d[\d.,]*)\s*(?:reais?|r\s*\$)(?!\w)/i)
    ?? resposta.match(/(\d[\d.,]*)\s*(?:reais?|r\s*\$)(?!\w)/i);
  return comContexto ? valorNumericoFalado(comContexto[1]) : valorNumericoFalado(texto);
}

function extrairFrete(texto: string) {
  const resposta = normalizar(texto);
  const comContexto = resposta.match(/frete\s+(?:de|no valor de)?\s*(?:r\s*\$?\s*)?(\d[\d.,]*)\s*(?:reais?|r\s*\$)?/i);
  return comContexto ? valorNumericoFalado(comContexto[1]) : valorNumericoFalado(texto);
}

function extrairResponsavel(texto: string) {
  return texto.match(/(?:respons[aá]vel(?: pelo or[cç]amento)?|vendedor(?:a)?)\s*:?\s*(.+?)(?=[,.]?\s*(?:desconto|frete|prazo|pagamento|informa\w*|observa\w*)\b|[.;]|$)/i)?.[1]?.trim() ?? "";
}

function quantidadeProxima(texto: string, inicio: number, fim: number) {
  const textoComNumeros = normalizar(texto);
  const numeros = [...textoComNumeros.matchAll(/\d+(?:[,.]\d+)?|\b(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|quarenta|cinquenta|cem)\b/g)];
  const proximo = numeros
    .map((numero) => ({ texto: numero[0], inicio: numero.index ?? 0 }))
    .filter((numero) => numero.inicio >= fim || numero.inicio + numero.texto.length <= inicio)
    .map((numero) => ({
      ...numero,
      distancia: numero.inicio >= fim ? numero.inicio - fim : inicio - numero.inicio - numero.texto.length,
    }))
    .sort((a, b) => a.distancia - b.distancia)[0];
  if (!proximo || proximo.distancia > 40) return 1;
  const quantidade = QUANTIDADES_POR_EXTENSO[proximo.texto] ?? Number(proximo.texto.replace(",", "."));
  return Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1;
}

function interpretarItens(
  textoOriginal: string,
  produtos: Produto[],
  servicos: Servico[]
): ItemVoz[] {
  const texto = normalizar(textoOriginal);
  const encontrados = [
    ...produtos.map((item) => ({ tipo: "produto" as const, id: item.id, nome: item.nome })),
    ...servicos.map((item) => ({ tipo: "servico" as const, id: item.id, nome: item.nome })),
  ].flatMap((item) => {
    const correspondencia = localizarNome(texto, item.nome, 2);
    return correspondencia ? [{ ...item, correspondencia }] : [];
  });

  const grupos: typeof encontrados[] = [];
  for (const item of encontrados) {
    const grupo = grupos.find((atual) => atual.some((outro) =>
      item.correspondencia.inicio < outro.correspondencia.fim &&
      item.correspondencia.fim > outro.correspondencia.inicio
    ));
    if (grupo) grupo.push(item);
    else grupos.push([item]);
  }

  return grupos.flatMap((grupo) => {
    grupo.sort((a, b) =>
      Number(b.correspondencia.exata) - Number(a.correspondencia.exata) ||
      b.correspondencia.termosEncontrados - a.correspondencia.termosEncontrados ||
      b.correspondencia.proporcao - a.correspondencia.proporcao
    );
    const melhor = grupo[0];
    const segundo = grupo[1];
    if (segundo &&
      melhor.correspondencia.exata === segundo.correspondencia.exata &&
      melhor.correspondencia.termosEncontrados === segundo.correspondencia.termosEncontrados &&
      melhor.correspondencia.proporcao === segundo.correspondencia.proporcao
    ) return [];

    return [{
      tipo: melhor.tipo,
      id: melhor.id,
      quantidade: quantidadeProxima(texto, melhor.correspondencia.inicio, melhor.correspondencia.fim),
    }];
  });
}

export function interpretarPedidoCompleto(
  texto: string,
  empresas: Empresa[],
  produtos: Produto[],
  servicos: Servico[]
): DadosOrcamentoVoz | null {
  const empresaId = resolverEmpresa(texto, empresas).id;
  const itens = interpretarItens(texto, produtos, servicos);
  const formaPagamento = mapearPagamento(texto);
  const textoNormalizado = normalizar(texto);
  const prazoEntrega = textoNormalizado.match(/\b(?:prazo(?: de entrega)?|entrega)\s+(?:de|em|para)?\s*(\d+\s*(?:dias?(?: uteis| corridos)?|semanas?|meses?)|imediat[oa])\b/i)?.[1] ?? "";
  const descontoPercentual = extrairPercentual(texto);
  const descontoValor = /\b(?:desconto|descontar)\b/i.test(texto) && (/\breais?\b/i.test(texto) || /r\s*\$/i.test(texto))
    ? extrairDescontoEmReais(texto)
    : "";
  const frete = /\bfrete\b/i.test(texto) ? extrairFrete(texto) : "";
  const responsavel = extrairResponsavel(texto);
  const observacoes = texto.match(/\b(?:observa(?:ção|ções|cao|coes)|informa(?:ção|ções|cao|coes) adiciona(?:l|is))\s*:?\s*(.+)$/i)?.[1]?.trim() ?? "";

  const pagamento = extrairCondicaoPagamento(texto) || formaPagamento;
  if (!empresaId && !itens.length && !formaPagamento && !prazoEntrega && !observacoes &&
    !descontoPercentual && !descontoValor && !frete && !responsavel) return null;
  const produtosSelecionados = itens.some((item) => item.tipo === "produto");
  const servicosSelecionados = itens.some((item) => item.tipo === "servico");
  const informacoesAdicionais = observacoes ? `Observações: ${observacoes}` : "";
  if (informacoesAdicionais.length > 2000) return null;

  return {
    empresaId,
    tipoOrcamento: produtosSelecionados && servicosSelecionados
      ? "produtos-servicos" as const
      : produtosSelecionados ? "produtos" as const : servicosSelecionados ? "servicos" as const : "",
    itens,
    formaPagamento,
    condicaoPagamento: formaPagamento ? pagamento : "",
    descontoPercentual,
    descontoValor,
    prazoEntrega,
    frete,
    responsavel,
    informacoesAdicionais,
  };
}

function erroReconhecimento(codigo: string) {
  if (codigo === "not-allowed" || codigo === "service-not-allowed") {
    return "O navegador não permitiu acesso ao microfone. Libere a permissão ou digite sua resposta.";
  }
  if (codigo === "no-speech") return "Nenhuma fala foi detectada. Tente novamente ou digite sua resposta.";
  if (codigo === "audio-capture") return "Não foi possível acessar o microfone. Verifique o dispositivo ou digite sua resposta.";
  return "Não foi possível reconhecer a fala. Tente novamente ou digite sua resposta.";
}

export default function VoiceOrcamento({
  empresas,
  produtos,
  servicos,
  onComplete,
  onCancel,
}: {
  empresas: Empresa[];
  produtos: Produto[];
  servicos: Servico[];
  onComplete: (dados: DadosOrcamentoVoz) => void;
  onCancel: () => void;
}) {
  const [etapa, setEtapa] = useState(0);
  const [resposta, setResposta] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [itens, setItens] = useState<ItemVoz[]>([]);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [condicaoPagamento, setCondicaoPagamento] = useState("");
  const [descontoPercentual, setDescontoPercentual] = useState("");
  const [descontoValor, setDescontoValor] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [frete, setFrete] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [informacoesAdicionais, setInformacoesAdicionais] = useState("");
  const [aguardandoCliente, setAguardandoCliente] = useState(false);
  const reconhecimentoRef = useRef<Reconhecimento | null>(null);

  useEffect(() => () => reconhecimentoRef.current?.stop(), []);

  function gravar() {
    const janela = window as Window & {
      SpeechRecognition?: ConstrutorReconhecimento;
      webkitSpeechRecognition?: ConstrutorReconhecimento;
    };
    const SpeechRecognition = janela.SpeechRecognition ?? janela.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMensagem("O reconhecimento de voz não está disponível neste navegador. Você ainda pode digitar a resposta.");
      return;
    }

    setMensagem("");
    setResposta("");
    const reconhecimento = new SpeechRecognition();
    reconhecimento.lang = "pt-BR";
    reconhecimento.continuous = true;
    reconhecimento.interimResults = true;
    reconhecimento.maxAlternatives = 1;
    reconhecimento.onresult = (evento) => {
      setResposta(Array.from(evento.results, (resultado) => resultado[0]?.transcript ?? "").join(" ").trim());
    };
    reconhecimento.onerror = (evento) => setMensagem(erroReconhecimento(evento.error));
    reconhecimento.onend = () => {
      setOuvindo(false);
      reconhecimentoRef.current = null;
    };
    reconhecimentoRef.current = reconhecimento;
    setOuvindo(true);
    try {
      reconhecimento.start();
    } catch {
      reconhecimentoRef.current = null;
      setOuvindo(false);
      setMensagem("Não foi possível iniciar o microfone. Tente novamente ou digite sua resposta.");
    }
  }

  function aplicarDadosReconhecidos() {
    const dadosDaResposta = resposta.trim()
      ? interpretarPedidoCompleto(resposta.trim(), empresas, produtos, servicos)
      : null;
    const itensAplicados = dadosDaResposta?.itens.length ? dadosDaResposta.itens : itens;
    const clienteAplicado = dadosDaResposta?.empresaId ?? clienteId;
    const produtosSelecionados = itensAplicados.some((item) => item.tipo === "produto");
    const servicosSelecionados = itensAplicados.some((item) => item.tipo === "servico");
    const informacoesDaVoz = dadosDaResposta?.informacoesAdicionais ?? informacoesAdicionais;
    const pagamentoAplicado = dadosDaResposta?.condicaoPagamento || condicaoPagamento;
    const informacoesAplicadas = [
      pagamentoAplicado ? `Condições de pagamento: ${pagamentoAplicado}` : "",
      informacoesDaVoz,
    ].filter(Boolean).join("\n");

    if (!clienteAplicado && !itensAplicados.length) {
      setMensagem("Diga o nome do cliente e os produtos ou serviços, ou preencha uma resposta antes de aplicar.");
      return;
    }

    onComplete({
      empresaId: clienteAplicado,
      tipoOrcamento: produtosSelecionados && servicosSelecionados
        ? "produtos-servicos"
        : produtosSelecionados ? "produtos" : servicosSelecionados ? "servicos" : "",
      itens: itensAplicados,
      formaPagamento: dadosDaResposta?.formaPagamento || formaPagamento,
      condicaoPagamento: pagamentoAplicado,
      descontoPercentual: dadosDaResposta?.descontoPercentual || descontoPercentual,
      descontoValor: dadosDaResposta?.descontoValor || descontoValor,
      prazoEntrega: dadosDaResposta?.prazoEntrega || prazoEntrega,
      frete: dadosDaResposta?.frete || frete,
      responsavel: dadosDaResposta?.responsavel || responsavel,
      informacoesAdicionais: informacoesAplicadas,
    });
  }

  function confirmarResposta() {
    const texto = resposta.trim();
    if (!texto && etapa < 2) {
      setMensagem("Diga ou digite uma resposta para continuar.");
      return;
    }

    if (etapa === 0) {
      const dadosReconhecidos = interpretarPedidoCompleto(texto, empresas, produtos, servicos);
      const resultadoEmpresa = resolverEmpresa(texto, empresas);
      const empresaReconhecida = dadosReconhecidos?.empresaId ??
        resultadoEmpresa.id;
      const itensReconhecidos = dadosReconhecidos?.itens.length ? dadosReconhecidos.itens : itens;

      if (dadosReconhecidos?.itens.length) setItens(dadosReconhecidos.itens);
      if (dadosReconhecidos?.formaPagamento) {
        setFormaPagamento(dadosReconhecidos.formaPagamento);
        setCondicaoPagamento(dadosReconhecidos.condicaoPagamento);
      }
      if (dadosReconhecidos?.descontoPercentual) setDescontoPercentual(dadosReconhecidos.descontoPercentual);
      if (dadosReconhecidos?.descontoValor) setDescontoValor(dadosReconhecidos.descontoValor);
      if (dadosReconhecidos?.prazoEntrega) setPrazoEntrega(dadosReconhecidos.prazoEntrega);
      if (dadosReconhecidos?.frete) setFrete(dadosReconhecidos.frete);
      if (dadosReconhecidos?.responsavel) setResponsavel(dadosReconhecidos.responsavel);
      if (dadosReconhecidos?.informacoesAdicionais) setInformacoesAdicionais(dadosReconhecidos.informacoesAdicionais);

      if (empresaReconhecida === null && !aguardandoCliente) {
        setAguardandoCliente(true);
        setResposta("");
        setMensagem(itensReconhecidos.length
          ? "Reconheci os itens. Agora diga o nome do cliente cadastrado para continuar por voz."
          : "Ainda não identifiquei o cliente. Diga o nome como aparece no cadastro; depois vou pedir os produtos ou serviços.");
        return;
      }

      if (empresaReconhecida === null && aguardandoCliente) {
        setMensagem(resultadoEmpresa.ambiguo
          ? "Esse nome corresponde a mais de um cadastro. Diga o nome fantasia completo ou algum detalhe que diferencie o cliente."
          : "Ainda não encontrei esse cliente no cadastro. Tente outro nome ou aplique e selecione-o manualmente.");
        return;
      }
      const clienteFinal = empresaReconhecida ?? clienteId;
      if (clienteFinal === null) {
        setMensagem("Não encontrei esse cliente no cadastro. Diga o nome cadastrado ou escolha-o manualmente.");
        return;
      }
      setClienteId(clienteFinal);
      setAguardandoCliente(false);

      if (!itensReconhecidos.length) {
        setMensagem("Cliente identificado. Agora diga o nome do produto ou serviço cadastrado e a quantidade.");
        setResposta("");
        setEtapa(1);
        return;
      }
      setItens(itensReconhecidos);
      setMensagem("Cliente e itens reconhecidos. Responda as condições que quiser ou pule para revisar o orçamento.");
      setResposta("");
      setEtapa(2);
      return;
    } else if (etapa === 1) {
      const encontrados = interpretarItens(texto, produtos, servicos);
      if (!encontrados.length) {
        setMensagem("Não encontrei produtos ou serviços do catálogo nessa resposta. Diga o nome cadastrado, ou aplique o que já foi reconhecido e complete manualmente.");
        return;
      }
      setItens(encontrados);
      if (clienteId === null) {
        setAguardandoCliente(true);
        setEtapa(0);
        setResposta("");
        setMensagem("Itens reconhecidos. Agora diga o nome do cliente cadastrado para continuar por voz.");
        return;
      }
    } else if (etapa === 2) {
      const pagamento = mapearPagamento(texto);
      if (texto && !pagamento && !semValorInformado(texto)) {
        setMensagem("Não identifiquei a forma de pagamento. Diga à vista, PIX, boleto, transferência, cartão, faturado ou outro.");
        return;
      }
      if (pagamento) {
        setFormaPagamento(pagamento);
        setCondicaoPagamento(texto);
      } else if (semValorInformado(texto)) {
        setFormaPagamento("");
        setCondicaoPagamento("");
      }
    } else if (etapa === 3) {
      const percentual = semValorInformado(texto) ? "" : valorNumericoFalado(texto);
      if (texto && !semValorInformado(texto) && (!percentual || Number(percentual) > 100)) {
        setMensagem("Diga um percentual entre 0 e 100, por exemplo, 10 por cento; ou deixe em branco para pular.");
        return;
      }
      if (texto) setDescontoPercentual(percentual);
    } else if (etapa === 4) {
      const valor = semValorInformado(texto) ? "" : valorNumericoFalado(texto);
      if (texto && !semValorInformado(texto) && !valor) {
        setMensagem("Não entendi o valor do desconto. Diga, por exemplo, 50 reais; ou deixe em branco para pular.");
        return;
      }
      if (texto) setDescontoValor(valor);
    } else if (etapa === 5) {
      if (texto) setPrazoEntrega(semValorInformado(texto) ? "" : texto);
    } else if (etapa === 6) {
      const valor = semValorInformado(texto) ? "" : valorNumericoFalado(texto);
      if (texto && !semValorInformado(texto) && !valor) {
        setMensagem("Não entendi o valor do frete. Diga, por exemplo, 25 reais; ou deixe em branco para pular.");
        return;
      }
      if (texto) setFrete(valor);
    } else if (etapa === 7) {
      if (texto) setResponsavel(semValorInformado(texto) ? "" : texto);
    } else if (etapa === 8) {
      const novasInformacoes = texto
        ? semValorInformado(texto) ? "" : texto
        : informacoesAdicionais;
      if (texto) setInformacoesAdicionais(novasInformacoes);
      aplicarEAbrirRevisao({ informacoesAdicionais: novasInformacoes });
      return;
    }

    setMensagem("");
    setResposta("");
    setEtapa((atual) => atual + 1);
  }

  function aplicarEAbrirRevisao(ajustes?: { informacoesAdicionais?: string }) {
    if (clienteId === null || !itens.length) {
      setMensagem("Para continuar, identifique o cliente e pelo menos um produto ou serviço do catálogo.");
      return;
    }
    const produtosSelecionados = itens.some((item) => item.tipo === "produto");
    const servicosSelecionados = itens.some((item) => item.tipo === "servico");
    const informacoesFinais = ajustes?.informacoesAdicionais ?? informacoesAdicionais;
    const observacoes = [
      condicaoPagamento ? `Condições de pagamento: ${condicaoPagamento}` : "",
      informacoesFinais,
    ].filter(Boolean).join("\n");
    if (observacoes.length > 2000) {
      setMensagem("As condições e informações adicionais excedem o limite. Diga uma versão mais curta.");
      return;
    }
    onComplete({
      empresaId: clienteId,
      tipoOrcamento: produtosSelecionados && servicosSelecionados
        ? "produtos-servicos"
        : produtosSelecionados ? "produtos" : "servicos",
      itens,
      formaPagamento,
      condicaoPagamento,
      descontoPercentual,
      descontoValor,
      prazoEntrega,
      frete,
      responsavel,
      informacoesAdicionais: observacoes,
    });
  }

  return (
    <section className="orcamento-voz" aria-labelledby="orcamento-voz-titulo">
      <div className="orcamento-voz-cabecalho">
        <div>
          <h2 id="orcamento-voz-titulo">Criar orçamento por voz</h2>
          <p>Diga o pedido completo ou responda por etapas. O que for reconhecido será preenchido para você conferir e ajustar.</p>
        </div>
        <button className="btn sec" type="button" onClick={onCancel}>Fechar</button>
      </div>

      <p className="orcamento-voz-etapa">
        {etapa < 2 ? `Etapa ${etapa + 1} de ${PERGUNTAS.length}` : `Condições opcionais: etapa ${etapa - 1} de ${PERGUNTAS.length - 2}`}
      </p>
      <h3 className="orcamento-voz-pergunta">
        {etapa === 0 && aguardandoCliente
          ? "Os itens foram reconhecidos. Diga o nome do cliente ou empresa como aparece no cadastro."
          : PERGUNTAS[etapa]}
      </h3>
      <div className="orcamento-voz-controles">
        <button className="btn" type="button" onClick={gravar} disabled={ouvindo}>
          {ouvindo ? "Ouvindo..." : "🎙️ Gravar resposta"}
        </button>
        {ouvindo && (
          <button className="btn sec" type="button" onClick={() => reconhecimentoRef.current?.stop()}>
            Encerrar e usar fala
          </button>
        )}
      </div>
      <label className="campo">
        <span>Resposta reconhecida (você pode corrigir o texto)</span>
        <textarea
          value={resposta}
          onChange={(evento) => setResposta(evento.target.value)}
          maxLength={2000}
          rows={3}
        />
      </label>
      {mensagem && <div className="aviso erro" role="alert">{mensagem}</div>}
      <div className="orcamento-voz-acoes">
        {etapa > 0 && (
          <button
            className="btn sec"
            type="button"
            onClick={() => {
              setEtapa((atual) => atual - 1);
              setResposta("");
              setMensagem("");
            }}
          >
            Voltar
          </button>
        )}
        <button className="btn" type="button" onClick={confirmarResposta}>
          {etapa === PERGUNTAS.length - 1 ? "Aplicar dados e revisar" : "Continuar"}
        </button>
        {etapa >= 2 && clienteId !== null && itens.length > 0 && (
          <button className="btn sec" type="button" onClick={() => aplicarEAbrirRevisao()}>
            Pular campos restantes e revisar
          </button>
        )}
        <button
          className="btn sec"
          type="button"
          onClick={aplicarDadosReconhecidos}
        >
          Aplicar e editar manualmente
        </button>
      </div>
      <small>A gravação continua até você clicar em “Encerrar e usar fala”. O reconhecimento é feito pelo navegador; nenhum áudio é salvo pelo sistema.</small>
    </section>
  );
}
