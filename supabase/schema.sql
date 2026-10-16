-- ============================================================
-- Sistema WMED · Módulo OS · Banco de dados (Supabase / PostgreSQL)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- ============================================================

-- ---------- Usuários (perfis) ----------
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text,
  perfil text not null default 'tecnico' check (perfil in ('admin', 'tecnico', 'financeiro')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Todo usuário novo ganha um perfil. O PRIMEIRO usuário do sistema vira administrador.
create or replace function public.novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, email, perfil)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.perfis) then 'tecnico' else 'admin' end
  );
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.novo_usuario();

-- Funções usadas pelas regras de acesso
create or replace function public.usuario_ativo()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo)
$$;

create or replace function public.usuario_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo and perfil = 'admin')
$$;

-- ---------- Listas de apoio ----------
create table if not exists public.tipos_equipamento (
  id bigint generated always as identity primary key,
  nome text not null unique,
  criado_em timestamptz not null default now()
);

create table if not exists public.quadros_trabalho (
  id bigint generated always as identity primary key,
  nome text not null unique,
  criado_em timestamptz not null default now()
);

insert into public.tipos_equipamento (nome) values
  ('Aparelho de anestesia'),
  ('Monitor multiparamétrico'),
  ('Bisturi elétrico'),
  ('Mesa cirúrgica'),
  ('Autoclave hospitalar'),
  ('Ventilador pulmonar'),
  ('Incubadora neonatal'),
  ('Cardioversor'),
  ('Bomba de seringa'),
  ('Lavadora ultrassônica'),
  ('Termodesinfectora'),
  ('Seladora de grau cirúrgico'),
  ('Incubadora para teste biológico'),
  ('Etiquetadora'),
  ('Oxímetro'),
  ('Polígrafo portátil'),
  ('Equipamento de teste respiratório')
on conflict (nome) do nothing;

-- ---------- Empresas e clientes ----------
create table if not exists public.empresas (
  id bigint generated always as identity primary key,
  nome text not null,
  nome_fantasia text,
  tipo text not null default 'Cliente Externo',
  superior_id bigint references public.empresas (id) on delete set null,
  cpf_cnpj text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  contato text,
  telefone text,
  email text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists empresas_nome_idx on public.empresas (lower(nome));

-- ---------- Produtos ----------
create sequence if not exists public.produtos_codigo_interno_seq;

create table if not exists public.produtos (
  id bigint generated always as identity primary key,
  codigo_interno bigint not null unique default nextval('public.produtos_codigo_interno_seq'),
  nome text not null,
  categoria text not null,
  unidade_medida text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  fabricante text,
  imagem_path text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter sequence public.produtos_codigo_interno_seq owned by public.produtos.codigo_interno;
create index if not exists produtos_nome_idx on public.produtos (lower(nome));

-- ---------- Serviços ----------
create table if not exists public.servicos (
  id bigint generated always as identity primary key,
  nome text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists servicos_nome_idx on public.servicos (lower(nome));

-- ---------- Dados da empresa emissora dos orçamentos ----------
create table if not exists public.configuracoes_empresa (
  id boolean primary key default true check (id),
  razao_social text not null default 'Wmed Equipamentos Médicos',
  nome_fantasia text not null default 'Wmed',
  cnpj text not null default '',
  rua text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  cep text not null default '',
  telefone text not null default '',
  email text not null default '',
  site text not null default '',
  atualizado_em timestamptz not null default now()
);

insert into public.configuracoes_empresa (id)
values (true)
on conflict (id) do nothing;

-- ---------- Orçamentos finalizados ----------
create table if not exists public.orcamentos (
  id bigint generated always as identity primary key,
  empresa_id bigint not null references public.empresas (id) on delete restrict,
  criado_por uuid not null references auth.users (id),
  emissor_snapshot jsonb not null,
  solicitante_snapshot jsonb not null,
  tipo text not null check (tipo in ('produtos', 'servicos', 'produtos-servicos')),
  forma_pagamento text check (forma_pagamento is null or forma_pagamento in ('avista', 'pix', 'boleto', 'transferencia', 'cartao', 'faturado', 'outro')),
  desconto_percentual numeric(5, 2) not null default 0 check (desconto_percentual between 0 and 100),
  desconto_valor numeric(12, 2) not null default 0 check (desconto_valor >= 0),
  frete numeric(12, 2) not null default 0 check (frete >= 0),
  prazo_entrega text,
  informacoes_adicionais text,
  responsavel text,
  subtotal_produtos numeric(12, 2) not null,
  subtotal_servicos numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  total numeric(12, 2) not null,
  status text not null default 'finalizado' check (status in ('finalizado')),
  criado_em timestamptz not null default now()
);

create index if not exists orcamentos_empresa_idx on public.orcamentos (empresa_id, criado_em desc);
create index if not exists orcamentos_criado_por_idx on public.orcamentos (criado_por);

create table if not exists public.orcamento_itens (
  id bigint generated always as identity primary key,
  orcamento_id bigint not null references public.orcamentos (id) on delete cascade,
  tipo_item text not null check (tipo_item in ('produto', 'servico')),
  produto_id bigint references public.produtos (id) on delete set null,
  servico_id bigint references public.servicos (id) on delete set null,
  descricao text not null,
  unidade_medida text,
  quantidade numeric(12, 3) not null check (quantidade > 0),
  valor_unitario numeric(12, 2) not null check (valor_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  criado_em timestamptz not null default now(),
  check (
    (tipo_item = 'produto' and produto_id is not null and servico_id is null)
    or (tipo_item = 'servico' and servico_id is not null and produto_id is null)
  )
);

create index if not exists orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id);

-- ---------- Equipamentos ----------
create table if not exists public.equipamentos (
  id bigint generated always as identity primary key,
  tipo_id bigint not null references public.tipos_equipamento (id),
  quadro_id bigint references public.quadros_trabalho (id) on delete set null,
  fabricante text,
  modelo text,
  estado text not null default 'Ativo',
  proprietario_id bigint not null references public.empresas (id),
  identificacao_tag text,
  numero_serie text,
  patrimonio text,
  portaria_inmetro text,
  prioridade text not null default 'Não urgente',
  modo_uso text not null default 'Equipamento',
  data_fabricacao date,
  data_aquisicao date,
  informacoes_extras text,
  informacoes_contrato text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists equipamentos_proprietario_idx on public.equipamentos (proprietario_id);
create index if not exists equipamentos_tipo_idx on public.equipamentos (tipo_id);

-- Visão usada na lista de equipamentos (já traz os nomes)
create or replace view public.equipamentos_lista
with (security_invoker = true) as
select
  e.*,
  t.nome as tipo_nome,
  p.nome as proprietario_nome,
  q.nome as quadro_nome
from public.equipamentos e
join public.tipos_equipamento t on t.id = e.tipo_id
join public.empresas p on p.id = e.proprietario_id
left join public.quadros_trabalho q on q.id = e.quadro_id;

-- ---------- Regras de acesso (RLS) ----------
-- Só usuários logados e ativos leem e gravam. Só administradores excluem.
alter table public.perfis enable row level security;
drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.usuario_ativo());
-- (criar/alterar perfis é feito apenas pelo servidor, com a chave de administrador)

do $$
declare t text;
begin
  foreach t in array array['empresas', 'equipamentos', 'tipos_equipamento', 'quadros_trabalho', 'produtos', 'servicos']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_ler', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.usuario_ativo())', t || '_ler', t);

    execute format('drop policy if exists %I on public.%I', t || '_inserir', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.usuario_ativo())', t || '_inserir', t);

    execute format('drop policy if exists %I on public.%I', t || '_alterar', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.usuario_ativo()) with check (public.usuario_ativo())', t || '_alterar', t);

    execute format('drop policy if exists %I on public.%I', t || '_excluir', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.usuario_admin())', t || '_excluir', t);
  end loop;
end
$$;

alter table public.configuracoes_empresa enable row level security;
drop policy if exists configuracoes_empresa_ler on public.configuracoes_empresa;
create policy configuracoes_empresa_ler on public.configuracoes_empresa
  for select to authenticated using (public.usuario_ativo());
drop policy if exists configuracoes_empresa_alterar on public.configuracoes_empresa;
create policy configuracoes_empresa_alterar on public.configuracoes_empresa
  for update to authenticated using (public.usuario_admin()) with check (public.usuario_admin());

alter table public.orcamentos enable row level security;
drop policy if exists orcamentos_ler on public.orcamentos;
create policy orcamentos_ler on public.orcamentos
  for select to authenticated using (public.usuario_ativo());
drop policy if exists orcamentos_excluir on public.orcamentos;
create policy orcamentos_excluir on public.orcamentos
  for delete to authenticated using (public.usuario_admin());
grant delete on public.orcamentos to authenticated;

alter table public.orcamento_itens enable row level security;
drop policy if exists orcamento_itens_ler on public.orcamento_itens;
create policy orcamento_itens_ler on public.orcamento_itens
  for select to authenticated using (public.usuario_ativo());

create or replace function public.finalizar_orcamento(
  p_empresa_id bigint,
  p_criado_por uuid,
  p_tipo text,
  p_itens jsonb,
  p_forma_pagamento text,
  p_desconto_percentual numeric,
  p_desconto_valor numeric,
  p_frete numeric,
  p_prazo_entrega text,
  p_informacoes_adicionais text,
  p_responsavel text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_id bigint;
  v_quantidade numeric(12, 3);
  v_produtos numeric(12, 2) := 0;
  v_servicos numeric(12, 2) := 0;
  v_subtotal numeric(12, 2);
  v_desconto_percentual numeric(12, 2);
  v_desconto_valor numeric(12, 2);
  v_qtd_produtos integer := 0;
  v_qtd_servicos integer := 0;
  v_frete numeric(12, 2);
  v_descricao text;
  v_unidade text;
  v_valor numeric(12, 2);
  v_orcamento_id bigint;
  v_emissor jsonb;
  v_solicitante jsonb;
begin
  if not public.usuario_ativo() or auth.uid() is distinct from p_criado_por then
    raise exception 'Usuário sem permissão para finalizar orçamento' using errcode = '42501';
  end if;
  if not exists (select 1 from public.empresas where id = p_empresa_id) then
    raise exception 'Solicitante inválido' using errcode = '22023';
  end if;
  select to_jsonb(c) into v_emissor from public.configuracoes_empresa c where id = true;
  if not found
    or nullif(v_emissor->>'razao_social', '') is null
    or nullif(v_emissor->>'cnpj', '') is null
    or nullif(v_emissor->>'rua', '') is null
    or nullif(v_emissor->>'cidade', '') is null
    or nullif(v_emissor->>'telefone', '') is null
    or nullif(v_emissor->>'email', '') is null then
    raise exception 'Configure os dados da empresa emissora antes de finalizar o orçamento' using errcode = '55000';
  end if;
  select to_jsonb(e) into v_solicitante from public.empresas e where id = p_empresa_id;
  if p_tipo not in ('produtos', 'servicos', 'produtos-servicos')
    or (p_forma_pagamento is not null and p_forma_pagamento not in ('avista', 'pix', 'boleto', 'transferencia', 'cartao', 'faturado', 'outro'))
    or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0
    or p_desconto_percentual < 0 or p_desconto_percentual > 100
    or p_desconto_valor < 0 or p_frete < 0 then
    raise exception 'Dados do orçamento inválidos' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_itens) as entrada(item)
    group by item->>'tipo', item->>'id'
    having count(*) > 1
  ) then
    raise exception 'Não é permitido repetir produtos ou serviços no orçamento' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_id := (v_item->>'id')::bigint;
    v_quantidade := (v_item->>'quantidade')::numeric;
    if v_quantidade is null or v_quantidade <= 0 then
      raise exception 'Quantidade inválida' using errcode = '22023';
    end if;

    if v_item->>'tipo' = 'produto' and p_tipo in ('produtos', 'produtos-servicos') then
      select nome, unidade_medida, valor into v_descricao, v_unidade, v_valor
        from public.produtos where id = v_id for share;
      if not found then raise exception 'Produto inválido' using errcode = '22023'; end if;
      v_produtos := v_produtos + round(v_valor * v_quantidade, 2);
      v_qtd_produtos := v_qtd_produtos + 1;
    elsif v_item->>'tipo' = 'servico' and p_tipo in ('servicos', 'produtos-servicos') then
      select nome, null::text, valor into v_descricao, v_unidade, v_valor
        from public.servicos where id = v_id for share;
      if not found then raise exception 'Serviço inválido' using errcode = '22023'; end if;
      v_servicos := v_servicos + round(v_valor * v_quantidade, 2);
      v_qtd_servicos := v_qtd_servicos + 1;
    else
      raise exception 'Tipo de item incompatível com o orçamento' using errcode = '22023';
    end if;
  end loop;

  if v_qtd_produtos + v_qtd_servicos = 0 then
    raise exception 'Inclua ao menos um produto ou serviço válido' using errcode = '22023';
  end if;

  v_subtotal := v_produtos + v_servicos;
  v_desconto_percentual := round(v_subtotal * p_desconto_percentual / 100, 2);
  v_desconto_valor := least(p_desconto_valor, greatest(0, v_subtotal - v_desconto_percentual));
  v_frete := p_frete;

  insert into public.orcamentos (
    empresa_id, criado_por, emissor_snapshot, solicitante_snapshot, tipo, forma_pagamento, desconto_percentual, desconto_valor, frete,
    prazo_entrega, informacoes_adicionais, responsavel, subtotal_produtos, subtotal_servicos,
    subtotal, total
  ) values (
    p_empresa_id, p_criado_por, v_emissor, v_solicitante, p_tipo, p_forma_pagamento, p_desconto_percentual, v_desconto_valor, v_frete,
    nullif(p_prazo_entrega, ''), nullif(p_informacoes_adicionais, ''), nullif(p_responsavel, ''),
    v_produtos, v_servicos, v_subtotal,
    greatest(0, v_subtotal - v_desconto_percentual - v_desconto_valor) + v_frete
  ) returning id into v_orcamento_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_id := (v_item->>'id')::bigint;
    v_quantidade := (v_item->>'quantidade')::numeric;

    if v_item->>'tipo' = 'produto' then
      select nome, unidade_medida, valor into v_descricao, v_unidade, v_valor
        from public.produtos where id = v_id for share;
      insert into public.orcamento_itens (
        orcamento_id, tipo_item, produto_id, descricao, unidade_medida, quantidade, valor_unitario, subtotal
      ) values (
        v_orcamento_id, 'produto', v_id, v_descricao, v_unidade, v_quantidade, v_valor, round(v_valor * v_quantidade, 2)
      );
    else
      select nome, valor into v_descricao, v_valor from public.servicos where id = v_id for share;
      insert into public.orcamento_itens (
        orcamento_id, tipo_item, servico_id, descricao, quantidade, valor_unitario, subtotal
      ) values (
        v_orcamento_id, 'servico', v_id, v_descricao, v_quantidade, v_valor, round(v_valor * v_quantidade, 2)
      );
    end if;
  end loop;

  return v_orcamento_id;
end;
$$;

grant execute on function public.finalizar_orcamento(bigint, uuid, text, jsonb, text, numeric, numeric, numeric, text, text, text) to authenticated;

create or replace function public.editar_orcamento(
  p_orcamento_id bigint,
  p_empresa_id bigint,
  p_criado_por uuid,
  p_tipo text,
  p_itens jsonb,
  p_forma_pagamento text,
  p_desconto_percentual numeric,
  p_desconto_valor numeric,
  p_frete numeric,
  p_prazo_entrega text,
  p_informacoes_adicionais text,
  p_responsavel text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_criado_por uuid;
  v_item jsonb;
  v_id bigint;
  v_quantidade numeric(12, 3);
  v_produtos numeric(12, 2) := 0;
  v_servicos numeric(12, 2) := 0;
  v_subtotal numeric(12, 2);
  v_desconto_percentual numeric(12, 2);
  v_desconto_valor numeric(12, 2);
  v_qtd_produtos integer := 0;
  v_qtd_servicos integer := 0;
  v_descricao text;
  v_unidade text;
  v_valor numeric(12, 2);
  v_emissor jsonb;
  v_solicitante jsonb;
  v_itens_snapshot jsonb := '[]'::jsonb;
begin
  if not public.usuario_ativo() or auth.uid() is distinct from p_criado_por then
    raise exception 'Usuário sem permissão para editar orçamento' using errcode = '42501';
  end if;

  select criado_por into v_criado_por
    from public.orcamentos where id = p_orcamento_id for update;
  if not found then raise exception 'Orçamento inválido' using errcode = '22023'; end if;
  if v_criado_por is distinct from auth.uid() and not public.usuario_admin() then
    raise exception 'Usuário sem permissão para editar orçamento' using errcode = '42501';
  end if;
  if not exists (select 1 from public.empresas where id = p_empresa_id) then
    raise exception 'Solicitante inválido' using errcode = '22023';
  end if;
  select to_jsonb(c) into v_emissor from public.configuracoes_empresa c where id = true;
  if not found
    or nullif(v_emissor->>'razao_social', '') is null
    or nullif(v_emissor->>'cnpj', '') is null
    or nullif(v_emissor->>'rua', '') is null
    or nullif(v_emissor->>'cidade', '') is null
    or nullif(v_emissor->>'telefone', '') is null
    or nullif(v_emissor->>'email', '') is null then
    raise exception 'Configure os dados da empresa emissora antes de editar o orçamento' using errcode = '55000';
  end if;
  select to_jsonb(e) into v_solicitante from public.empresas e where id = p_empresa_id;
  if p_tipo not in ('produtos', 'servicos', 'produtos-servicos')
    or (p_forma_pagamento is not null and p_forma_pagamento not in ('avista', 'pix', 'boleto', 'transferencia', 'cartao', 'faturado', 'outro'))
    or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0
    or p_desconto_percentual < 0 or p_desconto_percentual > 100
    or p_desconto_valor < 0 or p_frete < 0 then
    raise exception 'Dados do orçamento inválidos' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_itens) as entrada(item)
    group by item->>'tipo', item->>'id'
    having count(*) > 1
  ) then
    raise exception 'Não é permitido repetir produtos ou serviços no orçamento' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_id := (v_item->>'id')::bigint;
    v_quantidade := (v_item->>'quantidade')::numeric;
    if v_quantidade is null or v_quantidade <= 0 then
      raise exception 'Quantidade inválida' using errcode = '22023';
    end if;

    if v_item->>'tipo' = 'produto' and p_tipo in ('produtos', 'produtos-servicos') then
      select descricao, unidade_medida, valor_unitario
        into v_descricao, v_unidade, v_valor
        from public.orcamento_itens
        where orcamento_id = p_orcamento_id and tipo_item = 'produto' and produto_id = v_id;
      if not found then
        select nome, unidade_medida, valor into v_descricao, v_unidade, v_valor
          from public.produtos where id = v_id for share;
        if not found then raise exception 'Produto inválido' using errcode = '22023'; end if;
      end if;
      v_produtos := v_produtos + round(v_valor * v_quantidade, 2);
      v_qtd_produtos := v_qtd_produtos + 1;
    elsif v_item->>'tipo' = 'servico' and p_tipo in ('servicos', 'produtos-servicos') then
      select descricao, unidade_medida, valor_unitario
        into v_descricao, v_unidade, v_valor
        from public.orcamento_itens
        where orcamento_id = p_orcamento_id and tipo_item = 'servico' and servico_id = v_id;
      if not found then
        select nome, null::text, valor into v_descricao, v_unidade, v_valor
          from public.servicos where id = v_id for share;
        if not found then raise exception 'Serviço inválido' using errcode = '22023'; end if;
      end if;
      v_servicos := v_servicos + round(v_valor * v_quantidade, 2);
      v_qtd_servicos := v_qtd_servicos + 1;
    else
      raise exception 'Tipo de item incompatível com o orçamento' using errcode = '22023';
    end if;
    v_itens_snapshot := v_itens_snapshot || jsonb_build_array(jsonb_build_object(
      'tipo', v_item->>'tipo',
      'id', v_id,
      'quantidade', v_quantidade,
      'descricao', v_descricao,
      'unidade_medida', v_unidade,
      'valor_unitario', v_valor
    ));
  end loop;

  if v_qtd_produtos + v_qtd_servicos = 0 then
    raise exception 'Inclua ao menos um produto ou serviço válido' using errcode = '22023';
  end if;

  v_subtotal := v_produtos + v_servicos;
  v_desconto_percentual := round(v_subtotal * p_desconto_percentual / 100, 2);
  v_desconto_valor := least(p_desconto_valor, greatest(0, v_subtotal - v_desconto_percentual));

  update public.orcamentos set
    empresa_id = p_empresa_id,
    emissor_snapshot = v_emissor,
    solicitante_snapshot = v_solicitante,
    tipo = p_tipo,
    forma_pagamento = p_forma_pagamento,
    desconto_percentual = p_desconto_percentual,
    desconto_valor = v_desconto_valor,
    frete = p_frete,
    prazo_entrega = nullif(p_prazo_entrega, ''),
    informacoes_adicionais = nullif(p_informacoes_adicionais, ''),
    responsavel = nullif(p_responsavel, ''),
    subtotal_produtos = v_produtos,
    subtotal_servicos = v_servicos,
    subtotal = v_subtotal,
    total = greatest(0, v_subtotal - v_desconto_percentual - v_desconto_valor) + p_frete
  where id = p_orcamento_id;

  delete from public.orcamento_itens where orcamento_id = p_orcamento_id;
  for v_item in select value from jsonb_array_elements(v_itens_snapshot)
  loop
    v_id := (v_item->>'id')::bigint;
    v_quantidade := (v_item->>'quantidade')::numeric;
    v_descricao := v_item->>'descricao';
    v_unidade := v_item->>'unidade_medida';
    v_valor := (v_item->>'valor_unitario')::numeric;
    if v_item->>'tipo' = 'produto' then
      insert into public.orcamento_itens (
        orcamento_id, tipo_item, produto_id, descricao, unidade_medida, quantidade, valor_unitario, subtotal
      ) values (
        p_orcamento_id, 'produto', v_id, v_descricao, v_unidade, v_quantidade, v_valor, round(v_valor * v_quantidade, 2)
      );
    else
      insert into public.orcamento_itens (
        orcamento_id, tipo_item, servico_id, descricao, quantidade, valor_unitario, subtotal
      ) values (
        p_orcamento_id, 'servico', v_id, v_descricao, v_quantidade, v_valor, round(v_valor * v_quantidade, 2)
      );
    end if;
  end loop;

  return p_orcamento_id;
end;
$$;

grant execute on function public.editar_orcamento(bigint, bigint, uuid, text, jsonb, text, numeric, numeric, numeric, text, text, text) to authenticated;

grant usage, select on sequence public.produtos_codigo_interno_seq to authenticated;

-- Imagens privadas dos produtos: só usuários ativos podem ler/gravar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists produtos_imagens_ler on storage.objects;
create policy produtos_imagens_ler on storage.objects
  for select to authenticated
  using (bucket_id = 'produtos' and public.usuario_ativo());

drop policy if exists produtos_imagens_inserir on storage.objects;
create policy produtos_imagens_inserir on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produtos' and public.usuario_ativo());

drop policy if exists produtos_imagens_alterar on storage.objects;
create policy produtos_imagens_alterar on storage.objects
  for update to authenticated
  using (bucket_id = 'produtos' and public.usuario_ativo())
  with check (bucket_id = 'produtos' and public.usuario_ativo());

drop policy if exists produtos_imagens_excluir on storage.objects;
create policy produtos_imagens_excluir on storage.objects
  for delete to authenticated
  using (bucket_id = 'produtos' and public.usuario_ativo());

grant select on public.equipamentos_lista to authenticated;

-- ---------- Usuários que já existiam antes deste script ----------
insert into public.perfis (id, nome, email, perfil)
select
  u.id,
  split_part(u.email, '@', 1),
  u.email,
  case
    when not exists (select 1 from public.perfis where perfil = 'admin')
     and row_number() over (order by u.created_at) = 1 then 'admin'
    else 'tecnico'
  end
from auth.users u
where not exists (select 1 from public.perfis p where p.id = u.id);
