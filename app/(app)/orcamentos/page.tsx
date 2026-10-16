import Link from "next/link";
import Aviso from "@/components/Aviso";
import DeleteButton from "@/components/DeleteButton";
import { PAGE_SIZE } from "@/lib/constants";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { excluirOrcamento } from "./actions";

function moeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tipoLegivel(tipo: string) {
  if (tipo === "produtos") return "Produtos";
  if (tipo === "servicos") return "Serviços";
  return "Produtos/Serviços";
}

function nomeSolicitante(snapshot: unknown) {
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) return "-";
  const registro = snapshot as Record<string, unknown>;
  const nome = typeof registro.nome === "string" ? registro.nome : "";
  const nomeFantasia = typeof registro.nome_fantasia === "string" ? registro.nome_fantasia : "";
  return nomeFantasia ? `${nome} (${nomeFantasia})` : nome || "-";
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; ok?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perfil = await getPerfil();
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("orcamentos")
    .select("id, tipo, criado_em, total, status, solicitante_snapshot, criado_por", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const orcamentos = data ?? [];
  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <div className="topo">
        <h1>Orçamentos</h1>
        <Link className="btn" href="/orcamentos/novo">+ Novo orçamento</Link>
      </div>

      <Aviso codigo={sp.ok ?? sp.erro} />
      {error && (
        <div className="aviso erro" role="alert">
          Não foi possível carregar os orçamentos. Verifique se supabase/orcamentos.sql foi executado.
        </div>
      )}

      <section className="painel-tabela orcamento-tabela">
        <header>Orçamentos finalizados</header>
        <div className="barra">
          <span>{count ?? 0} orçamento(s)</span>
          {totalPaginas > 1 && (
            <nav className="pag" aria-label="Paginação">
              {page > 1 && <Link href={`/orcamentos?page=${page - 1}`} aria-label="Página anterior">‹</Link>}
              <span className="atual" aria-current="page">{page} / {totalPaginas}</span>
              {page < totalPaginas && <Link href={`/orcamentos?page=${page + 1}`} aria-label="Próxima página">›</Link>}
            </nav>
          )}
        </div>
        <div className="wrap">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Tipo</th>
                <th>Solicitante</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Prévia</th>
                <th>PDF</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((item) => {
                return (
                  <tr key={item.id}>
                    <td>{String(item.id).padStart(6, "0")}</td>
                    <td>{tipoLegivel(item.tipo)}</td>
                    <td>{nomeSolicitante(item.solicitante_snapshot)}</td>
                    <td>{new Date(item.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                    <td>{moeda(item.total)}</td>
                    <td><span className="tag ok">Finalizado</span></td>
                    <td>
                      <Link className="btn mini" href={`/orcamentos/${item.id}`}>
                        Visualizar
                      </Link>
                    </td>
                    <td><Link className="btn mini" href={`/orcamentos/${item.id}/pdf?download=1`}>Baixar PDF</Link></td>
                    <td className="acoes">
                      {perfil.ativo && (perfil.perfil === "admin" || item.criado_por === perfil.user.id) && (
                        <Link className="btn mini sec" href={`/orcamentos/${item.id}/editar`}>Editar</Link>
                      )}
                      {perfil.ativo && perfil.perfil === "admin" && (
                        <DeleteButton
                          action={excluirOrcamento}
                          id={item.id}
                          nome={`orçamento ${String(item.id).padStart(6, "0")}`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orcamentos.length === 0 && !error && <div className="vazio">Nenhum orçamento finalizado.</div>}
        </div>
      </section>
    </>
  );
}
