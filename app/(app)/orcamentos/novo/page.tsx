import { createClient } from "@/lib/supabase/server";
import OrcamentoForm from "../OrcamentoForm";

export default async function NovoOrcamentoPage() {
  const supabase = await createClient();
  const { data: empresas, error } = await supabase
    .from("empresas")
    .select("id, nome, nome_fantasia");
  const opcoes = (empresas ?? []).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <div className="topo">
        <h1>Orçamentos</h1>
      </div>
      <OrcamentoForm empresas={opcoes} erro={error ? "empresas" : undefined} />
    </>
  );
}
