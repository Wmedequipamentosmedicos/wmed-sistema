-- Execute no SQL Editor do Supabase para habilitar o catálogo de serviços
-- usado na criação de orçamentos.

create table if not exists public.servicos (
  id bigint generated always as identity primary key,
  nome text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists servicos_nome_idx on public.servicos (lower(nome));

alter table public.servicos enable row level security;

drop policy if exists servicos_ler on public.servicos;
create policy servicos_ler on public.servicos
  for select to authenticated
  using (public.usuario_ativo());

drop policy if exists servicos_inserir on public.servicos;
create policy servicos_inserir on public.servicos
  for insert to authenticated
  with check (public.usuario_ativo());

drop policy if exists servicos_alterar on public.servicos;
create policy servicos_alterar on public.servicos
  for update to authenticated
  using (public.usuario_ativo())
  with check (public.usuario_ativo());

drop policy if exists servicos_excluir on public.servicos;
create policy servicos_excluir on public.servicos
  for delete to authenticated
  using (public.usuario_admin());
