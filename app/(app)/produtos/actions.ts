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
    if (error || !data) redirect("/produtos?erro=produto_salvar");
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
    if (novaImagem) await removerImagem(supabase, novaImagem);
    redirect(`${voltar}?erro=produto_salvar`);
  }

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${id ?? ""}`);

  if (novaImagem && imagemAnterior && !(await removerImagem(supabase, imagemAnterior))) {
    redirect(`/produtos?erro=produto_imagem_limpeza`);
  }
  redirect("/produtos?ok=ok");
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
