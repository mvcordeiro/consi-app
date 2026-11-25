-- Consi · atividades da comunidade publicam na hora
--
-- A tabela `atividades` (catálogo + comunidade) já existe no projeto, criada pela 0003_catalogo
-- da branch feat/catalogo-supabase. Até aqui, quem publicava ficava 'pendente' até o admin aprovar.
-- Agora a atividade entra 'publicada' e aparece na hora no "Para você" de quem tem o mesmo hobby.
-- O admin continua podendo esconder depois (moderacao = 'escondida'). Limite: 5 por dia.
-- Rodada no SQL Editor em 2026-11-25.

create or replace function public.atividades_antes_de_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje int;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  new.autor := auth.uid();
  new.autor_nome := public.apelido(auth.uid());
  new.origem := 'comunidade';
  new.moderacao := 'publicada';
  new.total_comentarios := 0;
  new.ordem := 0;
  new.criada_em := now();
  new.atualizada_em := now();

  select count(*) into hoje
    from public.atividades a
   where a.autor = new.autor
     and a.criada_em > now() - interval '1 day';
  if hoje >= 5 then
    raise exception 'consi_limite_diario'
      using errcode = 'P0001', hint = 'No máximo 5 atividades por dia.';
  end if;
  return new;
end;
$$;

revoke all on function public.atividades_antes_de_inserir() from public, anon, authenticated;
