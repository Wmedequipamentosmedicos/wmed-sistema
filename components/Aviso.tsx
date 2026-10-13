import { MENSAGENS } from "@/lib/constants";

// Mostra uma mensagem a partir de um código (?erro=... ou ?ok=...). Nunca imprime texto vindo da URL.
export default function Aviso({ codigo }: { codigo?: string }) {
  if (!codigo) return null;
  const m = MENSAGENS[codigo];
  if (!m) return null;
  return <div className={`aviso ${m.tipo}`} role="status">{m.texto}</div>;
}
