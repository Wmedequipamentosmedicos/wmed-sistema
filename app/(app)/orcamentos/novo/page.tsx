import { createClient } from "@/lib/supabase/server";
import OrcamentoForm from "../OrcamentoForm";

export default async function NovoOrcamentoPage() {
  const supabase = await createClient();
  const [empresasResult, produtosResult, servicosResult] = await Promise.all([
    supabase.from("empresas").select("id, nome, nome_fantasia"),
    supabase.from("produtos").select("id, codigo_interno, nome, unidade_medida, valor"),
    supabase.from("servicos").select("id, nome, valor"),
  ]);
  const empresas = empresasResult.data ?? [];
  const produtos = produtosResult.data ?? [];
  const servicos = servicosResult.data ?? [];
  empresas.sort((a, b) => a.nome.localeCompare(b.nome));
  produtos.sort((a, b) => a.nome.localeCompare(b.nome));
  servicos.sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <div className="topo">
        <h1>Orçamentos</h1>
      </div>
      <OrcamentoForm
        empresas={empresas}
        produtos={produtos}
        servicos={servicos}
        erroEmpresas={empresasResult.error ? "empresas" : undefined}
        erroProdutos={produtosResult.error ? "produtos" : undefined}
        erroServicos={servicosResult.error ? "servicos" : undefined}
      />
    </>
  );
}
