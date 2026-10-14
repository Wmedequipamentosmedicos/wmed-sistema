import Link from "next/link";
import Campo from "@/components/Campo";
import Aviso from "@/components/Aviso";
import { salvarProduto } from "./actions";

type Produto = {
  id: number;
  codigo_interno: number;
  nome: string;
  categoria: string;
  unidade_medida: string;
  valor: number;
  fabricante: string | null;
  imagem_path: string | null;
};

export default function ProdutoForm({
  produto,
  imagemUrl,
  erro,
}: {
  produto?: Produto;
  imagemUrl?: string;
  erro?: string;
}) {
  return (
    <form action={salvarProduto} className="form-card" encType="multipart/form-data">
      <h2>{produto ? "Editar produto" : "Cadastro de produtos"}</h2>
      <Aviso codigo={erro} />
      {produto && (
        <>
          <input type="hidden" name="id" value={produto.id} />
          <p className="produto-codigo">Código interno: <strong>{produto.codigo_interno}</strong></p>
        </>
      )}

      <div className="grid2">
        <Campo label="Produto" obrigatorio>
          <input name="nome" defaultValue={produto?.nome ?? ""} required maxLength={200} />
        </Campo>
        <Campo label="Categoria" obrigatorio>
          <input name="categoria" defaultValue={produto?.categoria ?? ""} required maxLength={100} />
        </Campo>
        <Campo label="Unidade de Medida" obrigatorio>
          <input name="unidade_medida" defaultValue={produto?.unidade_medida ?? ""} required maxLength={50} />
        </Campo>
        <Campo label="Valor (R$)" obrigatorio>
          <input
            name="valor"
            type="number"
            min="0"
            step="0.01"
            defaultValue={produto?.valor ?? ""}
            required
          />
        </Campo>
        <Campo label="Fabricante">
          <input name="fabricante" defaultValue={produto?.fabricante ?? ""} maxLength={200} />
        </Campo>
        <Campo label="Imagem">
          <input name="imagem" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
        </Campo>
        {imagemUrl && (
          <div className="produto-imagem-atual">
            <span>Imagem atual</span>
            <img src={imagemUrl} alt={`Imagem do produto ${produto?.nome ?? ""}`} />
          </div>
        )}
      </div>

      <p className="produto-ajuda">Formatos aceitos: JPG, PNG, WebP ou GIF. Tamanho máximo: 5 MB.</p>
      <p className="produto-ajuda">O código interno é preenchido automaticamente ao salvar o produto.</p>
      <div className="rodape-form">
        <button className="btn" type="submit">Salvar</button>
        <Link className="btn cinza" href="/produtos">Cancelar</Link>
      </div>
    </form>
  );
}
