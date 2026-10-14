"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfil, txt, num } from "@/lib/auth";
import { ESTADOS_EQUIPAMENTO, PRIORIDADES, MODOS_USO } from "@/lib/constants";

// Resolve uma lista com "+": se o usuário digitou um item novo, cria (ou reaproveita) e devolve o id.
async function resolverLista(
  supabase: any,
  tabela: "tipos_equipamento" | "quadros_trabalho",
  formData: FormData,
  campoId: string,
  campoNovo: string
): Promise<{ id: number | null; falhou: boolean }> {
  const novo = txt(formData, campoNovo);
  if (novo) {
    const { data, error } = await supabase
      .from(tabela)
      .upsert({ nome: novo }, { onConflict: "nome" })
      .select("id")
      .single();
    if (error || !data) return { id: null, falhou: true };
    return { id: data.id as number, falhou: false };
  }
  return { id: num(formData, campoId), falhou: false };
}

export async function salvarEquipamento(formData: FormData) {
  await getPerfil();

  const idTexto = txt(formData, "id");
  const id = idTexto ? Number(idTexto) : null;
  const voltar = id ? `/equipamentos/${id}` : "/equipamentos/novo";
  if (idTexto && !Number.isInteger(id)) redirect("/equipamentos?erro=salvar");

  const supabase = await createClient();

  const tipo = await resolverLista(supabase, "tipos_equipamento", formData, "tipo_id", "novo_tipo");
  const quadro = await resolverLista(supabase, "quadros_trabalho", formData, "quadro_id", "novo_quadro");
  if (tipo.falhou || quadro.falhou) redirect(`${voltar}?erro=salvar`);

  const proprietario = num(formData, "proprietario_id");
  const estado = txt(formData, "estado");
  const prioridade = txt(formData, "prioridade");
  const modoUso = txt(formData, "modo_uso");

  if (
    tipo.id === null ||
    proprietario === null ||
    !estado || !ESTADOS_EQUIPAMENTO.includes(estado) ||
    !prioridade || !PRIORIDADES.includes(prioridade) ||
    !modoUso || !MODOS_USO.includes(modoUso)
  ) {
    redirect(`${voltar}?erro=campos`);
  }

  const linha = {
    tipo_id: tipo.id,
    quadro_id: quadro.id,
    fabricante: txt(formData, "fabricante"),
    modelo: txt(formData, "modelo"),
    estado,
    proprietario_id: proprietario,
    identificacao_tag: txt(formData, "identificacao_tag"),
    numero_serie: txt(formData, "numero_serie"),
    patrimonio: txt(formData, "patrimonio"),
    portaria_inmetro: txt(formData, "portaria_inmetro"),
    prioridade,
    modo_uso: modoUso,
    data_fabricacao: txt(formData, "data_fabricacao"),
    data_aquisicao: txt(formData, "data_aquisicao"),
    informacoes_extras: txt(formData, "informacoes_extras"),
    informacoes_contrato: txt(formData, "informacoes_contrato"),
    observacoes: txt(formData, "observacoes"),
    atualizado_em: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("equipamentos").update(linha).eq("id", id)
    : await supabase.from("equipamentos").insert(linha);

  if (error) redirect(`${voltar}?erro=salvar`);

  revalidatePath("/equipamentos");
  redirect("/equipamentos?ok=ok");
}

type DadosEquipamentoImportacao = {
  tipo_nome: string;
  quadro_nome: string;
  fabricante: string;
  modelo: string;
  estado: string;
  proprietario_nome: string;
  identificacao_tag: string;
  numero_serie: string;
  patrimonio: string;
  portaria_inmetro: string;
  prioridade: string;
  modo_uso: string;
  data_fabricacao: string;
  data_aquisicao: string;
  informacoes_extras: string;
  informacoes_contrato: string;
  observacoes: string;
};

function ehObjetoImportacao(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoEquipamentoImportado(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function resolverOpcao(valor: string, opcoes: readonly string[], padrao?: string) {
  if (!valor && padrao) return padrao;
  const normalizado = valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return opcoes.find((opcao) =>
    opcao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR") === normalizado
  ) ?? null;
}

function dataImportada(valor: string) {
  if (!valor) return null;
  let iso = valor;
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  if (brasileira) iso = `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const data = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso ? undefined : iso;
}

export async function importarEquipamentos(conteudo: string): Promise<{ erro: string } | { mensagem: string }> {
  const perfil = await getPerfil();
  if (!perfil.ativo) return { erro: "Seu usuário não tem permissão para importar equipamentos." };

  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    return { erro: "Os dados da planilha estão inválidos. Carregue o arquivo novamente." };
  }
  if (!Array.isArray(dados) || dados.length === 0 || dados.length > 2000) {
    return { erro: "A importação precisa conter entre 1 e 2.000 equipamentos." };
  }

  const erros: string[] = [];
  const linhas: DadosEquipamentoImportacao[] = [];
  dados.forEach((linha: unknown, indice: number) => {
    if (!ehObjetoImportacao(linha)) {
      erros.push(`Linha ${indice + 2}: dados inválidos.`);
      return;
    }
    const ler = (campo: keyof DadosEquipamentoImportacao) => textoEquipamentoImportado(linha[campo]);
    const tipo = ler("tipo_nome");
    const proprietario = ler("proprietario_nome");
    const estado = resolverOpcao(ler("estado"), ESTADOS_EQUIPAMENTO, "Ativo");
    const prioridade = resolverOpcao(ler("prioridade"), PRIORIDADES, "Não urgente");
    const modoUso = resolverOpcao(ler("modo_uso"), MODOS_USO, "Equipamento");
    const fabricacaoOriginal = ler("data_fabricacao");
    const aquisicaoOriginal = ler("data_aquisicao");
    const fabricacao = dataImportada(fabricacaoOriginal);
    const aquisicao = dataImportada(aquisicaoOriginal);

    if (!tipo || !proprietario || !estado || !prioridade || !modoUso) {
      erros.push(`Linha ${indice + 2}: tipo e proprietário são obrigatórios; confira estado, prioridade e modo de uso.`);
      return;
    }
    if (fabricacao === undefined || aquisicao === undefined) {
      erros.push(`Linha ${indice + 2}: use datas válidas no formato DD/MM/AAAA ou AAAA-MM-DD.`);
      return;
    }
    const registro: DadosEquipamentoImportacao = {
      tipo_nome: tipo,
      quadro_nome: ler("quadro_nome"),
      fabricante: ler("fabricante"),
      modelo: ler("modelo"),
      estado,
      proprietario_nome: proprietario,
      identificacao_tag: ler("identificacao_tag"),
      numero_serie: ler("numero_serie"),
      patrimonio: ler("patrimonio"),
      portaria_inmetro: ler("portaria_inmetro"),
      prioridade,
      modo_uso: modoUso,
      data_fabricacao: fabricacao ?? "",
      data_aquisicao: aquisicao ?? "",
      informacoes_extras: ler("informacoes_extras"),
      informacoes_contrato: ler("informacoes_contrato"),
      observacoes: ler("observacoes"),
    };
    const limites: Array<[keyof DadosEquipamentoImportacao, number]> = [
      ["tipo_nome", 200], ["quadro_nome", 200], ["fabricante", 200], ["modelo", 200],
      ["identificacao_tag", 200], ["numero_serie", 100], ["patrimonio", 100],
      ["portaria_inmetro", 100], ["proprietario_nome", 200],
    ];
    if (limites.some(([campo, limite]) => registro[campo].length > limite)) {
      erros.push(`Linha ${indice + 2}: um dos campos excede o tamanho permitido.`);
      return;
    }
    linhas.push(registro);
  });

  if (erros.length > 0) {
    const restantes = erros.length > 10 ? ` E mais ${erros.length - 10} erro(s).` : "";
    return { erro: `${erros.slice(0, 10).join(" ")}${restantes} Nenhum equipamento foi importado.` };
  }

  const supabase = await createClient();
  const proprietarios = [...new Set(linhas.map((linha) => linha.proprietario_nome))];
  const { data: empresas, error: empresasErro } = await supabase
    .from("empresas")
    .select("id, nome")
    .in("nome", proprietarios);
  if (empresasErro) {
    console.error("Falha ao conferir proprietários para importação:", { code: empresasErro.code, message: empresasErro.message });
    return { erro: "Não foi possível conferir as empresas proprietárias. Tente novamente." };
  }
  const proprietarioIds = new Map<string, number>();
  const ambiguos = new Set<string>();
  for (const empresa of empresas ?? []) {
    if (proprietarioIds.has(empresa.nome)) ambiguos.add(empresa.nome);
    else proprietarioIds.set(empresa.nome, empresa.id);
  }
  const ausentes = proprietarios.filter((nome) => !proprietarioIds.has(nome));
  if (ausentes.length > 0 || ambiguos.size > 0) {
    const partes: string[] = [];
    if (ausentes.length > 0) partes.push(`Não encontrei a empresa proprietária: ${ausentes.slice(0, 5).join(", ")}${ausentes.length > 5 ? "…" : ""}. Importe as empresas primeiro e confira os nomes.`);
    if (ambiguos.size > 0) partes.push(`Há nomes de empresa duplicados e não foi possível identificar o proprietário: ${[...ambiguos].slice(0, 5).join(", ")}.`);
    return { erro: partes.join(" ") };
  }

  const tiposNomes = [...new Set(linhas.map((linha) => linha.tipo_nome))];
  const { error: tiposErro } = await supabase.from("tipos_equipamento").upsert(
    tiposNomes.map((nome) => ({ nome })),
    { onConflict: "nome" }
  );
  if (tiposErro) {
    console.error("Falha ao preparar tipos de equipamento:", { code: tiposErro.code, message: tiposErro.message });
    return { erro: "Não foi possível preparar os tipos de equipamento. Verifique a configuração do banco." };
  }

  const quadrosNomes = [...new Set(linhas.map((linha) => linha.quadro_nome).filter(Boolean))];
  if (quadrosNomes.length > 0) {
    const { error: quadrosErro } = await supabase.from("quadros_trabalho").upsert(
      quadrosNomes.map((nome) => ({ nome })),
      { onConflict: "nome" }
    );
    if (quadrosErro) {
      console.error("Falha ao preparar quadros de trabalho:", { code: quadrosErro.code, message: quadrosErro.message });
      return { erro: "Não foi possível preparar os quadros de trabalho. Verifique a configuração do banco." };
    }
  }

  const { data: tipos, error: consultaTiposErro } = await supabase
    .from("tipos_equipamento").select("id, nome").in("nome", tiposNomes);
  if (consultaTiposErro || !tipos) {
    console.error("Falha ao consultar tipos de equipamento:", { code: consultaTiposErro?.code, message: consultaTiposErro?.message });
    return { erro: "Não foi possível consultar os tipos de equipamento." };
  }
  const tipoIds = new Map(tipos.map((tipo) => [tipo.nome, tipo.id]));

  let quadroIds = new Map<string, number>();
  if (quadrosNomes.length > 0) {
    const { data: quadros, error: consultaQuadrosErro } = await supabase
      .from("quadros_trabalho").select("id, nome").in("nome", quadrosNomes);
    if (consultaQuadrosErro || !quadros) {
      console.error("Falha ao consultar quadros de trabalho:", { code: consultaQuadrosErro?.code, message: consultaQuadrosErro?.message });
      return { erro: "Não foi possível consultar os quadros de trabalho." };
    }
    quadroIds = new Map(quadros.map((quadro) => [quadro.nome, quadro.id]));
  }

  const registros = linhas.map((linha) => ({
    tipo_id: tipoIds.get(linha.tipo_nome),
    quadro_id: linha.quadro_nome ? quadroIds.get(linha.quadro_nome) ?? null : null,
    proprietario_id: proprietarioIds.get(linha.proprietario_nome),
    fabricante: linha.fabricante || null,
    modelo: linha.modelo || null,
    estado: linha.estado,
    identificacao_tag: linha.identificacao_tag || null,
    numero_serie: linha.numero_serie || null,
    patrimonio: linha.patrimonio || null,
    portaria_inmetro: linha.portaria_inmetro || null,
    prioridade: linha.prioridade,
    modo_uso: linha.modo_uso,
    data_fabricacao: linha.data_fabricacao || null,
    data_aquisicao: linha.data_aquisicao || null,
    informacoes_extras: linha.informacoes_extras || null,
    informacoes_contrato: linha.informacoes_contrato || null,
    observacoes: linha.observacoes || null,
  }));

  if (registros.some((registro) => !registro.tipo_id || !registro.proprietario_id)) {
    return { erro: "Não foi possível relacionar todos os tipos e proprietários da planilha. Confira os nomes e tente novamente." };
  }
  const { error } = await supabase.from("equipamentos").insert(registros);
  if (error) {
    console.error("Falha ao importar equipamentos no Supabase:", { code: error.code, message: error.message });
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { erro: "As tabelas de equipamentos não estão configuradas. Execute supabase/schema.sql no SQL Editor do Supabase." };
    }
    if (error.code === "42501") {
      return { erro: "O Supabase não permitiu importar. Verifique se seu usuário está ativo e as permissões do banco." };
    }
    return { erro: "Não foi possível importar os equipamentos. Nenhum equipamento foi cadastrado; confira os dados e tente novamente." };
  }

  revalidatePath("/equipamentos");
  return { mensagem: `${registros.length} equipamento(s) importado(s) com sucesso.` };
}

export async function excluirEquipamento(formData: FormData) {
  const p = await getPerfil();
  if (p.perfil !== "admin") redirect("/equipamentos?erro=permissao");

  const id = num(formData, "id");
  if (id === null) redirect("/equipamentos?erro=salvar");

  const supabase = await createClient();
  const { error } = await supabase.from("equipamentos").delete().eq("id", id);
  if (error) redirect("/equipamentos?erro=vinculos");

  revalidatePath("/equipamentos");
  redirect("/equipamentos?ok=excluido");
}
