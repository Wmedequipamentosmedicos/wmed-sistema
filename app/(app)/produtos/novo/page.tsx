import ProdutoForm from "../ProdutoForm";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <>
      <div className="topo">
        <h1>Produtos</h1>
      </div>
      <ProdutoForm erro={erro} />
    </>
  );
}
