import Link from "next/link";

const orcamentos = [
  { numero: "5477", tipo: "Peças", solicitante: "Hospital Nilo M. de C. A. Santos", data: "08/10/2026", validade: "08/11/2026", valor: "R$ 5.200,00", status: "Pendente" },
  { numero: "5476", tipo: "Peças", solicitante: "AME Sorocaba - Fundação do ABC", data: "08/10/2026", validade: "08/11/2026", valor: "R$ 4.100,00", status: "Pendente" },
  { numero: "5475", tipo: "Serviços", solicitante: "Banco do OIhos da Sorocaba", data: "08/10/2026", validade: "08/11/2026", valor: "R$ 2.750,00", status: "Pendente" },
  { numero: "5474", tipo: "Serviços", solicitante: "Unimed de Itapetininga", data: "08/10/2026", validade: "08/11/2026", valor: "R$ 4.850,00", status: "Pendente" },
  { numero: "5473", tipo: "Serviços", solicitante: "Banco do OIhos da Sorocaba", data: "05/10/2026", validade: "04/11/2026", valor: "R$ 4.000,00", status: "Aprovado" },
];

export default function OrcamentosPage() {
  return (
    <>
      <div className="topo">
        <h1>Orçamentos</h1>
        <Link className="btn" href="/orcamentos/novo">+ Novo orçamento</Link>
      </div>

      <section className="orcamento-dashboard">
        <div className="orcamento-statuses">
          <button type="button" className="status-pill on">Pendentes</button>
          <button type="button" className="status-pill">Aprovados</button>
          <button type="button" className="status-pill">Em curso</button>
          <button type="button" className="status-pill">Finalizados</button>
          <button type="button" className="status-pill">Cancelados</button>
        </div>

        <div className="painel-tabela orcamento-tabela">
          <header>Orçamentos pendentes</header>
          <div className="barra">
            <input className="busca-input" type="search" placeholder="Pesquisar" aria-label="Pesquisar orçamento" />
            <button type="button" className="btn mini">+ Novo</button>
          </div>

          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Solicitante</th>
                  <th>Data</th>
                  <th>Validade</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((item) => (
                  <tr key={item.numero}>
                    <td>{item.numero}</td>
                    <td>{item.tipo}</td>
                    <td>{item.solicitante}</td>
                    <td>{item.data}</td>
                    <td>{item.validade}</td>
                    <td>{item.valor}</td>
                    <td>
                      <span className={`tag ${item.status === "Aprovado" ? "ok" : "bad"}`}>{item.status}</span>
                    </td>
                    <td className="acoes">
                      <button type="button" className="btn mini ok-btn">Aprovar</button>
                      <button type="button" className="btn mini danger-btn">Reprovar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
