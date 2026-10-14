-- Execute no SQL Editor do Supabase para habilitar o cadastro de produtos
-- em um banco que já foi criado usando schema.sql.

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

alter table public.produtos enable row level security;

drop policy if exists produtos_ler on public.produtos;
create policy produtos_ler on public.produtos
  for select to authenticated
  using (public.usuario_ativo());

drop policy if exists produtos_inserir on public.produtos;
create policy produtos_inserir on public.produtos
  for insert to authenticated
  with check (public.usuario_ativo());

drop policy if exists produtos_alterar on public.produtos;
create policy produtos_alterar on public.produtos
  for update to authenticated
  using (public.usuario_ativo())
  with check (public.usuario_ativo());

drop policy if exists produtos_excluir on public.produtos;
create policy produtos_excluir on public.produtos
  for delete to authenticated
  using (public.usuario_admin());

grant usage, select on sequence public.produtos_codigo_interno_seq to authenticated;

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
