import Link from "next/link";

type Empresa = { id: number; nome: string; nome_fantasia: string | null };

export default function OrcamentoForm({
  empresas,
  erro,
}: {
  empresas: Empresa[];
  erro?: string;
}) {
  return (
    <div className="form-card orcamento-card">
      <div className="orcamento-header">
        <div className="orcamento-brand">
          <span className="marca-ponto">W</span>
          <span>Orçamento de peças</span>
        </div>
      </div>

      <div className="orcamento-panel">
        {erro && (
          <div className="aviso erro" role="alert">
            Não foi possível carregar as empresas e clientes cadastrados.
          </div>
        )}
        <label className="campo">
          <span>Solicitante</span>
          <select name="solicitante_id" defaultValue="" required disabled={Boolean(erro)}>
            <option value="" disabled>
              {empresas.length ? "Selecione uma empresa ou cliente" : "Nenhuma empresa ou cliente cadastrado"}
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome_fantasia ? `${empresa.nome} (${empresa.nome_fantasia})` : empresa.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rodape-form orcamento-rodape">
        <Link className="btn cinza" href="/orcamentos">Cancelar</Link>
      </div>
    </div>
  );
}
