import Link from "next/link";
import ImportadorPlanilha, { type CampoImportacao } from "@/components/ImportadorPlanilha";
import { importarEmpresas } from "../actions";

const CAMPOS: CampoImportacao[] = [
  { chave: "nome", titulo: "Nome", obrigatorio: true, aliases: ["nome", "razaosocial", "empresa", "razaosocialnome"] },
  { chave: "nome_fantasia", titulo: "Nome fantasia", aliases: ["nomefantasia", "fantasia"] },
  { chave: "tipo", titulo: "Tipo", obrigatorio: true, aliases: ["tipo", "tipoempresa", "perfil", "categoria"] },
  { chave: "cpf_cnpj", titulo: "CPF/CNPJ", aliases: ["cpfcnpj", "cnpj", "cpf", "documento"] },
  { chave: "cep", titulo: "CEP", aliases: ["cep"] },
  { chave: "rua", titulo: "Rua / endereço", aliases: ["rua", "endereco", "logradouro"] },
  { chave: "numero", titulo: "Número", aliases: ["numero", "nro"] },
  { chave: "complemento", titulo: "Complemento", aliases: ["complemento"] },
  { chave: "bairro", titulo: "Bairro", aliases: ["bairro"] },
  { chave: "cidade", titulo: "Cidade", aliases: ["cidade", "municipio"] },
  { chave: "estado", titulo: "Estado / UF", aliases: ["estado", "uf"] },
  { chave: "contato", titulo: "Contato", aliases: ["contato", "nomecontato", "responsavel"] },
  { chave: "telefone", titulo: "Telefone", aliases: ["telefone", "fone", "celular"] },
  { chave: "email", titulo: "E-mail", aliases: ["email", "correioeletronico"] },
  { chave: "observacoes", titulo: "Observações", aliases: ["observacoes", "obs"] },
];

export default function ImportarEmpresasPage() {
  return (
    <>
      <div className="topo">
        <h1>Importar empresas</h1>
        <Link className="btn cinza" href="/empresas">Voltar às empresas</Link>
      </div>
      <ImportadorPlanilha
        campos={CAMPOS}
        acao={importarEmpresas}
        orientacao="Importe empresas, clientes e fornecedores em lote. Cada linha cria um novo cadastro, sem atualizar registros existentes. O nome e o tipo são obrigatórios; tipos aceitos: Cliente Externo, Cliente Interno e Fornecedor."
      />
    </>
  );
}
