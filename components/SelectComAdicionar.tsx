"use client";

import { useState } from "react";

type Opcao = { id: number; nome: string };

// Lista de seleção com botão "+" para cadastrar um item novo ali mesmo.
// Se o "+" estiver aberto, o texto digitado vai no campo `novoName` e o servidor cria o item.
export default function SelectComAdicionar({
  name,
  novoName,
  opcoes,
  valorInicial,
  obrigatorio,
}: {
  name: string;
  novoName: string;
  opcoes: Opcao[];
  valorInicial?: number | null;
  obrigatorio?: boolean;
}) {
  const [novo, setNovo] = useState(false);
  return (
    <div className="sel-add">
      {novo ? (
        <input name={novoName} placeholder="Nome do novo item" required autoFocus maxLength={120} />
      ) : (
        <select name={name} defaultValue={valorInicial ? String(valorInicial) : ""} required={obrigatorio}>
          <option value="">Selecione…</option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="btn-mais"
        onClick={() => setNovo(!novo)}
        title={novo ? "Voltar para a lista" : "Cadastrar novo item"}
        aria-label={novo ? "Voltar para a lista" : "Cadastrar novo item"}
      >
        {novo ? "×" : "+"}
      </button>
    </div>
  );
}
