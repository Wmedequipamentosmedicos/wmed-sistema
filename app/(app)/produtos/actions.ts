"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfil, num, txt } from "@/lib/auth";

const BUCKET_PRODUTOS = "produtos";
const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
const TIPOS_IMAGEM: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function codigoErroBanco(codigo: string | undefined) {
  if (codigo === "42P01" || codigo === "PGRST205") return "produto_configuracao";
  if (codigo === "42501") return "produto_permissao";
  return "produto_salvar";
}

function validarImagem(valor: FormDataEntryValue | null): valor is File {
  return valor instanceof File && valor.size > 0 && valor.size <= TAMANHO_MAXIMO_IMAGEM && valor.type in TIPOS_IMAGEM;
}

async function removerImagem(supabase: Awaited<ReturnType<typeof createClient>>, caminho: string) {
  const { error } = await supabase.storage.from(BUCKET_PRODUTOS).remove([caminho]);
  if (error) console.error("Não foi possível remover a imagem do produto:", error.message);
  return !error;
}

export async function salvarProduto(formData: FormData) {
  await getPerfil();

  const idTexto = txt(formData, "id");
  const id = idTexto ? Number(idTexto) : null;
  const voltar = id ? `/produtos/${id}` : "/produtos/novo";
  if (idTexto && (id === null || !Number.isSafeInteger(id) || id <= 0)) {
    redirect("/produtos?erro=produto_salvar");
  }

  const nome = txt(formData, "nome");
  const categoria = txt(formData, "categoria");
  const unidadeMedida = txt(formData, "unidade_medida");
  const fabricante = txt(formData, "fabricante");
  const valorTexto = txt(formData, "valor");
  const valor = valorTexto === null ? Number.NaN : Number(valorTexto.replace(",", "."));

  if (!nome || !categoria || !unidadeMedida || !Number.isFinite(valor) || valor < 0) {
    redirect(`${voltar}?erro=produto_campos`);
  }

  const imagemForm = formData.get("imagem");
  const temImagem = imagemForm instanceof File && imagemForm.size > 0;
  if (temImagem && !validarImagem(imagemForm)) redirect(`${voltar}?erro=produto_imagem`);

  const supabase = await createClient();
  let imagemAnterior: string | null = null;
  if (id) {
    const { data, error } = await supabase.from("produtos").select("imagem_path").eq("id", id).maybeSingle();
    if (error) {
      console.error("Falha ao carregar produto no Supabase:", { code: error.code, message: error.message });
      redirect(`/produtos?erro=${codigoErroBanco(error.code)}`);
    }
    if (!data) redirect("/produtos?erro=produto_salvar");
    imagemAnterior = data.imagem_path;
  }

  let novaImagem: string | null = null;
  if (temImagem && imagemForm instanceof File) {
    const extensao = TIPOS_IMAGEM[imagemForm.type];
    novaImagem = `${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabase.storage.from(BUCKET_PRODUTOS).upload(novaImagem, imagemForm, {
      contentType: imagemForm.type,
      upsert: false,
    });
    if (error) redirect(`${voltar}?erro=produto_imagem_salvar`);
  }

  const linha = {
    nome,
    categoria,
    unidade_medida: unidadeMedida,
    valor,
    fabricante,
    ...(novaImagem ? { imagem_path: novaImagem } : {}),
    atualizado_em: new Date().toISOString(),
  };

  const resultado = id
    ? await supabase.from("produtos").update(linha).eq("id", id)
    : await supabase.from("produtos").insert(linha).select("id").single();

  if (resultado.error) {
    console.error("Falha ao salvar produto no Supabase:", {
      code: resultado.error.code,
      message: resultado.error.message,
    });
    if (novaImagem) await removerImagem(supabase, novaImagem);
    redirect(`${voltar}?erro=${codigoErroBanco(resultado.error.code)}`);
  }

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${id ?? ""}`);

  if (novaImagem && imagemAnterior && !(await removerImagem(supabase, imagemAnterior))) {
    redirect(`/produtos?erro=produto_imagem_limpeza`);
  }
  redirect("/produtos?ok=ok");
}

type DadosImportacao = {
  nome: string;
  categoria: string;
  unidade_medida: string;
  valor: string;
  fabricante: string;
};

function valorImportado(valor: string) {
  let normalizado = valor.trim().replace(/[R$\s]/g, "");
  if (normalizado.includes(",")) {
    normalizado = normalizado.replace(/\./g, "").replace(",", ".");
  }
  return Number(normalizado);
}

export async function importarProdutos(conteudo: string): Promise<{ erro: string } | { mensagem: string }> {
  const perfil = await getPerfil();
  if (!perfil.ativo) return { erro: "Seu usuário não tem permissão para importar produtos." };

  let produtos: unknown;
  try {
    produtos = JSON.parse(conteudo);
  } catch {
    return { erro: "Os dados da planilha estão inválidos. Carregue o arquivo novamente." };
  }
  if (!Array.isArray(produtos) || produtos.length === 0 || produtos.length > 2000) {
    return { erro: "A importação precisa conter entre 1 e 2.000 produtos." };
  }

  const erros: string[] = [];
  const registros: Array<{
    nome: string;
    categoria: string;
    unidade_medida: string;
    valor: number;
    fabricante: string | null;
  }> = [];

  produtos.forEach((item: unknown, indice: number) => {
    if (!item || typeof item !== "object") {
      erros.push(`Linha ${indice + 2}: dados inválidos.`);
      return;
    }
    const dados = item as Partial<DadosImportacao>;
    const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
    const categoria = typeof dados.categoria === "string" ? dados.categoria.trim() : "";
    const unidadeMedida = typeof dados.unidade_medida === "string" ? dados.unidade_medida.trim() : "";
    const fabricante = typeof dados.fabricante === "string" ? dados.fabricante.trim() : "";
    const valorTexto = typeof dados.valor === "string" ? dados.valor : "";
    const valor = valorImportado(valorTexto);

    if (!nome || !categoria || !unidadeMedida || !valorTexto.trim() || !Number.isFinite(valor) || valor < 0) {
      erros.push(`Linha ${indice + 2}: produto, categoria, unidade e valor precisam estar preenchidos corretamente.`);
      return;
    }
    if (nome.length > 200 || categoria.length > 100 || unidadeMedida.length > 50 || fabricante.length > 200) {
      erros.push(`Linha ${indice + 2}: um dos campos de texto excede o tamanho permitido.`);
      return;
    }
    registros.push({
      nome,
      categoria,
      unidade_medida: unidadeMedida,
      valor,
      fabricante: fabricante || null,
    });
  });

  if (erros.length > 0) {
    const restantes = erros.length > 10 ? ` E mais ${erros.length - 10} erro(s).` : "";
    return { erro: `${erros.slice(0, 10).join(" ")}${restantes} Nenhum produto foi importado.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").insert(registros);
  if (error) {
    console.error("Falha ao importar produtos no Supabase:", { code: error.code, message: error.message });
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { erro: "A tabela de produtos não está configurada. Execute supabase/produtos.sql no SQL Editor do Supabase." };
    }
    if (error.code === "42501") {
      return { erro: "O Supabase não permitiu importar. Verifique as permissões da migração supabase/produtos.sql." };
    }
    return { erro: "Não foi possível importar os produtos. Nenhum produto foi cadastrado; verifique a planilha e tente novamente." };
  }

  revalidatePath("/produtos");
  return { mensagem: `${registros.length} produto(s) importado(s) com sucesso.` };
}

export async function excluirProduto(formData: FormData) {
  const perfil = await getPerfil();
  if (perfil.perfil !== "admin") redirect("/produtos?erro=permissao");

  const id = num(formData, "id");
  if (id === null || id <= 0) redirect("/produtos?erro=produto_excluir");

  const supabase = await createClient();
  const { data, error: consultaErro } = await supabase
    .from("produtos")
    .select("imagem_path")
    .eq("id", id)
    .maybeSingle();
  if (consultaErro || !data) redirect("/produtos?erro=produto_excluir");

  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) redirect("/produtos?erro=vinculos");

  revalidatePath("/produtos");
  if (data.imagem_path && !(await removerImagem(supabase, data.imagem_path))) {
    redirect("/produtos?erro=produto_excluido_imagem");
  }
  redirect("/produtos?ok=excluido");
}
