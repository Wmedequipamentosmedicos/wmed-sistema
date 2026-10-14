import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import Aviso from "@/components/Aviso";
import SearchBox from "@/components/SearchBox";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import { IconEditar } from "@/components/Icons";
import { excluirProduto } from "./actions";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; ok?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const supabase = await createClient();

  let consulta = supabase
    .from("produtos")
    .select("id, codigo_interno, nome, categoria, unidade_medida, valor, fabricante, imagem_path", { count: "exact" })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    const campos = ["nome", "categoria", "unidade_medida", "fabricante"];
    if (/^\d+$/.test(q)) campos.push(`codigo_interno.eq.${q}`);
    consulta = consulta.or(
      campos.map((campo) => campo.includes(".eq.") ? campo : `${campo}.ilike.%${q}%`).join(",")
    );
  }

  const { data, count, error } = await consulta;
  const produtos = data ?? [];
  let falhaImagem = false;
  const imagens: Array<readonly [number, string | null]> = await Promise.all(
    produtos.map(async (produto) => {
      if (!produto.imagem_path) return [produto.id, null] as const;
      const { data: imagem, error: imagemErro } = await supabase.storage
        .from("produtos")
        .createSignedUrl(produto.imagem_path, 3600);
      if (imagemErro) falhaImagem = true;
      return [produto.id, imagemErro ? null : imagem.signedUrl] as const;
    })
  );
  const urlsImagem = new Map(imagens);

  return (
    <>
      <div className="topo">
        <h1>Produtos</h1>
        <div className="acoes-topo">
          <Link className="btn sec" href="/produtos/importar">Importar planilha</Link>
          <Link className="btn" href="/produtos/novo">+ Adicionar produto</Link>
        </div>
      </div>

      <Aviso codigo={sp.ok ?? sp.erro} />
      {error && (
        <div className="aviso erro" role="alert">
          Não foi possível carregar os produtos. Verifique se a migração de produtos foi aplicada no Supabase.
        </div>
      )}
      {falhaImagem && (
        <div className="aviso erro" role="alert">
          Não foi possível carregar algumas imagens dos produtos.
        </div>
      )}

      <section className="painel-tabela">
        <header>Produtos cadastrados</header>
        <div className="barra">
          <SearchBox q={q} />
          <Pagination base="/produtos" page={page} total={count ?? 0} q={q} />
        </div>
        <div className="wrap">
          <table>
            <thead>
              <tr>
                <th></th><th>Imagem</th><th>Código interno</th><th>Produto</th><th>Categoria</th>
                <th>Unidade de medida</th><th>Valor</th><th>Fabricante</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td className="acoes">
                    <Link className="icon-btn" href={`/produtos/${produto.id}`} title="Abrir e editar" aria-label={`Editar ${produto.nome}`}>
                      <IconEditar />
                    </Link>
                    <DeleteButton action={excluirProduto} id={produto.id} nome={produto.nome} />
                  </td>
                  <td>
                    {urlsImagem.get(produto.id)
                      ? <img className="produto-miniatura" src={urlsImagem.get(produto.id)!} alt={`Produto ${produto.nome}`} />
                      : "-"}
                  </td>
                  <td>{produto.codigo_interno}</td>
                  <td>{produto.nome}</td>
                  <td>{produto.categoria}</td>
                  <td>{produto.unidade_medida}</td>
                  <td>{Number(produto.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{produto.fabricante ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {produtos.length === 0 && !error && <div className="vazio">Nenhum produto encontrado.</div>}
        </div>
      </section>
    </>
  );
}
