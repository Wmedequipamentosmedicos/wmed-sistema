import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProdutoForm from "../ProdutoForm";

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const idNum = Number(id);
  if (!Number.isSafeInteger(idNum) || idNum <= 0) notFound();

  const supabase = await createClient();
  const { data: produto } = await supabase.from("produtos").select("*").eq("id", idNum).maybeSingle();
  if (!produto) notFound();

  let imagemUrl: string | undefined;
  let erroImagem: string | undefined;
  if (produto.imagem_path) {
    const { data, error } = await supabase.storage.from("produtos").createSignedUrl(produto.imagem_path, 3600);
    if (error) erroImagem = "produto_imagem_carregar";
    else imagemUrl = data.signedUrl;
  }

  return <ProdutoForm produto={produto} imagemUrl={imagemUrl} erro={erro ?? erroImagem} />;
}
