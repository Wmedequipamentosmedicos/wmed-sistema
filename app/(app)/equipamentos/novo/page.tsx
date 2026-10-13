import { createClient } from "@/lib/supabase/server";
import EquipamentoForm from "../EquipamentoForm";

export default async function NovoEquipamento({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const [tipos, quadros, empresas] = await Promise.all([
    supabase.from("tipos_equipamento").select("id, nome").order("nome"),
    supabase.from("quadros_trabalho").select("id, nome").order("nome"),
    supabase.from("empresas").select("id, nome").order("nome").limit(1000),
  ]);
  return (
    <EquipamentoForm
      tipos={tipos.data ?? []}
      quadros={quadros.data ?? []}
      empresas={empresas.data ?? []}
      erro={erro}
    />
  );
}
