import type { ReactNode } from "react";
import { getPerfil } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import Nav from "@/components/Nav";
import { PERFIS } from "@/lib/constants";
import packageJson from "../../package.json";

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
        <details className="app-version">
          <summary>
            <span>Versão {packageJson.version}</span>
            <span className="version-hint">Novidades</span>
          </summary>
          <div className="version-notes">
            <section>
              <b>Versão {packageJson.version}</b>
              <ul>
                <li>Orçamentos: forma de pagamento, descontos, frete, prazo e responsável.</li>
                <li>Orçamentos: seleção de produtos e serviços com quantidade e cadastro rápido.</li>
                <li>Cadastro de produtos com código interno sequencial e foto.</li>
                <li>Orçamentos: escolha de empresa ou cliente solicitante e tipo do orçamento.</li>
              </ul>
            </section>
            <section>
              <b>Versão 0.1.1</b>
              <ul>
                <li>Novidades do sistema disponíveis ao clicar na versão.</li>
                <li>Indicação da versão atual no menu lateral.</li>
              </ul>
            </section>
            <section>
              <b>Versão 0.1.0</b>
              <ul>
                <li>Login e administração de usuários.</li>
                <li>Cadastro e consulta de empresas e equipamentos.</li>
              </ul>
            </section>
          </div>
        </details>
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
