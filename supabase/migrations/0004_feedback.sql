-- Consi · feedback privado (issue #16)
--
-- Diferente das Sugestões (públicas, com voto), o feedback é só para a equipe: bug, elogio, ideia
-- ou outro. Vai com a sessão anônima que as Sugestões já usam (auth.uid()), com a versão do app e o
-- aparelho preenchidos pelo app, e um print opcional no bucket privado `feedback`.
-- Quem lê é só o admin (is_admin() vem da 0001) ou o SQL Editor / Table Editor do projeto.
-- Rodar uma vez no SQL Editor do projeto. Ver docs/supabase.md → "Feedback".

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid(),
  tipo text not null check (tipo in ('bug', 'elogio', 'ideia', 'outro')),
  texto text not null check (char_length(texto) between 3 and 2000),
  -- Caminho no bucket `feedback` ("<autor>/<arquivo>.jpg"), se a pessoa anexou um print.
  print text check (char_length(print) <= 200),
  versao text check (char_length(versao) <= 20),
  plataforma text check (plataforma in ('android', 'ios', 'web')),
  sistema text check (char_length(sistema) <= 40),
  aparelho text check (char_length(aparelho) <= 80),
  criado_em timestamptz not null default now()
);

create index feedback_criado on public.feedback (criado_em desc);

alter table public.feedback enable row level security;

-- Inserir: só a própria sessão (anônima ou não), no máximo 5 por dia.
create or replace function public.feedback_antes_de_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje int;
begin
  new.autor := auth.uid();
  new.criado_em := now();
  if new.autor is null then
    raise exception 'consi_sem_sessao' using errcode = 'P0001';
  end if;

  select count(*) into hoje
    from public.feedback f
   where f.autor = new.autor
     and f.criado_em > now() - interval '1 day';

  if hoje >= 5 and not public.is_admin() then
    raise exception 'consi_limite_diario'
      using errcode = 'P0001', hint = 'No máximo 5 feedbacks por dia.';
  end if;

  return new;
end;
$$;

create trigger feedback_antes_de_inserir
  before insert on public.feedback
  for each row execute function public.feedback_antes_de_inserir();

create policy feedback_insert on public.feedback
  for insert to authenticated
  with check (autor = auth.uid());

-- Ler: só admin. Sem update/delete: ninguém altera pelo app.
create policy feedback_select_admin on public.feedback
  for select to authenticated
  using (public.is_admin());

revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to authenticated;
grant select on public.feedback to authenticated;

-- Prints: bucket privado, até 5 MB, só imagens. Cada sessão só envia para a própria pasta e
-- ninguém além do admin consegue ler (nem quem enviou).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy feedback_print_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);

create policy feedback_print_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'feedback' and public.is_admin());
