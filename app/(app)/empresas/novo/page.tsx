import { createClient } from "@/lib/supabase/server";
import EmpresaForm from "../EmpresaForm";

export default async function NovaEmpresa({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("empresas").select("id, nome").order("nome").limit(1000);
  return <EmpresaForm outras={data ?? []} erro={erro} />;
}
