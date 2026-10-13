export const PAGE_SIZE = 20;

export const TIPOS_EMPRESA = ["Cliente Externo", "Cliente Interno", "Fornecedor"];
export const ESTADOS_EQUIPAMENTO = ["Ativo", "Inativo", "Em manutenção"];
export const PRIORIDADES = ["Não urgente", "Urgente"];
export const MODOS_USO = ["Equipamento", "Padrão"];
export const PERFIS = [
  { valor: "admin", nome: "Administrador" },
  { valor: "tecnico", nome: "Técnico / operacional" },
  { valor: "financeiro", nome: "Financeiro / administrativo" },
];

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const MENSAGENS: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  ok: { texto: "Salvo com sucesso.", tipo: "ok" },
  excluido: { texto: "Registro excluído.", tipo: "ok" },
  usuario_ok: { texto: "Usuário criado.", tipo: "ok" },
  campos: { texto: "Preencha os campos obrigatórios (*).", tipo: "erro" },
  salvar: { texto: "Não foi possível salvar. Tente novamente.", tipo: "erro" },
  vinculos: { texto: "Não é possível excluir: existem registros vinculados a este item.", tipo: "erro" },
  permissao: { texto: "Apenas administradores podem fazer isso.", tipo: "erro" },
  criar: { texto: "Não foi possível criar o usuário. Verifique se o e-mail já existe e se a senha tem 8 ou mais caracteres.", tipo: "erro" },
  config: { texto: "A chave de administrador (SUPABASE_SERVICE_ROLE_KEY) não está configurada no servidor.", tipo: "erro" },
  login: { texto: "E-mail ou senha incorretos.", tipo: "erro" },
};
