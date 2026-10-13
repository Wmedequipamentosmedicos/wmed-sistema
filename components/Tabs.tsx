"use client";

import { useState, type ReactNode } from "react";

// Abas dentro de um formulário. Todos os campos continuam no formulário, mesmo nas abas ocultas.
export default function Tabs({ labels, panels }: { labels: string[]; panels: ReactNode[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="tabs-bar" role="tablist">
        {labels.map((l, k) => (
          <button type="button" key={l} role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onClick={() => setI(k)}>
            {l}
          </button>
        ))}
      </div>
      {panels.map((p, k) => (
        <div key={k} className="grid2" hidden={k !== i}>
          {p}
        </div>
      ))}
    </div>
  );
}
