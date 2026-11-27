-- Consi · atividades da comunidade mostram o @handle de quem publicou
--
-- Até aqui o autor aparecia sempre como apelido gerado ("Capivara Alegre"), mesmo para quem já
-- tinha reservado um @ (0005). Agora o @handle vem primeiro; só quem não reservou um continua com
-- o apelido. Quem desliga "mostrar autor" segue anônimo: o app esconde o nome na leitura.
-- Rodar uma vez no SQL Editor do projeto.

create or replace function public.atividades_antes_de_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje int;
  arroba text;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  select '@' || p.handle into arroba from public.perfis p where p.id = auth.uid();

  new.autor := auth.uid();
  new.autor_nome := coalesce(arroba, public.apelido(auth.uid()));
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

-- As já publicadas por quem tem @ passam a mostrá-lo.
update public.atividades a
   set autor_nome = '@' || p.handle
  from public.perfis p
 where a.origem = 'comunidade'
   and a.autor = p.id;
