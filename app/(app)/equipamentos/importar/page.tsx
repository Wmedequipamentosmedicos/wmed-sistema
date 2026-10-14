import Link from "next/link";
import ImportadorPlanilha, { type CampoImportacao } from "@/components/ImportadorPlanilha";
import { importarEquipamentos } from "../actions";

const CAMPOS: CampoImportacao[] = [
  { chave: "tipo_nome", titulo: "Tipo de equipamento", obrigatorio: true, aliases: ["tipo", "tipoequipamento", "equipamento", "nomeequipamento"] },
  { chave: "proprietario_nome", titulo: "Empresa proprietária", obrigatorio: true, aliases: ["proprietario", "proprietarioequipamento", "empresa", "empresaproprietaria", "cliente", "nomeproprietario"] },
  { chave: "quadro_nome", titulo: "Quadro de trabalho", aliases: ["quadro", "quadrotrabalho", "setor"] },
  { chave: "fabricante", titulo: "Fabricante", aliases: ["fabricante", "marca"] },
  { chave: "modelo", titulo: "Modelo", aliases: ["modelo"] },
  { chave: "estado", titulo: "Estado", aliases: ["estado", "situacao", "status"] },
  { chave: "identificacao_tag", titulo: "Identificação / TAG", aliases: ["identificacao", "identificacaotag", "tag", "codigoidentificacao"] },
  { chave: "numero_serie", titulo: "Número de série", aliases: ["numeroserie", "serie", "serial"] },
  { chave: "patrimonio", titulo: "Patrimônio", aliases: ["patrimonio", "numeropatrimonio"] },
  { chave: "portaria_inmetro", titulo: "Portaria INMETRO", aliases: ["portariainmetro", "inmetro"] },
  { chave: "prioridade", titulo: "Prioridade", aliases: ["prioridade"] },
  { chave: "modo_uso", titulo: "Modo de uso", aliases: ["modouso", "modo"] },
  { chave: "data_fabricacao", titulo: "Data de fabricação", aliases: ["datafabricacao", "fabricacao"] },
  { chave: "data_aquisicao", titulo: "Data de aquisição", aliases: ["dataaquisicao", "aquisicao", "datacompra"] },
  { chave: "informacoes_extras", titulo: "Informações extras", aliases: ["informacoesextras", "extras"] },
  { chave: "informacoes_contrato", titulo: "Informações do contrato", aliases: ["informacoescontrato", "contrato"] },
  { chave: "observacoes", titulo: "Observações", aliases: ["observacoes", "obs"] },
];

export default function ImportarEquipamentosPage() {
  return (
    <>
      <div className="topo">
        <h1>Importar equipamentos</h1>
        <Link className="btn cinza" href="/equipamentos">Voltar aos equipamentos</Link>
      </div>
      <ImportadorPlanilha
        campos={CAMPOS}
        acao={importarEquipamentos}
        orientacao="Importe os equipamentos em lote. Cada linha cria um novo cadastro, sem atualizar equipamentos existentes. Cadastre/importante as empresas proprietárias primeiro; o nome da empresa na planilha deve corresponder exatamente ao nome cadastrado. Tipos e quadros de trabalho ausentes serão criados automaticamente."
      />
    </>
  );
}
