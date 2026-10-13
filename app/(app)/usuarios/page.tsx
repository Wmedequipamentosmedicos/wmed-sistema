import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PERFIS } from "@/lib/constants";
import Aviso from "@/components/Aviso";
import Campo from "@/components/Campo";
import { criarUsuario, alternarAtivo } from "./actions";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const eu = await requireAdmin();
  const sp = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.from("perfis").select("id, nome, email, perfil, ativo").order("nome");
  const usuarios = data ?? [];

  return (
    <>
      <div className="topo">
        <h1>Usuários</h1>
      </div>
      <Aviso codigo={sp.ok ?? sp.erro} />

      <section className="painel-tabela">
        <header>Usuários do sistema</header>
        <div className="wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {usuarios.map((u: any) => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{PERFIS.find((p) => p.valor === u.perfil)?.nome ?? u.perfil}</td>
                  <td><span className={`tag ${u.ativo ? "ok" : "bad"}`}>{u.ativo ? "Ativo" : "Desativado"}</span></td>
                  <td className="acoes">
                    {u.id !== eu.user.id && (
                      <form action={alternarAtivo}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="ativar" value={u.ativo ? "0" : "1"} />
                        <button className="btn mini sec" type="submit">{u.ativo ? "Desativar" : "Reativar"}</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form action={criarUsuario} className="form-card" style={{ marginTop: 20 }}>
        <h2>Novo usuário</h2>
        <div className="grid2">
          <Campo label="Nome" obrigatorio><input name="nome" required maxLength={120} /></Campo>
          <Campo label="E-mail" obrigatorio><input name="email" type="email" required /></Campo>
          <Campo label="Senha inicial (mínimo 8 caracteres)" obrigatorio>
            <input name="senha" type="password" minLength={8} required autoComplete="new-password" />
          </Campo>
          <Campo label="Perfil" obrigatorio>
            <select name="perfil" defaultValue="tecnico" required>
              {PERFIS.map((p) => (
                <option key={p.valor} value={p.valor}>{p.nome}</option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="rodape-form">
          <button className="btn" type="submit">Criar usuário</button>
        </div>
      </form>
    </>
  );
}
