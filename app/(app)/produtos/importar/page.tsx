import Link from "next/link";
import ImportarProdutos from "./ImportarProdutos";

export default function ImportarProdutosPage() {
  return (
    <>
      <div className="topo">
        <h1>Importar produtos</h1>
        <Link className="btn cinza" href="/produtos">Voltar aos produtos</Link>
      </div>
      <ImportarProdutos />
    </>
  );
}
