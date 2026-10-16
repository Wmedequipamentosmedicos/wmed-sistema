import Link from "next/link";
import { notFound } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function VisualizarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id: idTexto }, perfil] = await Promise.all([params, getPerfil()]);
  const id = Number(idTexto);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const supabase = await createClient();
  const { data: orcamento, error } = await supabase
    .from("orcamentos")
    .select("id, criado_por")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Falha ao carregar orçamento para visualização:", error.message);
    notFound();
  }
  if (!orcamento) notFound();

  const podeEditar = perfil.ativo && (perfil.perfil === "admin" || orcamento.criado_por === perfil.user.id);
  const numero = String(id).padStart(6, "0");

  return (
    <>
      <div className="topo">
        <h1>Prévia do orçamento {numero}</h1>
        <div className="orcamento-preview-actions">
          <Link className="btn" href={`/orcamentos/${id}/pdf?download=1`}>Baixar PDF</Link>
          {podeEditar && <Link className="btn sec" href={`/orcamentos/${id}/editar`}>Editar orçamento</Link>}
          <Link className="btn cinza" href="/orcamentos">Voltar</Link>
        </div>
      </div>
      <iframe
        className="orcamento-preview-frame"
        src={`/orcamentos/${id}/pdf`}
        title={`Prévia do orçamento ${numero}`}
      />
    </>
  );
}
