import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 44;

type SnapshotEmpresa = {
  nome: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  razao_social: string;
  cnpj: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  site: string;
};

function lerSnapshot(valor: unknown): SnapshotEmpresa | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
  const registro = valor as Record<string, unknown>;
  const campo = (nome: string) => typeof registro[nome] === "string" ? registro[nome] as string : "";
  return {
    nome: campo("nome"),
    nome_fantasia: campo("nome_fantasia"),
    cpf_cnpj: campo("cpf_cnpj"),
    razao_social: campo("razao_social"),
    cnpj: campo("cnpj"),
    rua: campo("rua"),
    numero: campo("numero"),
    complemento: campo("complemento"),
    bairro: campo("bairro"),
    cidade: campo("cidade"),
    estado: campo("estado"),
    cep: campo("cep"),
    telefone: campo("telefone"),
    email: campo("email"),
    site: campo("site"),
  };
}

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function quebrarTexto(texto: string, fonte: PDFFont, tamanho: number, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(candidata, tamanho) > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = candidata;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await getPerfil();
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isSafeInteger(id) || id <= 0) return new Response("Orçamento não encontrado.", { status: 404 });

  const supabase = await createClient();
  const { data: orcamento, error: orcamentoErro } = await supabase
    .from("orcamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (orcamentoErro) {
    console.error("Falha ao carregar orçamento para PDF:", orcamentoErro.message);
    return new Response("Não foi possível carregar o orçamento.", { status: 500 });
  }
  if (!orcamento) return new Response("Orçamento não encontrado.", { status: 404 });

  const emissora = lerSnapshot(orcamento.emissor_snapshot);
  const empresa = lerSnapshot(orcamento.solicitante_snapshot);
  const { data: itens, error: itensErro } = await supabase
    .from("orcamento_itens")
    .select("tipo_item, descricao, unidade_medida, quantidade, valor_unitario, subtotal")
    .eq("orcamento_id", id)
    .order("id");
  if (itensErro) {
    console.error("Falha ao carregar itens para PDF:", itensErro.message);
    return new Response("Não foi possível carregar os dados do orçamento.", { status: 500 });
  }
  if (!empresa || !emissora) {
    console.error("Orçamento sem cópia dos dados de emissor/solicitante:", id);
    return new Response("Não foi possível carregar os dados do orçamento.", { status: 500 });
  }
  if (!emissora.razao_social || !emissora.cnpj || !emissora.rua || !emissora.cidade || !emissora.telefone || !emissora.email) {
    return new Response("Configure os dados da empresa emissora antes de gerar o PDF do orçamento.", { status: 409 });
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Orçamento ${String(orcamento.id).padStart(6, "0")}`);
  pdf.setAuthor(emissora.razao_social);
  pdf.setSubject(`Orçamento para ${empresa.nome}`);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readFile(path.join(process.cwd(), "public", "logo-colorido.png"));
  const logo = await pdf.embedPng(logoBytes);
  const corPrimaria = rgb(0.12, 0.53, 0.59);
  const corTexto = rgb(0.15, 0.21, 0.23);
  const corSuave = rgb(0.39, 0.47, 0.49);
  const paginas: PDFPage[] = [];
  let page = pdf.addPage([LARGURA, ALTURA]);
  paginas.push(page);
  let y = ALTURA - MARGEM;

  function novaPagina() {
    page = pdf.addPage([LARGURA, ALTURA]);
    paginas.push(page);
    y = ALTURA - MARGEM;
  }

  function garantirEspaco(altura: number) {
    if (y - altura < MARGEM + 30) novaPagina();
  }

  function texto(text: string, x: number, size = 10, fonte = regular, color = corTexto) {
    page.drawText(text, { x, y, size, font: fonte, color });
  }

  function paragrafo(text: string, x: number, width: number, size = 9, fonte = regular, color = corTexto) {
    const linhas = quebrarTexto(text, fonte, size, width);
    for (const linha of linhas) {
      garantirEspaco(size + 5);
      texto(linha, x, size, fonte, color);
      y -= size + 5;
    }
  }

  page.drawImage(logo, { x: MARGEM, y: y - 48, width: 112, height: 48 });
  page.drawText("ORÇAMENTO", {
    x: 355, y: y - 4, size: 22, font: bold, color: corPrimaria,
  });
  page.drawText(`Nº ${String(orcamento.id).padStart(6, "0")}`, {
    x: 356, y: y - 23, size: 11, font: bold, color: corTexto,
  });
  page.drawText(`Emissão: ${formatarData(orcamento.criado_em)}`, {
    x: 356, y: y - 40, size: 9, font: regular, color: corSuave,
  });
  y -= 64;

  page.drawLine({ start: { x: MARGEM, y }, end: { x: LARGURA - MARGEM, y }, thickness: 1.5, color: corPrimaria });
  y -= 20;
  paragrafo(emissora.nome_fantasia || emissora.razao_social, MARGEM, LARGURA - MARGEM * 2, 12, bold, corPrimaria);
  paragrafo(`Razão social: ${emissora.razao_social}  |  CNPJ: ${emissora.cnpj}`, MARGEM, LARGURA - MARGEM * 2);
  const enderecoEmissor = [
    [emissora.rua, emissora.numero].filter(Boolean).join(", "),
    emissora.complemento,
    emissora.bairro,
    [emissora.cidade, emissora.estado].filter(Boolean).join(" - "),
    emissora.cep && `CEP ${emissora.cep}`,
  ].filter(Boolean).join(" · ");
  paragrafo(enderecoEmissor, MARGEM, LARGURA - MARGEM * 2);
  paragrafo([emissora.telefone, emissora.email, emissora.site].filter(Boolean).join(" · "), MARGEM, LARGURA - MARGEM * 2);
  y -= 8;

  page.drawText("SOLICITANTE", { x: MARGEM, y, size: 10, font: bold, color: corPrimaria });
  y -= 15;
  paragrafo(empresa.nome_fantasia ? `${empresa.nome} (${empresa.nome_fantasia})` : empresa.nome, MARGEM, LARGURA - MARGEM * 2, 10, bold);
  const enderecoCliente = [
    [empresa.rua, empresa.numero].filter(Boolean).join(", "),
    empresa.complemento,
    empresa.bairro,
    [empresa.cidade, empresa.estado].filter(Boolean).join(" - "),
    empresa.cep && `CEP ${empresa.cep}`,
  ].filter(Boolean).join(" · ");
  if (empresa.cpf_cnpj) paragrafo(`CPF/CNPJ: ${empresa.cpf_cnpj}`, MARGEM, LARGURA - MARGEM * 2);
  if (enderecoCliente) paragrafo(enderecoCliente, MARGEM, LARGURA - MARGEM * 2);
  if (empresa.telefone || empresa.email) paragrafo([empresa.telefone, empresa.email].filter(Boolean).join(" · "), MARGEM, LARGURA - MARGEM * 2);
  y -= 10;

  page.drawText("ITENS DO ORÇAMENTO", { x: MARGEM, y, size: 10, font: bold, color: corPrimaria });
  y -= 18;
  const xDescricao = MARGEM;
  const xQuantidade = 365;
  const xUnitario = 430;
  const xSubtotal = 505;
  page.drawRectangle({ x: MARGEM, y: y - 5, width: LARGURA - MARGEM * 2, height: 20, color: rgb(0.92, 0.96, 0.97) });
  page.drawText("Descrição", { x: xDescricao + 6, y, size: 8, font: bold });
  page.drawText("Qtd.", { x: xQuantidade, y, size: 8, font: bold });
  page.drawText("Unitário", { x: xUnitario, y, size: 8, font: bold });
  page.drawText("Subtotal", { x: xSubtotal, y, size: 8, font: bold });
  y -= 20;

  for (const item of itens ?? []) {
    const unidade = item.unidade_medida ? ` (${item.unidade_medida})` : "";
    const descricao = `${item.tipo_item === "produto" ? "Produto" : "Serviço"}: ${item.descricao}${unidade}`;
    const linhas = quebrarTexto(descricao, regular, 8, xQuantidade - xDescricao - 14);
    const altura = Math.max(1, linhas.length) * 12 + 8;
    garantirEspaco(altura);
    for (let indice = 0; indice < linhas.length; indice++) {
      page.drawText(linhas[indice], { x: xDescricao + 6, y: y - indice * 12, size: 8, font: regular });
    }
    page.drawText(String(Number(item.quantidade)), { x: xQuantidade, y, size: 8, font: regular });
    page.drawText(formatarMoeda(item.valor_unitario), { x: xUnitario, y, size: 8, font: regular });
    page.drawText(formatarMoeda(item.subtotal), { x: xSubtotal, y, size: 8, font: regular });
    y -= altura;
    page.drawLine({ start: { x: MARGEM, y }, end: { x: LARGURA - MARGEM, y }, thickness: 0.4, color: rgb(0.85, 0.89, 0.9) });
    y -= 4;
  }

  y -= 8;
  const linhaResumo = (rotulo: string, valor: number, destaque = false) => {
    garantirEspaco(18);
    page.drawText(rotulo, { x: 345, y, size: destaque ? 11 : 9, font: destaque ? bold : regular, color: destaque ? corPrimaria : corTexto });
    const formatado = formatarMoeda(valor);
    page.drawText(formatado, {
      x: LARGURA - MARGEM - regular.widthOfTextAtSize(formatado, destaque ? 11 : 9),
      y,
      size: destaque ? 11 : 9,
      font: destaque ? bold : regular,
      color: destaque ? corPrimaria : corTexto,
    });
    y -= destaque ? 21 : 16;
  };

  linhaResumo("Subtotal", orcamento.subtotal);
  if (Number(orcamento.desconto_percentual) > 0) {
    linhaResumo(`Desconto (${Number(orcamento.desconto_percentual)}%)`, Number(orcamento.subtotal) * Number(orcamento.desconto_percentual) / 100);
  }
  if (Number(orcamento.desconto_valor) > 0) linhaResumo("Desconto em reais", Number(orcamento.desconto_valor));
  linhaResumo("Frete", Number(orcamento.frete));
  linhaResumo("TOTAL", Number(orcamento.total), true);

  y -= 6;
  page.drawLine({ start: { x: MARGEM, y }, end: { x: LARGURA - MARGEM, y }, thickness: 0.6, color: corPrimaria });
  y -= 18;
  page.drawText("CONDIÇÕES", { x: MARGEM, y, size: 10, font: bold, color: corPrimaria });
  y -= 15;
  const pagamento: Record<string, string> = {
    avista: "À vista", pix: "PIX", boleto: "Boleto", transferencia: "Transferência bancária",
    cartao: "Cartão", faturado: "Faturado", outro: "Outro",
  };
  paragrafo(`Forma de pagamento: ${pagamento[orcamento.forma_pagamento] ?? orcamento.forma_pagamento}`, MARGEM, LARGURA - MARGEM * 2);
  if (orcamento.prazo_entrega) paragrafo(`Prazo de entrega: ${orcamento.prazo_entrega}`, MARGEM, LARGURA - MARGEM * 2);
  if (orcamento.responsavel) paragrafo(`Responsável: ${orcamento.responsavel}`, MARGEM, LARGURA - MARGEM * 2);
  if (orcamento.informacoes_adicionais) {
    y -= 4;
    page.drawText("INFORMAÇÕES ADICIONAIS", { x: MARGEM, y, size: 9, font: bold, color: corPrimaria });
    y -= 13;
    paragrafo(orcamento.informacoes_adicionais, MARGEM, LARGURA - MARGEM * 2);
  }

  for (let index = 0; index < paginas.length; index++) {
    const pagina = paginas[index];
    pagina.drawLine({
      start: { x: MARGEM, y: 28 },
      end: { x: LARGURA - MARGEM, y: 28 },
      thickness: 0.5,
      color: rgb(0.85, 0.89, 0.9),
    });
    pagina.drawText(`${emissora.nome_fantasia || emissora.razao_social} · Orçamento ${String(orcamento.id).padStart(6, "0")}`, {
      x: MARGEM, y: 16, size: 7, font: regular, color: corSuave,
    });
    const paginaTexto = `${index + 1}/${paginas.length}`;
    pagina.drawText(paginaTexto, {
      x: LARGURA - MARGEM - regular.widthOfTextAtSize(paginaTexto, 7), y: 16, size: 7, font: regular, color: corSuave,
    });
  }

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orcamento-${String(orcamento.id).padStart(6, "0")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
