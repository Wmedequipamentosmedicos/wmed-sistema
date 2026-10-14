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
  produto_campos: { texto: "Preencha os campos obrigatórios e informe um valor válido.", tipo: "erro" },
  produto_imagem: { texto: "Selecione uma imagem válida de até 5 MB (JPG, PNG, WebP ou GIF).", tipo: "erro" },
  produto_imagem_salvar: { texto: "Não foi possível enviar a imagem. Verifique se o armazenamento de produtos foi configurado no Supabase.", tipo: "erro" },
  produto_imagem_carregar: { texto: "Não foi possível carregar a imagem deste produto.", tipo: "erro" },
  produto_salvar: { texto: "Não foi possível salvar o produto.", tipo: "erro" },
  produto_excluir: { texto: "Não foi possível excluir o produto.", tipo: "erro" },
  produto_imagem_limpeza: { texto: "O produto foi salvo, mas a imagem anterior não pôde ser removida.", tipo: "erro" },
  produto_excluido_imagem: { texto: "O produto foi excluído, mas a imagem não pôde ser removida.", tipo: "erro" },
};
