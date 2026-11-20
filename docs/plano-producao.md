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
