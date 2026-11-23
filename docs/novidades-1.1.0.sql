-- Novidades da versão 1.1.0 (APK versionCode 12), para a tela Ajustes → Comunidade → Novidades.
-- Rodar no SQL Editor do Supabase (projeto Consi). A escrita em `versoes` é só de admin, então o
-- app não consegue publicar sozinho. Alternativa: Ajustes → Comunidade → Moderação → nova versão.
insert into public.versoes (versao, titulo, data, itens, publicada)
values (
  '1.1.0',
  'Mais respiro e pausas que valem',
  current_date,
  '[
    {"tipo": "novo", "texto": "Depois de escolher não abrir um app na pausa, ele fica fechado por 5 minutos. Dá para mudar o tempo ou desligar em Ajustes → Pausa e lembretes."},
    {"tipo": "melhoria", "texto": "Sair de uma pausa leva para a tela inicial do celular, não para o Consi."},
    {"tipo": "correcao", "texto": "O botão do timer da pausa agora enche junto com os segundos."},
    {"tipo": "correcao", "texto": "Lembretes e avisos da pausa aparecem na tela, não só tocam."},
    {"tipo": "novo", "texto": "Pergunta do dia por notificação, nos dias e no horário que você escolher (ajustes do Diário)."},
    {"tipo": "melhoria", "texto": "Mais de 50 perguntas do dia no Diário, e a Página de hoje também na linha do tempo."},
    {"tipo": "melhoria", "texto": "Sua semana virou uma linha do tempo do dia, com filtros de emoções e escolhas e Ver mais."},
    {"tipo": "novo", "texto": "Toque na sua foto no topo para tirar uma selfie ou escolher da galeria."},
    {"tipo": "novo", "texto": "Para você abre em Todos, com sugestões de todos os seus hobbies, e dá para sugerir uma atividade quando elas acabam."},
    {"tipo": "melhoria", "texto": "Personalizar ficou mais visual: aparência e ícone lado a lado, texto em 5 tamanhos e a aba inicial no meio da barra."},
    {"tipo": "melhoria", "texto": "Mais espaço entre as coisas em todo o app, e menos títulos repetidos em Ajustes."},
    {"tipo": "novo", "texto": "No pé de Ajustes, quantos dias do piloto já foram e o formulário no fim da semana."}
  ]'::jsonb,
  true
);
