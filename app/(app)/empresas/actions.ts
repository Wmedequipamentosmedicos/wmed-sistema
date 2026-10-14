"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfil, txt, num } from "@/lib/auth";
import { TIPOS_EMPRESA } from "@/lib/constants";

export async function salvarEmpresa(formData: FormData) {
  await getPerfil();

  const idTexto = txt(formData, "id");
  const id = idTexto ? Number(idTexto) : null;
  const voltar = id ? `/empresas/${id}` : "/empresas/novo";

  if (idTexto && !Number.isInteger(id)) redirect("/empresas?erro=salvar");

  const nome = txt(formData, "nome");
  const tipo = txt(formData, "tipo");
  if (!nome || !tipo || !TIPOS_EMPRESA.includes(tipo)) redirect(`${voltar}?erro=campos`);

  let superior = num(formData, "superior_id");
  if (superior !== null && superior === id) superior = null; // uma empresa não pode ser superior de si mesma

  const linha = {
    nome,
    nome_fantasia: txt(formData, "nome_fantasia"),
    tipo,
    superior_id: superior,
    cpf_cnpj: txt(formData, "cpf_cnpj"),
    cep: txt(formData, "cep"),
    rua: txt(formData, "rua"),
    numero: txt(formData, "numero"),
    complemento: txt(formData, "complemento"),
    bairro: txt(formData, "bairro"),
    cidade: txt(formData, "cidade"),
    estado: txt(formData, "estado"),
    contato: txt(formData, "contato"),
    telefone: txt(formData, "telefone"),
    email: txt(formData, "email"),
    observacoes: txt(formData, "observacoes"),
    atualizado_em: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("empresas").update(linha).eq("id", id)
    : await supabase.from("empresas").insert(linha);

  if (error) redirect(`${voltar}?erro=salvar`);

  revalidatePath("/empresas");
  redirect("/empresas?ok=ok");
}

type DadosEmpresaImportacao = {
  nome: string;
  nome_fantasia: string;
  tipo: string;
  cpf_cnpj: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  contato: string;
  telefone: string;
  email: string;
  observacoes: string;
};

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoImportado(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarTipoEmpresa(valor: string) {
  const normalizado = valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  return TIPOS_EMPRESA.find((tipo) =>
    tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR") === normalizado
  ) ?? null;
}

export async function importarEmpresas(conteudo: string): Promise<{ erro: string } | { mensagem: string }> {
  const perfil = await getPerfil();
  if (!perfil.ativo) return { erro: "Seu usuário não tem permissão para importar empresas." };

  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    return { erro: "Os dados da planilha estão inválidos. Carregue o arquivo novamente." };
  }
  if (!Array.isArray(dados) || dados.length === 0 || dados.length > 2000) {
    return { erro: "A importação precisa conter entre 1 e 2.000 empresas." };
  }

  const erros: string[] = [];
  const empresas: Array<Record<string, string | null>> = [];
  dados.forEach((linha: unknown, indice: number) => {
    if (!ehObjeto(linha)) {
      erros.push(`Linha ${indice + 2}: dados inválidos.`);
      return;
    }
    const ler = (campo: keyof DadosEmpresaImportacao) => textoImportado(linha[campo]);
    const nome = ler("nome");
    const tipoOriginal = ler("tipo");
    const tipo = normalizarTipoEmpresa(tipoOriginal);
    const registro: DadosEmpresaImportacao = {
      nome,
      nome_fantasia: ler("nome_fantasia"),
      tipo: tipo ?? "",
      cpf_cnpj: ler("cpf_cnpj"),
      cep: ler("cep"),
      rua: ler("rua"),
      numero: ler("numero"),
      complemento: ler("complemento"),
      bairro: ler("bairro"),
      cidade: ler("cidade"),
      estado: ler("estado"),
      contato: ler("contato"),
      telefone: ler("telefone"),
      email: ler("email"),
      observacoes: ler("observacoes"),
    };
    if (!nome || !tipo) {
      erros.push(`Linha ${indice + 2}: nome e tipo válido (Cliente Externo, Cliente Interno ou Fornecedor) são obrigatórios.`);
      return;
    }
    const limites: Array<[string, number]> = [
      ["nome", 200], ["nome_fantasia", 200], ["cpf_cnpj", 20], ["cep", 9],
      ["numero", 20], ["estado", 2], ["email", 320],
    ];
    if (limites.some(([campo, limite]) => registro[campo].length > limite)) {
      erros.push(`Linha ${indice + 2}: um dos campos excede o tamanho permitido.`);
      return;
    }
    if (registro.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registro.email)) {
      erros.push(`Linha ${indice + 2}: o e-mail não parece válido.`);
      return;
    }
    empresas.push(Object.fromEntries(
      Object.entries(registro).map(([campo, valor]) => [campo, valor || null])
    ));
  });

  if (erros.length > 0) {
    const restantes = erros.length > 10 ? ` E mais ${erros.length - 10} erro(s).` : "";
    return { erro: `${erros.slice(0, 10).join(" ")}${restantes} Nenhuma empresa foi importada.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("empresas").insert(empresas);
  if (error) {
    console.error("Falha ao importar empresas no Supabase:", { code: error.code, message: error.message });
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { erro: "A tabela de empresas não está configurada. Execute supabase/schema.sql no SQL Editor do Supabase." };
    }
    if (error.code === "42501") {
      return { erro: "O Supabase não permitiu importar. Verifique se seu usuário está ativo e as permissões do banco." };
    }
    return { erro: "Não foi possível importar as empresas. Nenhuma empresa foi cadastrada; confira os dados e tente novamente." };
  }

  revalidatePath("/empresas");
  revalidatePath("/equipamentos");
  revalidatePath("/orcamentos");
  return { mensagem: `${empresas.length} empresa(s) importada(s) com sucesso.` };
}

export async function excluirEmpresa(formData: FormData) {
  const p = await getPerfil();
  if (p.perfil !== "admin") redirect("/empresas?erro=permissao");

  const id = num(formData, "id");
  if (id === null) redirect("/empresas?erro=salvar");

  const supabase = await createClient();
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) redirect("/empresas?erro=vinculos");

  revalidatePath("/empresas");
  redirect("/empresas?ok=excluido");
}
