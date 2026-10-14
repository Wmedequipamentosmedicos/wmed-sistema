"use client";

import { useMemo, useState } from "react";

export type SearchDialogItem = {
  id: number;
  label: string;
  detail?: string;
};

export default function SearchDialog({
  title,
  searchLabel,
  placeholder,
  items,
  selectedId,
  onSelect,
  disabled = false,
}: {
  title: string;
  searchLabel: string;
  placeholder: string;
  items: SearchDialogItem[];
  selectedId: number | null;
  onSelect: (item: SearchDialogItem) => void;
  disabled?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const selecionado = items.find((item) => item.id === selectedId);
  const resultados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return items;
    return items.filter((item) => `${item.label} ${item.detail ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca, items]);

  function fechar() {
    setAberta(false);
    setBusca("");
  }

  return (
    <>
      <button className="btn sec busca-selecao-trigger" type="button" disabled={disabled} onClick={() => setAberta(true)}>
        {selecionado ? selecionado.label : placeholder}
      </button>
      {aberta && (
        <div
          className="busca-dialog-backdrop"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) fechar();
          }}
          onKeyDown={(evento) => {
            if (evento.key === "Escape") fechar();
          }}
        >
          <section className="busca-dialog" role="dialog" aria-modal="true" aria-label={title}>
            <header className="busca-dialog-header">
              <h2>{title}</h2>
              <button type="button" className="btn cinza mini" onClick={fechar} aria-label="Fechar busca">Fechar</button>
            </header>
            <label className="campo busca-dialog-campo">
              <span>{searchLabel}</span>
              <input
                type="search"
                value={busca}
                autoFocus
                placeholder="Digite para filtrar"
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </label>
            <div className="busca-dialog-resultados" role="listbox" aria-label={title}>
              {resultados.map((item) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === selectedId}
                  className="busca-dialog-item"
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    fechar();
                  }}
                >
                  <span>{item.label}</span>
                  {item.detail && <small>{item.detail}</small>}
                </button>
              ))}
              {resultados.length === 0 && <p className="vazio">Nenhum resultado para essa busca.</p>}
            </div>
            <p className="busca-dialog-contagem">{resultados.length} de {items.length} resultado(s)</p>
          </section>
        </div>
      )}
    </>
  );
}
