import Link from "next/link";
import { PAGE_SIZE } from "@/lib/constants";

export default function Pagination({
  base,
  page,
  total,
  q,
}: {
  base: string;
  page: number;
  total: number;
  q?: string;
}) {
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (paginas <= 1) return <span className="sub" style={{ margin: 0 }}>{total} registro(s)</span>;

  const href = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("page", String(n));
    return `${base}?${p.toString()}`;
  };

  const inicio = Math.max(1, Math.min(page - 2, paginas - 4));
  const fim = Math.min(paginas, inicio + 4);
  const numeros: number[] = [];
  for (let n = inicio; n <= fim; n++) numeros.push(n);

  return (
    <nav className="pag" aria-label="Paginação">
      {page > 1 && <Link href={href(page - 1)} aria-label="Página anterior">‹</Link>}
      {numeros.map((n) =>
        n === page ? (
          <span key={n} className="atual" aria-current="page">{n}</span>
        ) : (
          <Link key={n} href={href(n)}>{n}</Link>
        )
      )}
      {page < paginas && <Link href={href(page + 1)} aria-label="Próxima página">›</Link>}
    </nav>
  );
}
