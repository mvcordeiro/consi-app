# Ajustes

A aba Ajustes reúne tudo o que a pessoa pode mudar no Consi. É uma página só, rolável, feita de
cartões. Figma: arquivo "Consi - Design de Interação", página "📱 APP // Telas do app", seção
**10 · AJUSTES**.

Plano completo (front e back-end, incluindo sugestões e changelog): decidido em 21/11/2026. As
decisões estão resumidas no fim deste arquivo.

## Ordem dos cartões

| # | Cartão | Componente | Onde os dados ficam |
|---|---|---|---|
| 1 | Personalizar | `src/components/ajustes/Personalizar.tsx` → `Personalizar` | aparelho (`consi:preferencias`) |
| 2 | Seções do Início | `Personalizar.tsx` → `SecoesInicio` | aparelho (`consi:preferencias`) |
| 3 | Pausa nos apps | `src/components/AjustesPausa.tsx` | permissões do Android (só APK) |
| 4 | Cuidado com o tempo de tela | `src/components/AjustesLembretesTela.tsx` | aparelho (só APK) |
| 5 | Comunidade | `src/app/(abas)/ajustes.tsx` (linhas `LinhaLink`) | Supabase (ver abaixo) |
| 6 | Seus dados | `src/components/ajustes/SeusDados.tsx` | — |
| 7 | Sobre | `src/components/ajustes/Sobre.tsx` | — |
| 8 | Para testes | `ajustes.tsx`, só com `__DEV__` | — |

A tela em si (`src/app/(abas)/ajustes.tsx`) só monta os cartões; cada cartão é um componente.

## Hierarquia visual

Todo cartão usa as peças de `src/components/ajustes/Cartao.tsx`:

- `CartaoAjustes`: fundo `bg/raised`, raio `radius.card`, padding `space[16]`, gap `space[16]`.
  O `rotulo` opcional vira o eyebrow (Texto/Botões e rótulos, `text/tertiary`, caixa alta). Cartões
  com um único assunto (ex.: Seções do Início) ficam sem eyebrow.
- `Ajuste`: título em Títulos/Pequeno, explicação em Texto/Pequeno `text/secondary`, controle à
  direita (`acessorio`, ex.: `Alternancia`) ou abaixo (`children`, ex.: `Filtro`s).
- `Divisoria`: 1 px `border/subtle` entre ajustes do mesmo cartão.
- `LinhaLink`: linha que abre outra tela (título, explicação, valor, ponto de "novo", "›").

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

`src/components/ajustes/ListaArrastavel.tsx`: lista genérica com altura de linha fixa.

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
hobbies ou pausa sai do aparelho. Cliente, migration e configuração: `src/data/nuvem/`,
`supabase/migrations/` e `docs/supabase.md` (em desenvolvimento noutra branch).

Enquanto a nuvem não está no ar, "Sugerir uma ideia" e "Novidades" abrem o marcador
"Em construção". Telas previstas:

| Rota | O que faz |
|---|---|
| `/ajustes/sugestoes` | lista pública: Em alta · Recentes · Planejadas · Lançadas · Minhas; votar ▲▼ |
| `/ajustes/sugestoes/nova` | título, descrição, categoria; mostra parecidas antes de enviar |
| `/ajustes/sugestoes/[id]` | detalhe, placar, resposta oficial, versão em que saiu, denunciar |
| `/ajustes/novidades` | changelog por versão, abre offline com o cache; ponto de "novo" em Ajustes |
| `/ajustes/moderacao` | fila Pendentes · Publicadas · Escondidas (só admin) |
| `/ajustes/moderacao/[id]` | aprovar, rejeitar, editar, status, responder, mesclar duplicadas |
| `/ajustes/admin-entrar` | login de admin por e-mail + código |

Regras de produto: sugestões são **pré-moderadas** (só aparecem para todos depois de aprovadas; o
autor vê a própria como "Em análise"); 1 voto por pessoa, tocar de novo tira o voto; 3 denúncias
escondem a sugestão e ela volta para a fila; até 3 sugestões por dia por pessoa.

Entrada da moderação: tocar 7 vezes seguidas na versão, no cartão Sobre (`Sobre onAdmin`). Ainda
desligada: liga quando a tela de login de admin existir.

## Sobre

Mostra a versão (`expo-application`, ou a do `app.json` no web), o build nativo (`versionCode`) e a
atualização do EAS Update em uso (8 primeiros caracteres do `updateId`, ou "do APK"). Serve para a
pessoa dizer exatamente o que tem instalado ao relatar um problema.

## Para testes

"Refazer onboarding" e "Abrir tela de pausa" só aparecem em desenvolvimento (`__DEV__`). No APK de
piloto eles não aparecem; quando a moderação existir, passam a aparecer também para o admin.

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
