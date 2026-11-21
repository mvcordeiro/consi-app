-- Consi · permissões das tabelas para a API
--
-- Projetos novos do Supabase não dão mais acesso automático às tabelas do schema public para
-- `anon` e `authenticated`: sem estes grants, a RLS nem chega a ser avaliada e tudo volta
-- "permission denied". Os grants abrem a porta; a RLS (0001) decide linha a linha.

-- Nada de TRUNCATE/TRIGGER/REFERENCES para os papéis da API (TRUNCATE ignora a RLS).
revoke truncate, trigger, references
  on public.admins, public.versoes, public.sugestoes, public.votos, public.denuncias
  from anon, authenticated;

-- Changelog: leitura pública (até sem login), escrita só admin pela RLS.
grant select on public.versoes to anon;
grant select, insert, update, delete on public.versoes to authenticated;

-- Quem entrou (anônimo ou admin). O que cada um pode fazer está nas políticas da 0001.
grant select, insert, update, delete on public.sugestoes to authenticated;
grant select, insert, update, delete on public.votos to authenticated;
grant select, insert, delete on public.denuncias to authenticated;
grant select on public.admins to authenticated;
grant select on public.sugestoes_ranking to authenticated;
