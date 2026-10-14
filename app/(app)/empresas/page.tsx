import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import Aviso from "@/components/Aviso";
import SearchBox from "@/components/SearchBox";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import { IconEditar } from "@/components/Icons";
import { excluirEmpresa } from "./actions";

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; ok?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();
  let consulta = supabase
    .from("empresas")
    .select("id, nome, nome_fantasia, cidade, estado, tipo, email, contato", { count: "exact" })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    consulta = consulta.or(
      `nome.ilike.%${q}%,nome_fantasia.ilike.%${q}%,cidade.ilike.%${q}%,cpf_cnpj.ilike.%${q}%,contato.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const { data, count, error } = await consulta;
  const linhas = data ?? [];

  return (
    <>
      <div className="topo">
        <h1>Empresas e clientes</h1>
        <div className="acoes-topo">
          <Link className="btn sec" href="/empresas/importar">Importar planilha</Link>
          <Link className="btn" href="/empresas/novo">+ Adicionar</Link>
        </div>
      </div>

      <Aviso codigo={sp.ok ?? sp.erro} />
      {error && <div className="aviso erro">Não foi possível carregar a lista.</div>}

      <section className="painel-tabela">
        <header>Empresas e clientes cadastrados</header>
        <div className="barra">
          <SearchBox q={q} />
          <Pagination base="/empresas" page={page} total={count ?? 0} q={q} />
        </div>
        <div className="wrap">
          <table>
            <thead>
              <tr>
                <th></th><th>#</th><th>Nome</th><th>Nome fantasia</th><th>Cidade</th>
                <th>Estado</th><th>Tipo</th><th>E-mail</th><th>Contato</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r: any) => (
                <tr key={r.id}>
                  <td className="acoes">
                    <Link className="icon-btn" href={`/empresas/${r.id}`} title="Abrir e editar" aria-label={`Editar ${r.nome}`}>
                      <IconEditar />
                    </Link>
                    <DeleteButton action={excluirEmpresa} id={r.id} nome={r.nome} />
                  </td>
                  <td>{r.id}</td>
                  <td>{r.nome}</td>
                  <td>{r.nome_fantasia}</td>
                  <td>{r.cidade}</td>
                  <td>{r.estado}</td>
                  <td>{r.tipo}</td>
                  <td>{r.email}</td>
                  <td>{r.contato}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length === 0 && <div className="vazio">Nenhuma empresa encontrada.</div>}
        </div>
      </section>
    </>
  );
}
