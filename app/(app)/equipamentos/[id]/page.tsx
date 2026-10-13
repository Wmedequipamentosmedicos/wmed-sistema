import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EquipamentoForm from "../EquipamentoForm";

export default async function EditarEquipamento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) notFound();

  const supabase = await createClient();
  const [equip, tipos, quadros, empresas] = await Promise.all([
    supabase.from("equipamentos").select("*").eq("id", idNum).maybeSingle(),
    supabase.from("tipos_equipamento").select("id, nome").order("nome"),
    supabase.from("quadros_trabalho").select("id, nome").order("nome"),
    supabase.from("empresas").select("id, nome").order("nome").limit(1000),
  ]);
  if (!equip.data) notFound();

  return (
    <EquipamentoForm
      equipamento={equip.data}
      tipos={tipos.data ?? []}
      quadros={quadros.data ?? []}
      empresas={empresas.data ?? []}
      erro={erro}
    />
  );
}
