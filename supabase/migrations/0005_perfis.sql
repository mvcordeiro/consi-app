-- Consi · @handle único (issue #3)
--
-- Cada sessão (anônima ou não) reserva um @handle. O handle é único entre todos; a foto continua
-- só no aparelho (ela ainda não vai para o servidor). Ninguém lê a lista de perfis: o app só
-- pergunta se um handle está livre (handle_disponivel) e grava o próprio.
-- Rodar uma vez no SQL Editor do projeto. Ver docs/supabase.md → "Perfis".

create table public.perfis (
  id uuid primary key default auth.uid(),
  handle text not null unique check (handle ~ '^[a-z0-9._]{3,20}$'),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy perfis_ver_o_proprio on public.perfis
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy perfis_criar_o_proprio on public.perfis
  for insert to authenticated with check (id = auth.uid());
create policy perfis_trocar_o_proprio on public.perfis
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy perfis_apagar_o_proprio on public.perfis
  for delete to authenticated using (id = auth.uid());

revoke all on public.perfis from anon, authenticated;
grant select, insert, update, delete on public.perfis to authenticated;

-- "Esse @ está livre?" sem expor a lista: true se ninguém (além de quem pergunta) usa o handle.
create or replace function public.handle_disponivel(h text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select h ~ '^[a-z0-9._]{3,20}$'
     and not exists (select 1 from public.perfis p where p.handle = h and p.id is distinct from auth.uid());
$$;

revoke all on function public.handle_disponivel(text) from public;
grant execute on function public.handle_disponivel(text) to authenticated;
