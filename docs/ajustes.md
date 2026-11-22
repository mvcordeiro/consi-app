# Ajustes

A aba Ajustes é um índice: uma linha por assunto, e cada linha abre a sua página. Figma: arquivo
"Consi - Design de Interação", página "📱 APP // Telas do app", seção **10 · AJUSTES**.

Plano completo (front e back-end, incluindo sugestões e changelog): decidido em 21/11/2026. As
decisões estão resumidas no fim deste arquivo.

## Índice e páginas

| Linha do índice | Rota | O que tem | Onde os dados ficam |
|---|---|---|---|
| Personalizar aparência | `/ajustes/personalizar` | aparência, tamanho do texto, reduzir movimento, vibração, abrir o app em, seções do Início | aparelho (`consi:preferencias`) |
| Pausa e lembretes (só APK Android) | `/ajustes/pausa` | `AjustesPausa` (permissões) e `AjustesLembretesTela` | aparelho |
| Comunidade (só com Supabase) | `/ajustes/comunidade` | Sugestões, Novidades e, para o admin, Moderação | Supabase |
| Privacidade e dados | `/ajustes/privacidade` | o que fica onde, `SeusDados` (exportar e apagar) | — |
| Sobre | `/ajustes/sobre` | versão, segurança, código aberto, por que fora da loja | — |
| Para testes (dev ou admin) | `/ajustes/testes` | refazer onboarding, abrir a pausa | — |

O índice (`src/app/(abas)/ajustes.tsx`) só lista; as páginas ficam em `src/app/ajustes/` e usam
`TelaAjustes` (área segura, "‹ Ajustes", título grande, rodapé e aviso opcionais).

## Hierarquia visual

Tudo direto no fundo: **sem cartões e sem eyebrows**. Peças de `src/components/ajustes/Cartao.tsx`:

- `Ajuste`: título em Títulos/Pequeno, explicação em Texto/Pequeno `text/secondary`, controle à
  direita (`acessorio`, ex.: `Alternancia`) ou abaixo (`children`, ex.: `Filtro`s); 16 px em cima e embaixo.
- `Divisoria`: 1 px `border/subtle` entre um ajuste e outro.
- `LinhaLink`: linha que abre outra página (título, explicação, valor, ponto de "novo", "›").
- `ListaLinks`: põe `Divisoria` entre as `LinhaLink` (índice, Comunidade).

As listas da Comunidade seguem a mesma regra: sugestões e versões são linhas separadas por
divisória, e cada bloco da moderação começa com uma divisória em vez de um cartão.

## Personalizar

Preferências locais em `src/data/preferencias.ts` (store com `useSyncExternalStore`, gravado na
chave `consi:preferencias` da tabela `estado` do banco criptografado).

| Ajuste | Campo | Valores | Onde é aplicado |
|---|---|---|---|
| Aparência | `aparencia` | `sistema` · `light` · `dark` | `ComAparencia` em `src/app/_layout.tsx` |
| Tamanho do texto | `tamanhoTexto` | `normal` · `grande` (×1,15) | `Texto` (`FATOR_TEXTO`); soma com a fonte do sistema |
| Reduzir movimento | `movimento` | `sistema` · `reduzido` · `normal` | `useMovimentoReduzido()`: `Aparecer`, `BalaoEmocao`, revelações dos Drops, animação das abas |
| Vibração | `vibracao` | `true` · `false` | `src/data/haptica.ts` (todas as vibrações passam por ele) |
| Abrir o app em | `abaInicial` | `index` · `hobbies` · `diario` | `src/app/(abas)/_layout.tsx`; vale na próxima abertura |
| Seções do Início | `secoesHome` | lista ordenada de `{ id, visivel }` | `src/app/(abas)/index.tsx` |

Regras:

- `normalizar()` aceita qualquer coisa gravada: valores desconhecidos voltam ao padrão e seções novas
  entram no fim da lista. Adicionar uma seção nova na Home = incluir em `SecaoHome`, `SECOES`,
  `NOMES_SECOES` e no `switch` de `index.tsx`.
- A chave antiga `consi:aparencia` é migrada uma vez e apagada.
- Use `useMovimentoReduzido()` em toda animação nova com deslocamento, escala ou loop. Com ele
  ligado: sem loop, sem deslocamento, fade de no máximo 150 ms.
- Nunca chame `expo-haptics` direto: use `vibrarImpacto`, `vibrarSelecao`, `vibrarSucesso`.
- "Exportar meus dados" já inclui as preferências (exporta a tabela `estado` inteira); "Apagar tudo"
  as remove junto com o banco.

### Seções do Início (lista arrastável)

`src/components/ajustes/ListaArrastavel.tsx`: lista genérica com altura de linha fixa, direto no
fundo (sem caixa), linhas separadas por 1 px. Só a linha que está sendo arrastada ganha fundo
`bg/selected` e cantos `radius.card`.

- Segure o pegador (6 pontos, à direita) e arraste; as outras linhas abrem espaço, vibra a cada
  troca de posição e grava ao soltar (`moverSecao(id, posicao)`).
- Enquanto arrasta, a página não rola (`Tela travarRolagem`) e o gesto das abas não pode roubar o
  toque (`onPanResponderTerminationRequest: false`).
- Leitor de tela: o pegador é `adjustable`, com as ações "Subir" e "Descer".
- A chave de cada linha mostra/esconde a seção; escondida aparece como "Escondida" em
  `text/tertiary`. O topo e a hero da Home não entram na lista: estão sempre lá.

## Deslizar entre abas

`src/components/GestoAbas.tsx`, montado em volta do navegador em `src/app/(abas)/_layout.tsx`.

- Deslizar o dedo para a esquerda vai para a aba da direita na barra, e vice-versa
  (Hobbies · Diário · Início · Social · Ajustes). Não dá a volta nas pontas.
- Só JS (sem `react-native-pager-view`), então chega por EAS Update. A transição é a `shift` das
  Tabs, ou nenhuma com "Reduzir movimento".
- O gesto pede o toque na fase de bolha e só quando o movimento é claramente horizontal
  (`|dx| > 16` e `|dx| > 2·|dy|`); troca com 70 px ou velocidade 0,45. Assim, qualquer gesto de dentro
  da tela ganha antes: arrastar drops e sugestões (`Arraste`), deslizar check-ins, carrosséis
  horizontais, o pegador da lista de Ajustes. Rolagem vertical segue normal.
- Fica desligado no modo imersivo da Home (escolha da emoção).
- O `screenLayout` das Tabs não chega ao navegador do expo-router; por isso o gesto envolve o
  navegador inteiro e descobre a aba atual com `useSegments()`. A ordem fica em `ORDEM_ABAS` e
  precisa acompanhar os `<Tabs.Screen>`.

## Comunidade (Sugestões e Novidades)

Back-end: Supabase com login anônimo, só para sugestões, votos e changelog. Nada do diário,
hobbies ou pausa sai do aparelho. Dados: `src/data/nuvem/` (cliente, `sugestoes`, `novidades`,
`moderacao`, `tipos`); banco e regras: `supabase/migrations/`; configuração do projeto e do admin:
`docs/supabase.md`.

O cartão Comunidade só aparece quando `app.json → expo.extra.supabase` tem URL e chave
(`nuvemConfigurada()`). O login anônimo só acontece ao abrir Sugestões (ou votar); Novidades e o
ponto de "novo" leem sem criar conta.

### Telas (`src/app/ajustes/`)

| Rota | O que faz |
|---|---|
| `/ajustes/sugestoes` | lista pública: Em alta · Recentes · Planejadas · Lançadas · Minhas; votar, puxar para atualizar, "Carregar mais" (20 por página) |
| `/ajustes/sugestoes/nova` | título (5–80), detalhes (até 1000), categoria; mostra até 3 publicadas parecidas para votar em vez de duplicar; tela de "Recebemos" ao enviar |
| `/ajustes/sugestoes/[id]` | detalhe, votos, resposta oficial, versão em que saiu; autor vê "Em revisão" e pode apagar enquanto pendente; os outros podem denunciar |
| `/ajustes/novidades` | changelog por versão (Novo · Melhorias · Correções + Ideias da comunidade); abre offline com o cache e marca a versão como vista |
| `/ajustes/admin-entrar` | login de admin (e-mail e senha de uma conta criada no painel do Supabase e listada em `admins`) |
| `/ajustes/moderacao` | fila Pendentes · Publicadas · Rejeitadas · Escondidas (com contadores) e Versões; "Sair" no topo |
| `/ajustes/moderacao/[id]` | aprovar/rejeitar (motivo só para o autor), esconder/publicar, status (Lançada pede a versão), resposta oficial, editar texto, juntar com parecida, apagar spam, denúncias |
| `/ajustes/moderacao/versao` | criar/editar nota de versão (sem `id` cria): número, data, título, itens por tipo, publicada |

Peças comuns em `src/components/comunidade/`: `TelaComunidade` (área segura, "‹ Ajustes", título,
rodapé fixo, aviso), `CardSugestao`, `BotoesVoto` (voto otimista: muda na hora, acerta com o placar
do servidor e desfaz com aviso se falhar), `Carregando`/`FalhaNuvem`/`Vazio`, `useCarregar` e
`rotulos.ts` (nomes de status, categorias, moderação e a frase de cada erro).

Regras de produto: sugestões são **pré-moderadas** (só aparecem para todos depois de aprovadas; o
autor vê a própria como "Aguardando revisão"); 1 voto por pessoa e ninguém vota na própria; tocar no
mesmo voto tira o voto; 3 denúncias escondem a sugestão e ela volta para a fila; até 3 sugestões por
dia por pessoa (o servidor recusa a 4ª e a tela explica).

Entrada da moderação:

- **Em desenvolvimento** (`npx expo start`: Expo Go, web local, dev client): Ajustes → Comunidade →
  Moderação sempre aparece. Sem sessão de admin, abre o login.
- **No APK**: escondida. Tocar 7 vezes seguidas na versão (Ajustes → Sobre) abre o login; depois de
  entrar, a página Comunidade ganha a linha "Moderação" e "Para testes" aparece no índice.

Login: a conta de admin do Supabase (Authentication → Users, listada em `admins`; ver
`docs/supabase.md` → "Virar admin"). A sessão fica no aparelho até tocar em "Sair" na Moderação.

Aprovar uma sugestão: Moderação → aba Pendentes → tocar na sugestão → "Aprovar e publicar" (ou
"Rejeitar", com motivo que só o autor vê). Na mesma tela: status, resposta oficial, editar, juntar
com parecida e apagar. Notas de versão: aba Versões → "Nova versão" → ligar "Publicada".

Rotas index de `app/ajustes` aparecem como `…/index` nos tipos gerados do expo-router (há também a
aba `ajustes`); por isso os links usam `'/ajustes/sugestoes' as Href` e equivalentes.

## Sobre

Linguagem simples, sem dados de build: "Consi · Versão 1.0.0" (`app.json → expo.version`, via
`versaoDoApp()`), e por que dá para confiar no app mesmo fora da Play Store:

- os registros ficam só no aparelho, sem conta;
- o banco é criptografado (SQLCipher) e a chave fica no cofre do Android (`expo-secure-store`);
- o que sai do celular: só sugestões e votos, sem nome nem e-mail;
- código aberto sob a licença de `expo.extra.sobre.licenca`, com o botão "Ver o código no GitHub"
  para `expo.extra.sobre.repositorio` (os dois dá para trocar por EAS Update);
- por que não está na loja (piloto; instalador gerado pelo EAS a partir do mesmo código);
- com o que é feito (Expo e React Native, SQLite criptografado, Supabase só na Comunidade).

Antes de distribuir: o repositório precisa estar público para o link abrir, e o `LICENSE` precisa
nomear o dono do Consi (hoje é o do modelo da Expo).

## Para testes

"Refazer onboarding" e "Abrir tela de pausa" aparecem em desenvolvimento (`__DEV__`) ou quando o
aparelho está com sessão de admin. Para quem testa o APK de piloto, não aparecem.

## Como verificar

1. `npx tsc --noEmit` e `npx expo lint`.
2. `npx expo start --web` (ou o APK de desenvolvimento), aba Ajustes:
   - Aparência Claro/Escuro muda o app todo na hora; o contraste das chaves segue legível nos dois.
   - Texto Maior aumenta todos os textos; Reduzir movimento deixa os balões da Home parados.
   - Arraste uma seção e confira a ordem no Início; esconda uma e veja que ela some.
   - Feche e abra o app: tudo continua igual; "Abrir o app em" abre na aba escolhida.
3. Deslize para os lados em cada aba: troca para a vizinha e para nas pontas. Arrastar drops,
   deslizar check-ins e o pegador da lista não trocam de aba.
4. Exportar meus dados: o JSON tem `estado["consi:preferencias"]`.

## Decisões (21/11/2026)

- Supabase com login anônimo, só para a comunidade; o resto continua local.
- Painel de moderação dentro do app, sem site.
- Pré-moderação.
- Changelog vindo do Supabase, com cache local.
- Seções do Início reordenadas arrastando (sem setas).
- Deslizar entre abas em todo o app.
- (22/11) Ajustes vira índice de páginas; nada de cartões nem eyebrows; Sobre simples e voltado a
  mostrar que o app é seguro e aberto.
