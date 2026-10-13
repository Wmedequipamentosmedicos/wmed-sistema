import { IconBusca } from "./Icons";

export default function SearchBox({ q }: { q?: string }) {
  return (
    <form className="busca" method="get" role="search">
      <input name="q" defaultValue={q ?? ""} placeholder="Buscar cadastros" aria-label="Buscar cadastros" />
      <button className="btn mini" type="submit" aria-label="Buscar">
        <IconBusca />
      </button>
    </form>
  );
}
