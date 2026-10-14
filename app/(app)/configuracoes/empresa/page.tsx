import { redirect } from "next/navigation";
import Aviso from "@/components/Aviso";
import Campo from "@/components/Campo";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { salvarDadosEmpresa } from "./actions";

export default async function DadosEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const perfil = await getPerfil();
  if (perfil.perfil !== "admin") redirect("/?erro=permissao");

  const { erro, ok } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracoes_empresa")
    .select("razao_social, nome_fantasia, cnpj, rua, numero, complemento, bairro, cidade, estado, cep, telefone, email, site")
    .eq("id", true)
    .maybeSingle();

  return (
    <>
      <div className="topo">
        <h1>Dados da empresa</h1>
      </div>
      <div className="form-card">
        <h2>Empresa emissora do orçamento</h2>
        {ok && <Aviso codigo={ok} />}
        {erro && <Aviso codigo={erro} />}
        {error && (
          <div className="aviso erro" role="alert">
            Execute o arquivo supabase/orcamentos.sql no SQL Editor do Supabase antes de configurar os dados.
          </div>
        )}
        <p className="sub">Esses dados e o logo WMED serão impressos nos PDFs dos orçamentos.</p>
        <form action={salvarDadosEmpresa}>
          <div className="grid2">
            <Campo label="Razão social" obrigatorio>
              <input name="razao_social" defaultValue={data?.razao_social ?? ""} required maxLength={200} />
            </Campo>
            <Campo label="Nome fantasia">
              <input name="nome_fantasia" defaultValue={data?.nome_fantasia ?? ""} maxLength={200} />
            </Campo>
            <Campo label="CNPJ" obrigatorio>
              <input name="cnpj" defaultValue={data?.cnpj ?? ""} required maxLength={20} />
            </Campo>
            <Campo label="CEP">
              <input name="cep" defaultValue={data?.cep ?? ""} maxLength={9} />
            </Campo>
            <Campo label="Endereço" obrigatorio>
              <input name="rua" defaultValue={data?.rua ?? ""} required maxLength={200} />
            </Campo>
            <Campo label="Número">
              <input name="numero" defaultValue={data?.numero ?? ""} maxLength={20} />
            </Campo>
            <Campo label="Complemento">
              <input name="complemento" defaultValue={data?.complemento ?? ""} maxLength={100} />
            </Campo>
            <Campo label="Bairro">
              <input name="bairro" defaultValue={data?.bairro ?? ""} maxLength={100} />
            </Campo>
            <Campo label="Cidade" obrigatorio>
              <input name="cidade" defaultValue={data?.cidade ?? ""} required maxLength={100} />
            </Campo>
            <Campo label="Estado (UF)" obrigatorio>
              <input name="estado" defaultValue={data?.estado ?? ""} required maxLength={2} />
            </Campo>
            <Campo label="Telefone" obrigatorio>
              <input name="telefone" type="tel" defaultValue={data?.telefone ?? ""} required maxLength={30} />
            </Campo>
            <Campo label="E-mail" obrigatorio>
              <input name="email" type="email" defaultValue={data?.email ?? ""} required maxLength={200} />
            </Campo>
            <Campo label="Site">
              <input name="site" type="url" defaultValue={data?.site ?? ""} maxLength={200} />
            </Campo>
          </div>
          <div className="rodape-form">
            <button className="btn" type="submit" disabled={Boolean(error)}>Salvar dados da empresa</button>
          </div>
        </form>
      </div>
    </>
  );
}
