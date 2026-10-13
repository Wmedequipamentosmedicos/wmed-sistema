import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmpresaForm from "../EmpresaForm";

export default async function EditarEmpresa({
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
  const [{ data: empresa }, { data: outras }] = await Promise.all([
    supabase.from("empresas").select("*").eq("id", idNum).maybeSingle(),
    supabase.from("empresas").select("id, nome").order("nome").limit(1000),
  ]);
  if (!empresa) notFound();

  return <EmpresaForm empresa={empresa} outras={outras ?? []} erro={erro} />;
}
