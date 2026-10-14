# Sistema WMED · Módulo OS (versão 0.1.6)

Sistema interno da Wmed Equipamentos Hospitalares. Esta primeira versão tem:

- **Login** com e-mail e senha (somente quem for cadastrado entra).
- **Usuários** (somente administrador): criar usuário, escolher o perfil, desativar e reativar.
- **Empresas e clientes**: lista com busca e paginação, cadastro com abas (Endereço, Contato, Observações), editar e excluir.
- **Produtos**: cadastro, busca, importação em lote de planilhas Excel (.xlsx), código interno sequencial e fotos privadas no Supabase Storage.
- **Equipamentos**: lista com busca e paginação, cadastro com todos os campos do Archimedes, abas (Informações adicionais, extras, contrato e observações), editar e excluir.
- **Orçamentos**: fluxo completo com solicitante, itens, condições, gravação no Supabase, geração de PDF com logo e dados da empresa e exclusão por administradores.

Ainda **não** tem: ordens de serviço, planos de manutenção, certificados, financeiro e documentos. Entram nas próximas etapas.

Tecnologia: Next.js (site) + Supabase (banco de dados e login) + Vercel (hospedagem).

---

## Passo a passo para colocar no ar

### 1. Criar o banco de dados (Supabase)
1. Crie uma conta em supabase.com e clique em **New project**.
2. Escolha um nome (ex.: `wmed`), defina e **guarde a senha do banco**, e escolha a região **South America (São Paulo)**.
3. Quando o projeto terminar de criar, abra **SQL Editor** > **New query**.
4. Abra o arquivo `supabase/schema.sql`, copie todo o conteúdo, cole no editor e clique em **Run**. Deve aparecer "Success".
5. Se o sistema já estiver instalado, execute também `supabase/produtos.sql` no SQL Editor para criar a tabela, as permissões e o armazenamento privado de imagens.
6. Execute `supabase/servicos.sql` no SQL Editor para criar o catálogo de serviços usado nos orçamentos.
7. Execute `supabase/orcamentos.sql` no SQL Editor para habilitar a finalização dos orçamentos.
8. No sistema, acesse **Dados da empresa** no menu de Administração e preencha os dados legais e de contato da WMED que sairão no PDF.

### 2. Fechar o cadastro público
1. Em **Authentication** > **Sign In / Providers** (ou **Settings**), desligue a opção **Allow new users to sign up**.
2. Assim ninguém consegue criar conta sozinho; só o administrador cria usuários dentro do sistema.

### 3. Criar o seu usuário (administrador)
1. Em **Authentication** > **Users** > **Add user** > **Create new user**.
2. Informe seu e-mail e uma senha forte e marque **Auto Confirm User**.
3. O **primeiro usuário criado vira administrador automaticamente.**
   (Crie o usuário depois de rodar o `schema.sql`, no passo 1.)

### 4. Copiar as chaves do projeto
Em **Project Settings** > **API** (ou **API Keys**), copie:
- **Project URL**
- **anon / publishable key** (chave pública)
- **service_role / secret key** (chave de administrador). **É secreta: não envie por e-mail ou mensagem e nunca publique.**

### 5. Testar no seu computador (opcional, recomendado)
1. Instale o Node.js (nodejs.org, versão LTS).
2. Nesta pasta, copie `.env.example` para `.env.local` e preencha as três chaves.
3. No Terminal, nesta pasta: `npm install` e depois `npm run dev`.
4. Abra http://localhost:3000, entre com o usuário do passo 3 e cadastre uma empresa, um equipamento e um produto.

### 6. Publicar na Vercel
1. Crie um repositório **privado** no GitHub e envie esta pasta (o arquivo `.gitignore` já impede o envio de chaves).
2. Na Vercel: **Add New** > **Project** > escolha o repositório > em **Environment Variables** cadastre as 3 variáveis do `.env.example` com os valores do passo 4 > **Deploy**.
3. A Vercel mostra um endereço `...vercel.app`. Abra, entre e confira.

### 7. Endereço próprio
Na Vercel, no projeto: **Settings** > **Domains** > adicione `sistema.wmedequipamentosmedicos.com.br` e crie no DNS do domínio o registro que a Vercel indicar.

---

## Perfis de usuário
- **Administrador**: tudo, inclusive criar usuários e excluir registros.
- **Técnico / operacional** e **Financeiro / administrativo**: cadastram e editam. Não excluem. (Nas próximas etapas, cada perfil verá as telas do seu trabalho.)

## Observações e suposições desta versão
- Lista de **Tipos de equipamento** já vem preenchida com os equipamentos da Wmed. O botão **+** ao lado do campo cadastra um tipo novo na hora. O mesmo vale para **Quadro de Trabalho** (começa vazio).
- **Tipo da empresa**: Cliente Externo, Cliente Interno e Fornecedor. **Estado do equipamento**: Ativo, Inativo e Em manutenção. **Prioridade**: Não urgente e Urgente. Ajuste se o Archimedes tiver mais opções (arquivo `lib/constants.ts`).
- O botão **+** ao lado de **Proprietário** abre o cadastro de empresa em outra aba; depois, recarregue a página do equipamento.
- As listas de proprietário e de empresa superior mostram até 1.000 empresas.
- A busca da lista de equipamentos procura em tipo, proprietário, fabricante, modelo, identificação, patrimônio, número de série e quadro de trabalho.
- Não há importação dos dados do Archimedes ainda (797 equipamentos e 146 empresas): será uma etapa própria.
- Redefinir a senha de um usuário, por ora, é feito no painel do Supabase (**Authentication** > **Users**).

## Segurança
- As regras de acesso estão no banco (RLS): sem login não se lê nem grava nada; só administrador exclui; usuário desativado perde o acesso.
- A chave `service_role` fica apenas no servidor e é usada somente para criar usuários.
- Faça backup: no Supabase, planos pagos têm backups automáticos; no plano gratuito, exporte os dados periodicamente.
