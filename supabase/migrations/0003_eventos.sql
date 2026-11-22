-- Consi · eventos de uso do piloto (anônimos)
--
-- O app manda poucas linhas por pessoa: um código aleatório do aparelho (`install_id`), o nome do
-- evento ("pausa_seguiu", "atividade_aceita"...) e propriedades pequenas que nunca levam texto da
-- pessoa (nada de diário, emoção escrita, nome de hobby próprio ou de app). Não há login: a escrita
-- é feita com a chave pública (papel `anon`). Quem lê é só o admin (ou o SQL Editor do projeto).
-- Rodar uma vez no SQL Editor do projeto. Ver docs/supabase.md → "Eventos do piloto".

create table public.eventos (
  id bigint generated always as identity primary key,
  install_id text not null check (char_length(install_id) between 8 and 40),
  -- Só letras minúsculas e "_": novos eventos no app não precisam de migration.
  evento text not null check (evento ~ '^[a-z][a-z0-9_]{1,39}$'),
  props jsonb not null default '{}'::jsonb
    check (jsonb_typeof(props) = 'object' and pg_column_size(props) < 512),
  versao text check (char_length(versao) <= 20),
  plataforma text check (plataforma in ('android', 'ios', 'web')),
  -- Quando aconteceu no aparelho (a fila pode ser enviada depois, se estava sem rede).
  ocorreu_em timestamptz not null default now(),
  recebido_em timestamptz not null default now()
);

create index eventos_install_ocorreu on public.eventos (install_id, ocorreu_em);
create index eventos_evento_ocorreu on public.eventos (evento, ocorreu_em);

alter table public.eventos enable row level security;

-- Qualquer aparelho (com ou sem sessão anônima) pode só inserir.
create policy eventos_insert on public.eventos
  for insert to anon, authenticated
  with check (true);

-- Ler: só admin (is_admin() vem da 0001). Sem política de update/delete: ninguém altera.
create policy eventos_select_admin on public.eventos
  for select to authenticated
  using (public.is_admin());

revoke all on public.eventos from anon, authenticated;
grant insert on public.eventos to anon, authenticated;
grant select on public.eventos to authenticated;

-- Resumo por pessoa para o relatório do piloto (as 4 tarefas + dias de uso).
-- security_invoker: a RLS de `eventos` vale também aqui. No SQL Editor (papel postgres) lê tudo.
create view public.piloto_por_pessoa with (security_invoker = true) as
select
  left(install_id, 8) as codigo,
  min(ocorreu_em) as primeiro_uso,
  max(ocorreu_em) as ultimo_uso,
  count(distinct (ocorreu_em at time zone 'America/Sao_Paulo')::date) as dias_ativos,
  count(*) filter (where evento = 'app_aberto') as aberturas,
  count(*) filter (where evento = 'pausa_seguiu') as t1_abriu_app_com_pausa,
  count(*) filter (where evento in ('atividade_aceita', 'atividade_criada')) as t2_atividade_nova,
  count(*) filter (where evento = 'grupo_salvo') as t3_configurou_apps,
  count(*) filter (where evento = 'momento_criado') as t4_entrada_ou_checkin,
  count(*) filter (where evento = 'momento_criado' and props->>'escrito' = 'true') as t4_com_texto
from public.eventos
group by left(install_id, 8);

grant select on public.piloto_por_pessoa to authenticated;
