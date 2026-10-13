"use client";

import { IconExcluir } from "./Icons";

export default function DeleteButton({
  action,
  id,
  nome,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: number;
  nome: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="icon-btn perigo" type="submit" title="Excluir" aria-label={`Excluir ${nome}`}>
        <IconExcluir />
      </button>
    </form>
  );
}
