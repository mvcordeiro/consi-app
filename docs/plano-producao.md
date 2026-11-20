# Consi · plano para sair do protótipo

Estado em 20/11/2026: app Expo SDK 58 (React Native 0.88, Expo Router), Android + iPhone, dados só no
aparelho (AsyncStorage), sem login. Roda no navegador para testes. O coração do produto (a pausa antes de
abrir um app) ainda é simulado: hoje nada intercepta os apps de verdade.

Ordem sugerida: **1 → 2 → 3 → 4 → 5**. Cada fase termina em algo que dá para testar no celular.
Decisões já tomadas estão no fim do documento (local-first, APK solto em piloto, sem domínio, Android primeiro).

---

## 1. Distribuição: APK com atualizações

**Dá para hospedar num domínio?** Dá, mas só como vitrine. O Expo Router exporta o app para web
(`npx expo export -p web`) e o resultado pode ir para EAS Hosting, Vercel ou Netlify. Só que a web nunca vai
fazer o que o Consi promete: ela não vê os outros apps, não pausa nada e não grava em segundo plano. Use o
domínio para landing page, lista de espera e demo do Diário/Hobbies. O produto é o APK.

**APK com atualizações (EAS):**

1. `eas.json` com três perfis:
   - `development`: dev build com o expo-dev-client (o que já precisamos por causa do expo-audio).
   - `preview`: APK instalável (`"android": { "buildType": "apk" }`, `"distribution": "internal"`); o EAS
     gera um link de download.
   - `production`: AAB para a Play Store.
2. **Atualizações de JS/telas sem reinstalar:** `expo-updates` + EAS Update, com canais `preview` e
   `production` e `runtimeVersion` pela política `fingerprint`. Mudança de tela, texto ou lógica chega
   sozinha na próxima abertura.
3. **Mudança nativa** (pacote novo com código nativo, permissão nova, módulo de bloqueio) não vai por OTA:
   precisa de APK novo. Para o APK fora da loja, uma tela "Nova versão disponível" que confere a versão num
   endpoint e abre o link do EAS.
4. **Recomendação:** em vez de distribuir só o APK solto, usar o teste interno/fechado da Play Store desde
   cedo. Atualiza sozinho, é grátis depois da conta de desenvolvedor e já valida as políticas de permissão
   (fase 4), que são o maior risco do Consi.
5. Ícone, nome do pacote (`com.consi.app` ou similar), splash e versão (`version` / `versionCode`) no
   `app.json`. Assinatura gerenciada pelo EAS.

### Como está configurado (fase 1 feita)

- `eas.json`: perfis `development` (dev client, APK interno), `preview` (APK, `distribution: internal`,
  canal `preview`) e `production` (AAB, canal `production`). `appVersionSource: local`: a versão vale o
  que está no `app.json`.
- `app.json`: `android.package = com.consi.app`, `version 1.0.0`, `android.versionCode 1`,
  `runtimeVersion` pela política `fingerprint`, `updates.url` (ainda com o project ID a preencher) e a
  splash com fundo `orange/50` (claro) e `blue/900` (escuro).
- **OTA (JS e telas):** o `expo-updates` confere o canal ao abrir o app, baixa em segundo plano e aplica na
  abertura seguinte. Com `fingerprint`, uma atualização só chega aos APKs com o mesmo código nativo.
- **"Nova versão disponível"** (`src/components/AvisoNovaVersao.tsx` + `src/data/versaoNativa.ts`): no APK
  Android, ao abrir, lê o JSON em `expo.extra.versaoNativa.url` e, se o `versionCode` de lá for maior que
  o instalado, mostra uma Folha com o botão "Baixar nova versão". Formato do arquivo em
  `docs/consi-versao.exemplo.json`. Fora do Android, no modo dev ou sem URL configurada, não faz nada.
- **Ícones e splash:** gerados do frame do favicon no Figma (Consi - Design de Interação, 767:6595):
  `icon.png`, `favicon.png`, `android-icon-*.png` e `splash-icon(-dark).png`. O símbolo é branco sobre
  `blue/900`; na splash clara, o símbolo vai em `blue/900`.

### Passo a passo (com a sua conta Expo)

1. Criar a conta em expo.dev (se ainda não tiver) e entrar: `npx eas-cli@latest login`.
2. Ligar o projeto à conta: `npx eas-cli@latest init`. Grava o `extra.eas.projectId` no `app.json`.
3. Configurar o EAS Update: `npx eas-cli@latest update:configure`. Troca o `updates.url` pelo endereço
   com o seu project ID (`https://u.expo.dev/<project-id>`). Conferir que o `eas.json` continua com os
   canais `preview` e `production`.
4. Trocar os ícones e a splash do template pelos do Consi.
5. Gerar o APK do piloto (o EAS cria e guarda a chave de assinatura na primeira vez; aceite):

   ```
   npx eas-cli@latest build --profile preview -p android
   ```

   No fim sai um link de download do APK. É esse link que vai para as pessoas do piloto.
6. Publicar uma mudança de JS/telas para quem já tem o APK:

   ```
   npx eas-cli@latest update --channel preview --environment preview --message "o que mudou"
   ```

   (`--environment` é obrigatório a partir do SDK 55.) Chega na segunda abertura do app.
7. Para o aviso "Nova versão disponível": hospedar um JSON público no formato de
   `docs/consi-versao.exemplo.json` (ex.: um gist ou arquivo "raw" do GitHub) e pôr o endereço em
   `expo.extra.versaoNativa.url` no `app.json` (pode ir por EAS Update).
8. **A cada mudança nativa** (pacote com código nativo, permissão nova, módulo da fase 3): subir
   `android.versionCode` (e `version`, se quiser) no `app.json`, rodar o build do passo 5 e depois
   atualizar o JSON do passo 7 com o novo `versionCode` e o link do APK novo.
9. Dev build para desenvolver no celular (precisa por causa do expo-audio):
   `npx eas-cli@latest build --profile development -p android`, instalar o APK e rodar `npx expo start`.

## 2. Back-end e dados

Duas opções, que podem conviver (começar local e oferecer conta depois):

| | No aparelho (local-first) | Conta com Google (nuvem) |
|---|---|---|
| Onde ficam os dados | SQLite no celular | Postgres (Supabase) ou Firestore |
| Login | nenhum | Google |
| Privacidade | máxima: nada sai do celular | depende de criptografia e políticas |
| Trocar de celular | só com backup/exportação | automático |
| Custo | zero | plano gratuito no começo |
| Esforço | baixo | médio |

**Passos comuns às duas:**
- Trocar o AsyncStorage por **expo-sqlite** (tabelas: momentos, anexos, marcadores, grupos, regras de pausa,
  resistências, hobbies). O AsyncStorage não serve para histórico longo nem para busca. A camada
  `src/data/momentos.ts` já centraliza o acesso, então a troca fica num lugar só.
- Criptografar o banco local: o diário guarda emoções e texto íntimo. A chave fica no `expo-secure-store`.
  Conferir na doc do SDK 58 o suporte do expo-sqlite a SQLCipher.
- Áudios e fotos: copiar para a pasta do app (`expo-file-system`), não deixar no cache.
- Exportar e apagar tudo (Ajustes): obrigatório pela LGPD e útil como backup.

**Se tiver conta (recomendação: Supabase):**
- Login com Google pelo `@react-native-google-signin/google-signin` (nativo) + `supabase.auth.signInWithIdToken`.
- Row Level Security em todas as tabelas (cada pessoa só lê o que é dela). Áudio e foto num bucket privado.
- Sincronização: o local continua sendo a fonte de verdade e envia mudanças quando há rede.
- Avaliar criptografia ponta a ponta do texto do diário (o servidor guarda só o texto cifrado).
- O Social (grupos de apoio) só existe com back-end, então a decisão de ter conta também decide o Social.

## 3. O coração do app: pausar apps de verdade (Android)

Hoje a pausa é uma tela que nós abrimos. Para funcionar com os apps reais é preciso um **módulo nativo**
(Expo Modules API + config plugin, sem editar `android/` à mão):

- **Usage Access** (`PACKAGE_USAGE_STATS`): saber qual app está em primeiro plano e quanto tempo foi usado
  (para "Cuidar tempo" e "Sua semana").
- Abrir a pausa por cima do app: Accessibility Service **ou** overlay (`SYSTEM_ALERT_WINDOW`) + serviço em
  primeiro plano. A Play Store é muito rígida com Accessibility; precisa de justificativa e declaração.
- Lista de apps instalados (no lugar dos ícones de exemplo do onboarding): `QUERY_ALL_PACKAGES` também é
  restrita na Play; preferir `<queries>` só para os apps escolhidos, se der.
- **iPhone:** o equivalente é a Screen Time API (FamilyControls, DeviceActivity), que exige pedir o
  entitlement à Apple. É um projeto à parte e pode vir depois do Android.

### Como está feito (fase 3, Android)

**Escolha:** Acesso de uso + sobrepor + serviço em primeiro plano, **sem** Accessibility Service. No
Android 13+, apps instalados fora da loja não conseguem ligar a Acessibilidade sem o passo escondido
"Permitir configurações restritas", e a Play Store é rígida com ela. Sobrepor não tem essa trava.

- **Módulo nativo local** `modules/consi-pausa` (Expo Modules API, Kotlin, autolinking; nada em `android/`
  à mão). O manifesto do módulo entra sozinho no app: `PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW`,
  `FOREGROUND_SERVICE(_SPECIAL_USE)`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` e um `<queries>`
  só para o menu de apps (sem `QUERY_ALL_PACKAGES`).
- **Vigia** (`VigiaService.kt`): serviço em primeiro plano (tipo `specialUse`, notificação fixa discreta)
  que a cada ~0,7 s vê o último app que veio para a frente (`UsageStatsManager.queryEvents`). Com a
  tela apagada, olha a cada 3 s e não faz nada. Volta sozinho depois de reiniciar o celular.
  - **Apenas pausar:** abre `consi://pausa?app=<pacote>&grupo=<id>&origem=vigia` por cima do app. Depois
    do "Quanto tempo você precisa?", o app fica liberado por aqueles minutos e o Consi abre o app. Se o
    tempo acaba com o app aberto, a pausa volta. Sair da pausa sem escolher e voltar ao app = pausa de novo.
  - **Cuidar tempo:** a cada X minutos seguidos no app, uma notificação ("Você está há X min no …"); tocar
    nela abre a pausa. Se o grupo diz que ignorar leva à pausa, ela abre 1 minuto depois do lembrete.
  - Telas iniciais (launchers), a barra do sistema e o próprio Consi nunca são pausados.
  - Sem a permissão de sobrepor, o Android bloqueia abrir a tela por cima: a pausa vira uma notificação.
- **Regras:** `src/data/vigia.ts` manda os grupos para o Android (SharedPreferences) sempre que mudam, e
  liga o vigia quando há Acesso de uso (a não ser que a pessoa tenha desligado em Ajustes).
- **Apps de verdade** (`src/data/apps.ts`): a lista do menu de apps com nome e ícone reais. O onboarding
  mostra até 9: primeiro os conhecidos que estão instalados (Instagram, TikTok, YouTube…), depois os das
  categorias social, vídeo, jogo, áudio, notícias e imagem. Os apps postos em "Me perco no tempo" e "Abro
  no automático" viram **acompanhados** e entram no Livre (que pausa); os de "Não me incomoda" e o resto
  do celular ficam de fora. Pôr um app num grupo também o torna acompanhado. Grupos antigos com os ids de
  exemplo ("instagram") passam para o pacote instalado sozinhos.
- **Permissões:** o Continuar da tela F1 do onboarding abre o Acesso de uso do Android e segue sozinho
  quando a pessoa volta com ele ligado (um segundo toque segue sem). Ajustes ganhou "Pausa nos apps",
  com as três permissões (Acesso de uso, Sobrepor, Notificações), o que deixa de funcionar sem cada uma
  e o liga/desliga. Explicações no tom do Consi e a tela dedicada a Sobrepor são da fase 4.
- **Tempo de uso:** `ConsiPausa.usoPorApp(inicio, fim)` já devolve os minutos por app (eventos de uso),
  pronto para "Sua semana". Mostrar na Home ainda pede design.
- Navegador e iPhone seguem como antes: apps de exemplo e a pausa aberta só por dentro do Consi.

**Para testar no celular** (precisa de APK novo: é mudança nativa): subir `android.versionCode`, gerar o
`preview` (passo 5 da fase 1), instalar, fazer o onboarding (ou "Refazer onboarding"), ligar o Acesso de
uso no F1 e, em Ajustes → Pausa nos apps, ligar Sobrepor e Notificações. Abrir um app que está no Livre.

**Pendente:** o código Kotlin ainda não foi compilado (não há Android SDK neste computador); o primeiro
build do EAS é a verificação. Alguns fabricantes (Xiaomi, Samsung com economia de bateria) matam serviços
em segundo plano: testar e, se precisar, pedir para tirar o Consi da otimização de bateria.

## 4. Permissões e acessibilidade (antes de qualquer APK público)

**Permissões:** pedir cada uma só quando for usada, com uma tela explicando o porquê no tom do Consi
(o onboarding já tem a tela F1 de permissões).

| Permissão | Para quê | Quando pedir |
|---|---|---|
| Microfone | áudio no Diário | ao tocar no microfone |
| Câmera / fotos | foto no Diário e nos hobbies | ao tocar na câmera |
| Notificações | lembretes e "Cuidar tempo" | depois de criar a primeira regra |
| Acesso de uso | saber que app está aberto | no onboarding, tela F1 |
| Sobrepor / Acessibilidade | mostrar a pausa | no onboarding, com explicação dedicada |

Recusar qualquer uma não pode quebrar o app: mostrar o que deixa de funcionar e como ligar depois.

**Acessibilidade:**
- TalkBack: rótulo em todo botão de ícone (boa parte já tem `accessibilityLabel`), ordem de leitura e
  anúncio dos avisos.
- Fonte grande do sistema: testar com 130% e 200%; o design usa alturas fixas em vários lugares.
- Contraste: revisar todos os pares de cor nos modos Claro e Escuro (já achamos dois casos no Diário).
- "Reduzir animações": respeitar `AccessibilityInfo.isReduceMotionEnabled` (balões flutuando, revelação
  palavra por palavra).
- Alternativa ao arraste: todo gesto (arrastar emoção até a cabeça, deslizar para apagar, pilha de
  sugestões) precisa de um caminho por toque.
- Área de toque mínima de 48 dp.

## 5. Revisão final: segurança, qualidade e debugging

- **Dívida atual:** o `npx expo lint` acusa cerca de 96 erros antigos (quase todos `react-hooks/refs` no
  onboarding). Zerar antes do release.
- **Testes:** `jest-expo` para a lógica de `src/data` (momentos, regras de pausa, busca) e Maestro para os
  fluxos principais no celular (onboarding, check-in, pausa, novo momento).
- **Erros em produção:** Sentry (`@sentry/react-native`) com envio só de dados técnicos. Nunca texto do
  diário, emoção ou nome de app.
- **Segurança:** nenhuma chave secreta no app (só a chave pública do Supabase + RLS), `npm audit`,
  `npx expo-doctor`, revisão das permissões no `AndroidManifest` gerado, ofuscação no build de produção.
- **Privacidade/LGPD:** emoções e hábitos são dados sensíveis. Política de privacidade, consentimento
  claro, exportar e apagar, e tempo de guarda definido.
- **Teste em aparelhos reais:** Android antigo e fraco, modo economia de bateria (que mata serviços em
  segundo plano), tema claro e escuro.

---

## Decisões (20/11/2026)

1. **Dados só no aparelho** por enquanto: sem login nem back-end na nuvem. A fase 2 fica em SQLite
   criptografado + exportar/apagar; Supabase e login com Google ficam para depois do piloto.
2. **APK solto para um piloto com poucas pessoas** (perfil `preview` do EAS, link de download) com
   atualizações por EAS Update e o aviso "Nova versão disponível" para builds nativos novos. A Play Store
   fica para depois do piloto.
3. **Sem domínio:** nada de versão web publicada.
4. **Android primeiro:** o iPhone (Screen Time API) fica para depois.

Consequência para o piloto: como os dados não saem do celular, desinstalar o app apaga tudo. Avisar as
pessoas do piloto e ter o "Exportar meus dados" pronto antes de distribuir.
