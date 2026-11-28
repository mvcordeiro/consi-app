-- Novidades da versão 1.3.2 (APK versionCode 16), para a tela Ajustes → Comunidade → Novidades.
-- Rodar no SQL Editor do Supabase (projeto Consi). A escrita em `versoes` é só de admin.
insert into public.versoes (versao, titulo, data, itens, publicada)
values (
  '1.3.2',
  'O nome Consi em toda parte',
  current_date,
  '[
    {"tipo": "melhoria", "texto": "O ícone do app, a tela de abertura e as notificações agora mostram o nome Consi completo."},
    {"tipo": "melhoria", "texto": "O topo do Início ficou igual ao de Hobbies, com o logo no mesmo lugar."},
    {"tipo": "correcao", "texto": "Algumas atividades do Para você não abriam ao tocar. Agora o card todo abre a atividade."}
  ]'::jsonb,
  true
);
