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
  foreach t in array array['empresas', 'equipamentos', 'tipos_equipamento', 'quadros_trabalho', 'produtos']
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
