import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Aviso from "@/components/Aviso";

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [eq, emp] = await Promise.all([
    supabase.from("equipamentos").select("id", { count: "exact", head: true }),
    supabase.from("empresas").select("id", { count: "exact", head: true }),
  ]);

  return (
    <>
      <div className="topo">
        <h1>Painel · OS</h1>
      </div>
      <Aviso codigo={erro} />
      <div className="kpis">
        <div className="card kpi">Equipamentos<b>{eq.count ?? 0}</b></div>
        <div className="card kpi">Empresas e clientes<b>{emp.count ?? 0}</b></div>
      </div>
      <div className="topo">
        <Link className="btn" href="/equipamentos/novo">+ Novo equipamento</Link>
        <Link className="btn" href="/empresas/novo">+ Nova empresa</Link>
      </div>
      <div className="card">
        <b>Próximas etapas do módulo OS</b>
        <p style={{ margin: "6px 0 0" }}>
          Ordens de serviço (abertura, andamento e finalização), planos de manutenção e certificados de calibração
          serão adicionados sobre estes cadastros.
        </p>
      </div>
    </>
  );
}
