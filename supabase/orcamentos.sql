-- Execute no SQL Editor do Supabase para habilitar a finalização e geração de PDF
-- dos orçamentos em uma instalação existente.

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

create table if not exists public.orcamentos (
  id bigint generated always as identity primary key,
  empresa_id bigint not null references public.empresas (id) on delete restrict,
  criado_por uuid not null references auth.users (id),
  emissor_snapshot jsonb not null,
  solicitante_snapshot jsonb not null,
  tipo text not null check (tipo in ('produtos', 'servicos', 'produtos-servicos')),
  forma_pagamento text not null check (forma_pagamento in ('avista', 'pix', 'boleto', 'transferencia', 'cartao', 'faturado', 'outro')),
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
    or p_forma_pagamento not in ('avista', 'pix', 'boleto', 'transferencia', 'cartao', 'faturado', 'outro')
    or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0
    or p_desconto_percentual < 0 or p_desconto_percentual > 100
    or p_desconto_valor < 0 or p_frete < 0 then
    raise exception 'Dados do orçamento inválidos' using errcode = '22023';
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

  if (p_tipo in ('produtos', 'produtos-servicos') and v_qtd_produtos = 0)
    or (p_tipo in ('servicos', 'produtos-servicos') and v_qtd_servicos = 0) then
    raise exception 'Inclua ao menos um item válido de cada tipo selecionado' using errcode = '22023';
  end if;

  v_subtotal := v_produtos + v_servicos;
  v_desconto_percentual := round(v_subtotal * p_desconto_percentual / 100, 2);
  v_desconto_valor := least(p_desconto_valor, greatest(0, v_subtotal - v_desconto_percentual));

  insert into public.orcamentos (
    empresa_id, criado_por, emissor_snapshot, solicitante_snapshot, tipo, forma_pagamento, desconto_percentual, desconto_valor, frete,
    prazo_entrega, informacoes_adicionais, responsavel, subtotal_produtos, subtotal_servicos,
    subtotal, total
  ) values (
    p_empresa_id, p_criado_por, v_emissor, v_solicitante, p_tipo, p_forma_pagamento, p_desconto_percentual, v_desconto_valor, p_frete,
    nullif(p_prazo_entrega, ''), nullif(p_informacoes_adicionais, ''), nullif(p_responsavel, ''),
    v_produtos, v_servicos, v_subtotal,
    greatest(0, v_subtotal - v_desconto_percentual - v_desconto_valor) + p_frete
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
