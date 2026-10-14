import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import Aviso from "@/components/Aviso";
import SearchBox from "@/components/SearchBox";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import { IconEditar } from "@/components/Icons";
import { excluirEquipamento } from "./actions";

export default async function EquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; ok?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();
  let consulta = supabase
    .from("equipamentos_lista")
    .select(
      "id, tipo_nome, proprietario_nome, fabricante, modelo, estado, identificacao_tag, patrimonio, numero_serie, quadro_nome",
      { count: "exact" }
    )
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    consulta = consulta.or(
      [
        "tipo_nome", "proprietario_nome", "fabricante", "modelo",
        "identificacao_tag", "patrimonio", "numero_serie", "quadro_nome",
      ]
        .map((c) => `${c}.ilike.%${q}%`)
        .join(",")
    );
  }

  const { data, count, error } = await consulta;
  const linhas = data ?? [];

  return (
    <>
      <div className="topo">
        <h1>Equipamentos</h1>
        <div className="acoes-topo">
          <Link className="btn sec" href="/equipamentos/importar">Importar planilha</Link>
          <Link className="btn" href="/equipamentos/novo">+ Adicionar</Link>
        </div>
      </div>

      <Aviso codigo={sp.ok ?? sp.erro} />
      {error && <div className="aviso erro">Não foi possível carregar a lista.</div>}

      <section className="painel-tabela">
        <header>Equipamentos cadastrados</header>
        <div className="barra">
          <SearchBox q={q} />
          <Pagination base="/equipamentos" page={page} total={count ?? 0} q={q} />
        </div>
        <div className="wrap">
          <table>
            <thead>
              <tr>
                <th></th><th>ID</th><th>Tipo</th><th>Proprietário</th><th>Fabricante</th><th>Modelo</th>
                <th>Estado</th><th>Identificação</th><th>Patrimônio</th><th>Número de série</th><th>Quadro de trabalho</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r: any) => (
                <tr key={r.id}>
                  <td className="acoes">
                    <Link className="icon-btn" href={`/equipamentos/${r.id}`} title="Abrir e editar" aria-label={`Editar equipamento ${r.id}`}>
                      <IconEditar />
                    </Link>
                    <DeleteButton action={excluirEquipamento} id={r.id} nome={`${r.tipo_nome} #${r.id}`} />
                  </td>
                  <td>{r.id}</td>
                  <td>{r.tipo_nome}</td>
                  <td>{r.proprietario_nome}</td>
                  <td>{r.fabricante}</td>
                  <td>{r.modelo}</td>
                  <td>{r.estado}</td>
                  <td>{r.identificacao_tag}</td>
                  <td>{r.patrimonio}</td>
                  <td>{r.numero_serie}</td>
                  <td>{r.quadro_nome ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length === 0 && <div className="vazio">Nenhum equipamento encontrado.</div>}
        </div>
      </section>
    </>
  );
}
