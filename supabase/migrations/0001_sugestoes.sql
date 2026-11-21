-- Consi · sugestões, votos, denúncias e changelog (Supabase)
--
-- Só isto sai do aparelho. Todo o resto do app continua local-first (SQLite criptografado).
-- Quem usa o app entra com login anônimo (role `authenticated`, claim `is_anonymous = true`).
-- Admin = conta permanente (e-mail + código) com o user_id na tabela `admins`.
--
-- Pré-moderação: o público só vê sugestões `publicada`; o autor vê as próprias; o admin vê tudo.
-- Rodar uma vez no SQL Editor do projeto (ou `supabase db push`). Ver docs/supabase.md.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  criado_em timestamptz not null default now()
);

create table public.versoes (
  id uuid primary key default gen_random_uuid(),
  versao text not null check (char_length(versao) between 1 and 20),
  titulo text check (char_length(titulo) <= 80),
  data date not null default current_date,
  -- [{ "tipo": "novo" | "melhoria" | "correcao", "texto": "..." }]
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array'),
  publicada boolean not null default false,
  criada_em timestamptz not null default now()
);

create table public.sugestoes (
  id uuid primary key default gen_random_uuid(),
  -- Sem cascade: um anônimo com sugestão não some na limpeza de contas (ver docs/supabase.md).
  autor uuid not null default auth.uid() references auth.users,
  titulo text not null check (char_length(titulo) between 5 and 80),
  descricao text check (char_length(descricao) <= 1000),
  categoria text check (categoria in ('pausa', 'diario', 'hobbies', 'home', 'outro')),
  moderacao text not null default 'pendente'
    check (moderacao in ('pendente', 'publicada', 'rejeitada', 'escondida')),
  status text not null default 'aberta'
    check (status in ('aberta', 'em_analise', 'planejada', 'em_andamento', 'lancada', 'recusada')),
  resposta text check (char_length(resposta) <= 1000),
  duplicada_de uuid references public.sugestoes on delete set null,
  versao_lancada uuid references public.versoes on delete set null,
  pontos int not null default 0,
  votos_pos int not null default 0,
  votos_neg int not null default 0,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  check (duplicada_de is distinct from id)
);

create index sugestoes_moderacao_criada on public.sugestoes (moderacao, criada_em desc);
create index sugestoes_autor_criada on public.sugestoes (autor, criada_em desc);
create index sugestoes_status on public.sugestoes (status) where moderacao = 'publicada';

create table public.votos (
  sugestao uuid not null references public.sugestoes on delete cascade,
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  valor smallint not null check (valor in (-1, 1)),
  criado_em timestamptz not null default now(),
  primary key (sugestao, usuario)
);

create index votos_usuario on public.votos (usuario);

create table public.denuncias (
  sugestao uuid not null references public.sugestoes on delete cascade,
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  motivo text check (char_length(motivo) <= 500),
  criada_em timestamptz not null default now(),
  primary key (sugestao, usuario)
);

-- ---------------------------------------------------------------------------
-- is_admin(): conta permanente listada em `admins`. Um anônimo nunca é admin.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Inserção: o cliente não escolhe moderação, status, placar nem autor; limite de 3 por dia.
create or replace function public.sugestoes_antes_de_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje int;
begin
  if public.is_admin() then
    new.autor := coalesce(auth.uid(), new.autor);
    return new;
  end if;

  new.autor := coalesce(auth.uid(), new.autor);
  new.moderacao := 'pendente';
  new.status := 'aberta';
  new.resposta := null;
  new.duplicada_de := null;
  new.versao_lancada := null;
  new.pontos := 0;
  new.votos_pos := 0;
  new.votos_neg := 0;
  new.criada_em := now();
  new.atualizada_em := now();

  select count(*) into hoje
    from public.sugestoes s
   where s.autor = new.autor
     and s.criada_em > now() - interval '1 day';

  if hoje >= 3 then
    raise exception 'consi_limite_diario'
      using errcode = 'P0001', hint = 'No máximo 3 sugestões por dia.';
  end if;

  return new;
end;
$$;

create trigger sugestoes_antes_de_inserir
  before insert on public.sugestoes
  for each row execute function public.sugestoes_antes_de_inserir();

-- Atualização: `atualizada_em` só muda quando o conteúdo muda (não a cada voto).
create or replace function public.sugestoes_antes_de_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.titulo, new.descricao, new.categoria, new.moderacao, new.status,
         new.resposta, new.duplicada_de, new.versao_lancada)
     is distinct from
     row(old.titulo, old.descricao, old.categoria, old.moderacao, old.status,
         old.resposta, old.duplicada_de, old.versao_lancada) then
    new.atualizada_em := now();
  end if;
  return new;
end;
$$;

create trigger sugestoes_antes_de_atualizar
  before update on public.sugestoes
  for each row execute function public.sugestoes_antes_de_atualizar();

-- Votos: recalcula o placar no servidor (o cliente nunca conta).
create or replace function public.recalcular_placar(alvo uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sugestoes s
     set votos_pos = c.pos,
         votos_neg = c.neg,
         pontos = c.pos - c.neg
    from (
      select count(*) filter (where v.valor = 1)::int as pos,
             count(*) filter (where v.valor = -1)::int as neg
        from public.votos v
       where v.sugestao = alvo
    ) c
   where s.id = alvo;
$$;

revoke all on function public.recalcular_placar(uuid) from public, anon, authenticated;

create or replace function public.votos_depois()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalcular_placar(old.sugestao);
  end if;
  if tg_op in ('INSERT', 'UPDATE')
     and (tg_op = 'INSERT' or new.sugestao is distinct from old.sugestao) then
    perform public.recalcular_placar(new.sugestao);
  end if;
  return null;
end;
$$;

create trigger votos_depois
  after insert or update or delete on public.votos
  for each row execute function public.votos_depois();

-- Denúncias: 3 ou mais escondem a sugestão e ela volta para a fila de moderação.
create or replace function public.denuncias_depois_de_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.denuncias d where d.sugestao = new.sugestao) >= 3 then
    update public.sugestoes
       set moderacao = 'escondida'
     where id = new.sugestao
       and moderacao = 'publicada';
  end if;
  return null;
end;
$$;

create trigger denuncias_depois_de_inserir
  after insert on public.denuncias
  for each row execute function public.denuncias_depois_de_inserir();

-- Funções de trigger não são chamadas direto pela API.
revoke all on function public.sugestoes_antes_de_inserir() from public, anon, authenticated;
revoke all on function public.sugestoes_antes_de_atualizar() from public, anon, authenticated;
revoke all on function public.votos_depois() from public, anon, authenticated;
revoke all on function public.denuncias_depois_de_inserir() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.versoes enable row level security;
alter table public.sugestoes enable row level security;
alter table public.votos enable row level security;
alter table public.denuncias enable row level security;

-- admins: cada um só consegue ver a própria linha (o app usa is_admin()).
-- Sem políticas de escrita: entra pelo Studio / service role.
create policy "admins: ver a própria linha"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- sugestoes
create policy "sugestoes: ver publicadas, as próprias ou tudo (admin)"
  on public.sugestoes for select to authenticated
  using (
    moderacao = 'publicada'
    or autor = (select auth.uid())
    or (select public.is_admin())
  );

create policy "sugestoes: enviar como si mesmo"
  on public.sugestoes for insert to authenticated
  with check (autor = (select auth.uid()));

create policy "sugestoes: só admin edita"
  on public.sugestoes for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "sugestoes: admin apaga; autor apaga a própria pendente"
  on public.sugestoes for delete to authenticated
  using (
    (select public.is_admin())
    or (autor = (select auth.uid()) and moderacao = 'pendente')
  );

-- votos: cada um só mexe no próprio, e só em sugestão publicada.
-- Votar = upsert em (sugestao, usuario); tocar de novo no mesmo botão = delete.
create policy "votos: ver os próprios"
  on public.votos for select to authenticated
  using (usuario = (select auth.uid()));

create policy "votos: votar em publicada"
  on public.votos for insert to authenticated
  with check (
    usuario = (select auth.uid())
    and exists (
      select 1 from public.sugestoes s
       where s.id = sugestao and s.moderacao = 'publicada'
    )
  );

create policy "votos: trocar o próprio voto em publicada"
  on public.votos for update to authenticated
  using (usuario = (select auth.uid()))
  with check (
    usuario = (select auth.uid())
    and exists (
      select 1 from public.sugestoes s
       where s.id = sugestao and s.moderacao = 'publicada'
    )
  );

create policy "votos: tirar o próprio voto em publicada"
  on public.votos for delete to authenticated
  using (
    usuario = (select auth.uid())
    and exists (
      select 1 from public.sugestoes s
       where s.id = sugestao and s.moderacao = 'publicada'
    )
  );

-- Admin vê e move votos (mesclar duplicadas).
create policy "votos: admin"
  on public.votos for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- denuncias: cada um denuncia uma vez o que consegue ver publicado; só admin lê.
create policy "denuncias: denunciar como si mesmo"
  on public.denuncias for insert to authenticated
  with check (
    usuario = (select auth.uid())
    and exists (
      select 1 from public.sugestoes s
       where s.id = sugestao and s.moderacao = 'publicada'
    )
  );

create policy "denuncias: admin lê"
  on public.denuncias for select to authenticated
  using ((select public.is_admin()));

create policy "denuncias: admin apaga"
  on public.denuncias for delete to authenticated
  using ((select public.is_admin()));

-- versoes: changelog público quando publicado (dá para ler até sem login); escrita só admin.
create policy "versoes: ver publicadas ou tudo (admin)"
  on public.versoes for select to anon, authenticated
  using (publicada or (select public.is_admin()));

create policy "versoes: admin cria"
  on public.versoes for insert to authenticated
  with check ((select public.is_admin()));

create policy "versoes: admin edita"
  on public.versoes for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "versoes: admin apaga"
  on public.versoes for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Ranking "Em alta": pontos / (horas + 2)^1.5. security_invoker = respeita a RLS de quem lê.
-- ---------------------------------------------------------------------------

create view public.sugestoes_ranking
with (security_invoker = true)
as
select
  s.*,
  (s.pontos / power(extract(epoch from (now() - s.criada_em)) / 3600.0 + 2, 1.5))::float8 as calor
from public.sugestoes s
where s.moderacao = 'publicada';

revoke all on public.sugestoes_ranking from anon;
grant select on public.sugestoes_ranking to authenticated;

-- ---------------------------------------------------------------------------
-- Mesclar duplicadas (só admin): os votos da origem passam para o destino (quem votou nas
-- duas fica com o voto que já tinha no destino), a origem sai da lista e aponta para o destino.
-- ---------------------------------------------------------------------------

create or replace function public.mesclar_sugestoes(origem uuid, destino uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'consi_sem_permissao' using errcode = '42501';
  end if;
  if origem = destino then
    raise exception 'consi_mesclar_mesma' using errcode = '22023';
  end if;
  if not exists (select 1 from public.sugestoes where id = destino) then
    raise exception 'consi_destino_inexistente' using errcode = '22023';
  end if;

  insert into public.votos (sugestao, usuario, valor, criado_em)
  select destino, v.usuario, v.valor, v.criado_em
    from public.votos v
   where v.sugestao = origem
  on conflict (sugestao, usuario) do nothing;

  delete from public.votos where sugestao = origem;

  update public.sugestoes
     set duplicada_de = destino,
         moderacao = 'escondida'
   where id = origem;
end;
$$;

revoke all on function public.mesclar_sugestoes(uuid, uuid) from public, anon;
grant execute on function public.mesclar_sugestoes(uuid, uuid) to authenticated;
