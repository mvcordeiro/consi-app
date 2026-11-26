-- Novidades da versão 1.3.0 (APK versionCode 14), para a tela Ajustes → Comunidade → Novidades.
-- Rodar no SQL Editor do Supabase (projeto Consi). A escrita em `versoes` é só de admin.
insert into public.versoes (versao, titulo, data, itens, publicada)
values (
  '1.3.0',
  'Ideias da comunidade e um app mais leve',
  current_date,
  '[
    {"tipo": "novo", "texto": "Atividades que alguém publica para a comunidade aparecem na hora no Para você de quem tem o mesmo hobby."},
    {"tipo": "melhoria", "texto": "O Consi ficou bem menor para baixar e instalar."},
    {"tipo": "melhoria", "texto": "Mudanças pequenas chegam sozinhas ao abrir o app, sem baixar a versão inteira de novo."}
  ]'::jsonb,
  true
);
