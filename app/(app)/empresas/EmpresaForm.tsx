import Link from "next/link";
import Campo from "@/components/Campo";
import Tabs from "@/components/Tabs";
import Aviso from "@/components/Aviso";
import { TIPOS_EMPRESA, UFS } from "@/lib/constants";
import { salvarEmpresa } from "./actions";

export default function EmpresaForm({
  empresa,
  outras,
  erro,
}: {
  empresa?: any;
  outras: { id: number; nome: string }[];
  erro?: string;
}) {
  const e = empresa ?? {};
  return (
    <form action={salvarEmpresa} className="form-card">
      <h2>Cadastro de empresas</h2>
      <Aviso codigo={erro} />
      {e.id ? <input type="hidden" name="id" value={e.id} /> : null}

      <div className="grid2">
        <Campo label="Nome" obrigatorio>
          <input name="nome" defaultValue={e.nome ?? ""} required maxLength={200} />
        </Campo>
        <Campo label="Nome fantasia">
          <input name="nome_fantasia" defaultValue={e.nome_fantasia ?? ""} maxLength={200} />
        </Campo>
        <Campo label="Tipo" obrigatorio>
          <select name="tipo" defaultValue={e.tipo ?? ""} required>
            <option value="">Selecione…</option>
            {TIPOS_EMPRESA.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Superior">
          <select name="superior_id" defaultValue={e.superior_id ? String(e.superior_id) : ""}>
            <option value="">Nenhuma</option>
            {outras
              .filter((o) => o.id !== e.id)
              .map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
          </select>
        </Campo>
        <Campo label="CPF/CNPJ">
          <input name="cpf_cnpj" defaultValue={e.cpf_cnpj ?? ""} inputMode="numeric" maxLength={20} />
        </Campo>
      </div>

      <Tabs
        labels={["Endereço", "Contato", "Observações"]}
        panels={[
          <>
            <Campo label="CEP"><input name="cep" defaultValue={e.cep ?? ""} maxLength={9} /></Campo>
            <Campo label="Rua"><input name="rua" defaultValue={e.rua ?? ""} /></Campo>
            <Campo label="Número"><input name="numero" defaultValue={e.numero ?? ""} maxLength={20} /></Campo>
            <Campo label="Complemento"><input name="complemento" defaultValue={e.complemento ?? ""} /></Campo>
            <Campo label="Bairro"><input name="bairro" defaultValue={e.bairro ?? ""} /></Campo>
            <Campo label="Cidade"><input name="cidade" defaultValue={e.cidade ?? ""} /></Campo>
            <Campo label="Estado">
              <select name="estado" defaultValue={e.estado ?? ""}>
                <option value="">Selecione…</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Campo>
          </>,
          <>
            <Campo label="Contato"><input name="contato" defaultValue={e.contato ?? ""} /></Campo>
            <Campo label="Telefone"><input name="telefone" defaultValue={e.telefone ?? ""} inputMode="tel" /></Campo>
            <Campo label="E-mail"><input name="email" type="email" defaultValue={e.email ?? ""} /></Campo>
          </>,
          <Campo label="Observações" larga>
            <textarea name="observacoes" defaultValue={e.observacoes ?? ""} />
          </Campo>,
        ]}
      />

      <div className="rodape-form">
        <button className="btn" type="submit">Salvar</button>
        <Link className="btn cinza" href="/empresas">Cancelar</Link>
      </div>
    </form>
  );
}
