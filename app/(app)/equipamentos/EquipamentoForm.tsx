import Link from "next/link";
import Campo from "@/components/Campo";
import Tabs from "@/components/Tabs";
import Aviso from "@/components/Aviso";
import SelectComAdicionar from "@/components/SelectComAdicionar";
import { ESTADOS_EQUIPAMENTO, PRIORIDADES, MODOS_USO } from "@/lib/constants";
import { salvarEquipamento } from "./actions";

type Opcao = { id: number; nome: string };

export default function EquipamentoForm({
  equipamento,
  tipos,
  quadros,
  empresas,
  erro,
}: {
  equipamento?: any;
  tipos: Opcao[];
  quadros: Opcao[];
  empresas: Opcao[];
  erro?: string;
}) {
  const e = equipamento ?? {};
  return (
    <form action={salvarEquipamento} className="form-card">
      <h2>Cadastro de equipamentos</h2>
      <Aviso codigo={erro} />
      {e.id ? <input type="hidden" name="id" value={e.id} /> : null}

      <div className="grid2">
        <Campo label="Tipo" obrigatorio>
          <SelectComAdicionar name="tipo_id" novoName="novo_tipo" opcoes={tipos} valorInicial={e.tipo_id} obrigatorio />
        </Campo>
        <Campo label="Quadro de Trabalho">
          <SelectComAdicionar name="quadro_id" novoName="novo_quadro" opcoes={quadros} valorInicial={e.quadro_id} />
        </Campo>
        <Campo label="Fabricante">
          <input name="fabricante" defaultValue={e.fabricante ?? ""} />
        </Campo>
        <Campo label="Modelo">
          <input name="modelo" defaultValue={e.modelo ?? ""} />
        </Campo>
        <Campo label="Estado" obrigatorio>
          <select name="estado" defaultValue={e.estado ?? "Ativo"} required>
            {ESTADOS_EQUIPAMENTO.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Proprietário" obrigatorio>
          <div className="sel-add">
            <select name="proprietario_id" defaultValue={e.proprietario_id ? String(e.proprietario_id) : ""} required>
              <option value="">Selecione…</option>
              {empresas.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
            <Link className="btn-mais" href="/empresas/novo" target="_blank" title="Cadastrar nova empresa (abre em outra aba; depois recarregue esta página)" aria-label="Cadastrar nova empresa">
              +
            </Link>
          </div>
        </Campo>
        <Campo label="Identificação/TAG">
          <input name="identificacao_tag" defaultValue={e.identificacao_tag ?? ""} />
        </Campo>
        <Campo label="Número de Série">
          <input name="numero_serie" defaultValue={e.numero_serie ?? ""} />
        </Campo>
        <Campo label="Patrimônio">
          <input name="patrimonio" defaultValue={e.patrimonio ?? ""} />
        </Campo>
        <Campo label="Portaria INMETRO">
          <input name="portaria_inmetro" defaultValue={e.portaria_inmetro ?? ""} />
        </Campo>
        <Campo label="Prioridade" obrigatorio>
          <select name="prioridade" defaultValue={e.prioridade ?? "Não urgente"} required>
            {PRIORIDADES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Campo>
        <div className="campo">
          <span style={{ fontWeight: 700, fontSize: 14 }}>Modo de Uso*</span>
          <div className="radios">
            {MODOS_USO.map((m) => (
              <label key={m}>
                <input type="radio" name="modo_uso" value={m} defaultChecked={(e.modo_uso ?? "Equipamento") === m} required />
                {m}
              </label>
            ))}
          </div>
        </div>
      </div>

      <Tabs
        labels={["Informações adicionais", "Informações extras", "Informações contrato", "Observações"]}
        panels={[
          <>
            <Campo label="Data de Fabricação">
              <input type="date" name="data_fabricacao" defaultValue={e.data_fabricacao ?? ""} />
            </Campo>
            <Campo label="Data de Aquisição">
              <input type="date" name="data_aquisicao" defaultValue={e.data_aquisicao ?? ""} />
            </Campo>
          </>,
          <Campo label="Informações extras" larga>
            <textarea name="informacoes_extras" defaultValue={e.informacoes_extras ?? ""} />
          </Campo>,
          <Campo label="Informações do contrato" larga>
            <textarea name="informacoes_contrato" defaultValue={e.informacoes_contrato ?? ""} />
          </Campo>,
          <Campo label="Observações" larga>
            <textarea name="observacoes" defaultValue={e.observacoes ?? ""} />
          </Campo>,
        ]}
      />

      <div className="rodape-form">
        <button className="btn" type="submit">Salvar</button>
        <Link className="btn cinza" href="/equipamentos">Cancelar</Link>
      </div>
    </form>
  );
}
