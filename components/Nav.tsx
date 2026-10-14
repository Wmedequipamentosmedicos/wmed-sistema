"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", nome: "Painel", exato: true },
  { href: "/equipamentos", nome: "Equipamentos" },
  { href: "/empresas", nome: "Empresas e clientes" },
  { href: "/produtos", nome: "Produtos" },
  { href: "/orcamentos", nome: "Orçamentos" },
];

export default function Nav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const atual = path ?? "";
  const ativo = (href: string, exato?: boolean) => (exato ? atual === href : atual.startsWith(href));
  return (
    <nav>
      <div className="grupo">OS · Ordens de serviço</div>
      {ITENS.map((i) => (
        <Link key={i.href} href={i.href} className={ativo(i.href, i.exato) ? "on" : ""}>
          {i.nome}
        </Link>
      ))}
      {admin && (
        <>
          <div className="grupo">Administração</div>
          <Link href="/configuracoes/empresa" className={ativo("/configuracoes/empresa") ? "on" : ""}>
            Dados da empresa
          </Link>
          <Link href="/usuarios" className={ativo("/usuarios") ? "on" : ""}>
            Usuários
          </Link>
        </>
      )}
    </nav>
  );
}
