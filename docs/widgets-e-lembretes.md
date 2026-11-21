# Consi · tempo fora das telas: pausa do "Cuidar tempo", lembretes de tela e widgets

Estado em 21/11/2026. Expo SDK 58 (React Native 0.88), Android primeiro (APK fora da loja), iPhone
ainda sem build. Tudo o que é nativo aqui só chega ao celular com um **APK novo** (não vai por OTA).
O código Kotlin não foi compilado nesta máquina (não há JDK/Android SDK): a primeira compilação de
verdade é o próximo `eas build --profile preview -p android`.

---

## 1. "Levar para a pausa" (Cuidar tempo)

### O que estava errado

No `VigiaService.kt`, quando o timer de um app em "Cuidar tempo" acabava, o vigia **sempre** postava
o lembrete primeiro e, com "Levar para a pausa", marcava a pausa para **1 minuto depois**
(`IGNORAR_LEMBRETE_MS = 60_000`), se a pessoa continuasse no app. Era o atraso entre a notificação e a
tela de pausa. A navegação em si já não dependia da notificação: quem abria a pausa era o vigia.

### Como ficou

| Grupo | No fim do timer |
| --- | --- |
| Levar para a pausa | A pausa abre **na hora**, por cima do app (`consi://pausa?app=…&origem=vigia`). Nenhuma notificação antes. |
| Levar para a pausa, sem a permissão de sobrepor (ou o Android recusou abrir a tela) | Uma notificação "Uma pausa antes do …". Tocar nela abre a pausa. Só nesse caso a notificação navega. |
| Levar para a pausa, app já liberado por um tempo escolhido no "Quanto tempo você precisa?" | Não abre a pausa de novo: vira o lembrete comum. |
| Só reiniciar o timer | O lembrete. Se o timer flutuante estiver na tela, ele **pulsa 3 vezes** (borda laranja) e o celular dá **duas vibrações curtas e fracas**; a notificação entra calada na gaveta, para não vibrar duas vezes. Sem o flutuante, a notificação aparece normal. |

**Consi em segundo plano ou fechado:** a pausa abre por `startActivity` do serviço em primeiro plano.
O Android permite isso porque o Consi tem a permissão de sobrepor (é a exceção oficial para abrir
telas a partir do segundo plano). Com o Consi fechado, o link abre o app do zero e o Expo Router vai
direto para `/pausa`; com ele em segundo plano, o link chega pela mesma `MainActivity`.

**Permissão nova:** `VIBRATE` (normal, concedida na instalação, sem tela de pedido).

---

## 2. Lembretes de cuidado com o tempo de tela

### Uso do app × uso do celular

São coisas diferentes e o Consi não troca uma pela outra:

- **Uso de um app** (já existia): o "Cuidar tempo" dos grupos conta o tempo seguido em cada app,
  pelo Acesso de uso.
- **Uso do celular** (novo): o tempo seguido com a tela acesa e desbloqueada, em qualquer app,
  inclusive na tela inicial. É o que os lembretes de postura/olhos/alongamento usam.

### Android: possível, sem permissão nova

| Fonte | O que dá | Permissão |
| --- | --- | --- |
| `PowerManager.isInteractive` | Tela acesa ou apagada | Nenhuma |
| `KeyguardManager.isKeyguardLocked` | Celular bloqueado (tela de bloqueio) | Nenhuma |
| Broadcasts `SCREEN_ON/OFF`, `USER_PRESENT` | Os mesmos eventos, por aviso | Nenhuma, mas só com o app rodando (não valem no manifesto) |
| `UsageStatsManager` (eventos `SCREEN_INTERACTIVE`, `KEYGUARD_HIDDEN`) | Histórico dos mesmos eventos | Acesso de uso |

Escolha: ler `isInteractive` + `isKeyguardLocked` dentro do passo que o vigia **já** faz (0,7 s com a
tela acesa, 3 s apagada). Não acorda o celular a mais, não usa alarme exato, não pede Acesso de uso
nem acessibilidade. Uma sessão de uso:

- começa quando a tela fica acesa e desbloqueada;
- **para o relógio** com a tela apagada ou bloqueada; voltar em menos de 1 minuto continua a sessão
  (o tempo parado não conta);
- **zera** com 1 minuto ou mais de tela apagada/bloqueada (isso já é uma pausa);
- a cada 20 ou 30 minutos (escolha em Ajustes) vem a notificação "30 min de celular sem parar", com
  uma sugestão que muda a cada vez: postura, olhar para longe (regra 20-20-20), relaxar os olhos,
  alongar, respirar. Durante uma ligação, espera 1 minuto e tenta de novo.
- Tocar na notificação só a fecha (não abre o Consi: o lembrete não puxa para outra tela). Some
  sozinha depois de 10 minutos.

Começa **desligado**: a pessoa liga em Ajustes → "Cuidado com o tempo de tela". Funciona sem a pausa
nos apps ligada: nesse caso o serviço roda só para os lembretes e a notificação fixa diz "Lembrando
você de fazer pausas no celular".

**Custos e limites:** a notificação fixa do serviço em primeiro plano continua existindo (o Android
exige para um serviço que roda sempre). Se o Android matar o serviço (economia de bateria agressiva de
alguns fabricantes), a sessão em andamento recomeça quando o Consi abrir de novo. Nada sobre o uso é
gravado: só o início da sessão, em memória.

Permissões: notificações (Android 13+, pedidas ao ligar). Nenhuma outra.

### iPhone: o uso contínuo do celular não pode ser detectado

O iOS não deixa um app de terceiros saber se a tela está acesa ou desbloqueada quando ele não está na
frente, nem rodar em segundo plano por tempo indeterminado. O único caminho para tempo de uso fora do
app é o **Screen Time API** (FamilyControls + DeviceActivity + ManagedSettings), e ele não serve aqui:

- `DeviceActivityMonitor` avisa quando um **total acumulado** de uso de apps/categorias/sites
  escolhidos passa de um limite dentro de um intervalo agendado (ex.: 30 min no dia). Não sabe se o
  uso foi **seguido** nem quando a pessoa parou;
- a extensão roda num sandbox sem rede e com pouca memória, e a pessoa escolhe os apps por um seletor
  do sistema (o app nunca vê quais são);
- exige o entitlement Family Controls, que a Apple aprova manualmente para distribuição.

**Alternativas mais próximas (não implementadas; precisam da sua decisão):**

1. **Limite acumulado com Screen Time**: "a cada 30 min de uso das categorias que você escolher hoje,
   um lembrete". É honesto sobre o que mede (uso acumulado, não contínuo), mas depende da aprovação do
   entitlement e de uma extensão nativa.
2. **Lembretes por horário**: notificações locais agendadas (ex.: a cada 30 min entre 9h e 22h),
   sem saber se a pessoa está no celular. Simples e sem permissão especial, mas não mede nada.
3. **Só dentro do Consi**: lembrete enquanto o Consi está aberto. Mede o uso do app, não do celular,
   e por isso não substitui a funcionalidade.

---

## 3. Widgets

### Android (implementado, módulo `modules/consi-widgets`)

Widgets nativos com `AppWidgetProvider` + `RemoteViews` (Kotlin), desenhados no Figma (seção
"12 · WIDGETS E NOTIFICAÇÕES" de Telas do app) com o design system: fontes Consi Sans/Flare nos
estilos de texto do DS, botões "Ação / Botão" com ícone à esquerda (ícones Sorriso, Diário e
Atividade exportados do DS para `assets/widgets`), etiquetas "Filtro / Etiqueta · Ativo" como na
Home e espaçamentos space/4–16. Modo claro (laranja) e escuro (azul) seguindo o tema do celular
(`values` / `values-night`). Layouts gerados por `node scripts/gerar-widgets-layouts.js`. Os balões são os SVGs da Home convertidos em
VectorDrawable (`node scripts/gerar-widgets-android.js`), com a textura recortada no círculo.

| Widget | Tamanho | O que mostra | Toques |
| --- | --- | --- | --- |
| Seu dia | 2×2 | Aglomerado das emoções de hoje (a mais sentida no centro, até 5) e "3 registros hoje"; sem registros, o balão "?", "Como você está?" e "Toque para escrever" | Abre o Diário; sem registros, o novo momento do Diário (`/diario/novo`, o mesmo do botão da aba Diário) |
| Dia e atalhos | 4×2 | O mesmo aglomerado + Registrar emoção, Escrever no Diário, Explorar atividades | Home (check-in), novo momento, Hobbies |
| Check-in | 4×4 | "Como você está?", o balão "?" grande e, embaixo, as etiquetas dos últimos 3 registros ("Alegria · às 10:12"), como na Home | Veja abaixo |

**Check-in no widget grande (adaptação do arrastar):** widgets Android não recebem gestos. O
`RemoteViews` só entrega **toques** (e, no Android 12+, caixas de seleção e chaves); não há arrastar,
posição livre nem animação contínua. A mecânica virou três estados:

1. **Início**: tocar no balão "?" mostra as emoções.
2. **Escolha**: "Como você está agora?" e as 14 emoções espalhadas nas mesmas posições da Home
   (paradas: widget não anima), com um X para voltar.
3. **Confirmação**: o balão e o nome no centro; embaixo, "Escolher outra" e "Registrar" lado a
   lado, meio a meio.

"Registrar" abre o Consi em `consi://registrar?emocao=<id>&origem=widget`, que grava o check-in e
mostra a tela "Emoção registrada" por cima da Home (dali segue igual: explorar no Diário ou voltar).
Os dois toques (escolher + confirmar) mantêm a intenção do arrastar até a cabeça: um gesto
deliberado, que não registra por engano. Se a pessoa larga no meio, o widget volta ao início em 3 min.
O momento fica com a origem "Registrado pelo widget" no Diário.

**Por que o widget não grava sozinho:** o banco do Consi é SQLite criptografado com a chave no
Keystore, aberto só pelo JS. O widget não lê nem escreve no banco: o app manda o resumo do dia
(`useWidgets` em `src/data/widgets.ts`, sempre que os momentos mudam) e o registro passa pelo app.
Se o app não abriu desde ontem, o widget mostra o dia vazio; um alarme não exato (sem permissão)
redesenha logo depois da meia-noite.

As etiquetas mostram a hora ("às 10:12") e não "há 5 min": o widget só se redesenha quando algo
muda, então um tempo relativo ficaria errado. A fonte do DS entra como recurso `@font` no layout;
conferir no celular (alguns launchers antigos podem cair na fonte do sistema).

**O que não dá no Android:** arrastar balões, balões flutuando (sem animação contínua em widget),
seguir a aparência escolhida dentro do Consi (o widget segue o tema do celular).

Permissões: nenhuma.

### iPhone (não implementado ainda)

Caminho recomendado: **`expo-widgets`** (pacote oficial do SDK 58, `npx expo install expo-widgets
@expo/ui`), que gera a extensão WidgetKit pelo config plugin e escreve o layout em TSX com
componentes SwiftUI do `@expo/ui`. Pede:

- `ios.bundleIdentifier` no `app.json` (hoje não há) e um **App Group** (`group.<bundle id>`), o que
  exige conta Apple Developer paga e o App Group registrado;
- um build iOS (EAS) e iOS 17+ para botões interativos.

Interações no iOS: WidgetKit só aceita **toques** em `Button`/`Toggle` (iOS 17+, via App Intents) e
links que abrem o app. **Não há arrastar** nem animação contínua. A mesma adaptação do Android vale:
balão "?" → escolha → confirmar, com "Registrar" abrindo o app (`consi://registrar?…`), porque o
widget também não tem acesso ao banco criptografado. Os balões precisam ir como imagens PNG para a
pasta do App Group (`widgetsDirectory`).

Diferenças esperadas entre plataformas: tamanhos (iOS small/medium/large fixos; Android
redimensionável), cantos e margens do sistema, e o estado do widget grande (no iOS vive nas props do
widget; no Android, em SharedPreferences por widget).

Não implementado agora porque não dá para compilar nem testar sem a conta Apple e o App Group, e o
piloto é Android primeiro. Quando decidir, é a próxima etapa.

---

## Como testar no Android (APK novo)

1. `npx eas-cli@latest build --profile preview -p android` (subir `android.versionCode` antes).
2. **Pausa:** num grupo "Cuidar tempo" com 1 min e "Levar para a pausa", abrir um app do grupo: no
   fim do timer a pausa abre na hora. Repetir com "Só reiniciar o timer" e o timer flutuante na tela:
   ele pulsa e vibra de leve. Testar com o Consi fechado pelas abas recentes.
3. **Lembretes de tela:** Ajustes → Cuidado com o tempo de tela → ligar, 20 min. Usar o celular 20
   min sem apagar a tela. Apagar a tela por 1 min zera.
4. **Widgets:** segurar na tela inicial → Widgets → Consi. Registrar uma emoção no app: os widgets
   mudam. No grande, ? → emoção → Registrar.
