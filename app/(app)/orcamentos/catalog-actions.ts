"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfil, txt } from "@/lib/auth";

const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
const EXTENSOES_IMAGEM: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type ProdutoOrcamento = {
  id: number;
  codigo_interno: number;
  nome: string;
  unidade_medida: string;
  valor: number;
};

export type ServicoOrcamento = { id: number; nome: string; valor: number };
type Resultado<T> = { item: T } | { erro: string };

export async function criarProdutoNoOrcamento(formData: FormData): Promise<Resultado<ProdutoOrcamento>> {
  await getPerfil();

  const nome = txt(formData, "nome");
  const categoria = txt(formData, "categoria");
  const unidadeMedida = txt(formData, "unidade_medida");
  const fabricante = txt(formData, "fabricante");
  const valorTexto = txt(formData, "valor");
  const valor = valorTexto === null ? Number.NaN : Number(valorTexto.replace(",", "."));
  if (!nome || !categoria || !unidadeMedida || !Number.isFinite(valor) || valor < 0) {
    return { erro: "Preencha produto, categoria, unidade de medida e um valor válido." };
  }

  const imagem = formData.get("imagem");
  const temImagem = imagem instanceof File && imagem.size > 0;
  if (
    temImagem &&
    (imagem.size > TAMANHO_MAXIMO_IMAGEM || !(imagem.type in EXTENSOES_IMAGEM))
  ) {
    return { erro: "A imagem deve ser JPG, PNG, WebP ou GIF e ter até 5 MB." };
  }

  const supabase = await createClient();
  let imagemPath: string | null = null;
  if (temImagem && imagem instanceof File) {
    imagemPath = `${crypto.randomUUID()}.${EXTENSOES_IMAGEM[imagem.type]}`;
    const { error } = await supabase.storage.from("produtos").upload(imagemPath, imagem, {
      contentType: imagem.type,
      upsert: false,
    });
    if (error) {
      console.error("Falha ao enviar imagem do produto no orçamento:", { code: error.name, message: error.message });
      return { erro: "Não foi possível enviar a imagem. Verifique se o armazenamento de produtos está configurado." };
    }
  }

  const { data, error } = await supabase
    .from("produtos")
    .insert({
      nome,
      categoria,
      unidade_medida: unidadeMedida,
      valor,
      fabricante,
      imagem_path: imagemPath,
    })
    .select("id, codigo_interno, nome, unidade_medida, valor")
    .single();

  if (error || !data) {
    console.error("Falha ao cadastrar produto pelo orçamento:", { code: error?.code, message: error?.message });
    if (imagemPath) {
      const { error: limpezaErro } = await supabase.storage.from("produtos").remove([imagemPath]);
      if (limpezaErro) console.error("Falha ao remover imagem de produto não cadastrado:", limpezaErro.message);
    }
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return { erro: "A tabela de produtos não está configurada. Execute supabase/produtos.sql no Supabase." };
    }
    if (error?.code === "42501") {
      return { erro: "O Supabase não permitiu cadastrar o produto. Verifique as permissões de supabase/produtos.sql." };
    }
    return { erro: "Não foi possível cadastrar o produto." };
  }

  revalidatePath("/produtos");
  revalidatePath("/orcamentos/novo");
  return { item: data };
}

export async function criarServicoNoOrcamento(formData: FormData): Promise<Resultado<ServicoOrcamento>> {
  await getPerfil();

  const nome = txt(formData, "nome");
  const valorTexto = txt(formData, "valor");
  const valor = valorTexto === null ? Number.NaN : Number(valorTexto.replace(",", "."));
  if (!nome || !Number.isFinite(valor) || valor < 0) {
    return { erro: "Informe o nome do serviço e um valor válido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servicos")
    .insert({ nome, valor })
    .select("id, nome, valor")
    .single();

  if (error || !data) {
    console.error("Falha ao cadastrar serviço pelo orçamento:", { code: error?.code, message: error?.message });
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return { erro: "O catálogo de serviços não está configurado. Execute supabase/servicos.sql no Supabase." };
    }
    if (error?.code === "42501") {
      return { erro: "O Supabase não permitiu cadastrar o serviço. Verifique as permissões de supabase/servicos.sql." };
    }
    if (error?.code === "23505") return { erro: "Já existe um serviço com esse nome." };
    return { erro: "Não foi possível cadastrar o serviço." };
  }

  revalidatePath("/orcamentos/novo");
  return { item: data };
}
