import { login } from "./actions";
import Aviso from "@/components/Aviso";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <main className="login">
      <div className="login-card">
        <div className="faixa" />
        <img src="/logo-colorido.png" alt="Wmed®" />
        <h1>Sistema WMED</h1>
        <form action={login}>
          <Aviso codigo={erro} />
          <label className="campo">
            <span>E-mail</span>
            <input name="email" type="email" autoComplete="username" required autoFocus />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input name="senha" type="password" autoComplete="current-password" required />
          </label>
          <button className="btn" type="submit">Entrar</button>
        </form>
      </div>
    </main>
  );
}
