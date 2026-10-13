import type { ReactNode } from "react";
import { getPerfil } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import Nav from "@/components/Nav";
import { PERFIS } from "@/lib/constants";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const p = await getPerfil();

  if (!p.ativo) {
    return (
      <main className="login">
        <div className="login-card">
          <img src="/logo-colorido.png" alt="Wmed®" />
          <h1>Acesso desativado</h1>
          <p>Seu usuário não tem acesso ao sistema. Fale com o administrador.</p>
          <form action={logout}>
            <button className="btn" type="submit">Sair</button>
          </form>
        </div>
      </main>
    );
  }

  const nomePerfil = PERFIS.find((x) => x.valor === p.perfil)?.nome ?? p.perfil;

  return (
    <div className="shell">
      <aside className="side">
        <img className="logo" src="/logo-branco.png" alt="Wmed®" />
        <Nav admin={p.perfil === "admin"} />
        <div className="user">
          {p.nome}
          <small>{nomePerfil}</small>
          <form action={logout}>
            <button className="btn mini sec" type="submit">Sair</button>
          </form>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
