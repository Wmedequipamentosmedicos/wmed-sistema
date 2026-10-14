"use client";

import Link from "next/link";

export default function OrcamentoForm() {
  return (
    <div className="form-card orcamento-card">
      <div className="orcamento-header">
        <div className="orcamento-brand">
          <span className="marca-ponto">W</span>
          <span>Orçamento de peças</span>
        </div>
      </div>

      <div className="orcamento-panel">
        <label className="campo">
          <span>Solicitante</span>
          <input defaultValue="" placeholder="Buscar solicitante" />
        </label>
      </div>

      <div className="rodape-form orcamento-rodape">
        <Link className="btn cinza" href="/orcamentos">Cancelar</Link>
      </div>
    </div>
  );
}
