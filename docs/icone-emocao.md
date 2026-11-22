# Ícone do app = última emoção (Android)

O ícone do Consi na tela inicial do celular pode mostrar o balão da última emoção registrada. Vem **ligado por padrão** no Android e a pessoa pode desligar em Ajustes → Personalizar → "Ícone com a sua emoção". O
texto do ajuste avisa que quem vir a tela do celular vai ver como ela se sente.

Figma: os ícones são o componente PrEmo (nó 827:8693 do arquivo "Consi - Design de Interação"):
fundo `bg/base` e balão azul no modo Dark, fundo creme e balão laranja no modo Light.

## Como funciona

O launcher do Android só troca de ícone se o app tiver mais de um ponto de entrada. Por isso:

1. `plugins/withIconeEmocao.js` (config plugin, roda no prebuild) tira o filtro `MAIN/LAUNCHER`
   da `MainActivity` e cria 15 apelidos (`activity-alias`): `IconePadrao` (ligado, ícone normal) e
   `Icone_<id>` para cada uma das 14 emoções (desligados).
2. `modules/consi-widgets/.../Icone.kt` liga um apelido e desliga os outros com
   `setComponentEnabledSetting(..., DONT_KILL_APP)`. Liga o novo antes de desligar os outros.
3. `src/data/iconeEmocao.ts` (`useIconeEmocao`, chamado em `src/app/_layout.tsx`) manda o id da
   emoção mais recente (`momentos[0]`) quando muda, ou `null` (ícone normal) se o ajuste estiver
   desligado. Espera preferências e momentos carregarem para não piscar o ícone padrão.
4. Os ícones (`mipmap-anydpi-v26/consi_icone_<id>.xml`, mais o simples em `mipmap-anydpi` para o
   Android 7) são gerados por `node scripts/gerar-icones-emocao.js` a partir dos balões dos
   widgets (`consi_emocao_<id>`). As cores vêm de `consi_icone_fundo` e `consi_balao`, então
   seguem o modo claro/escuro do sistema.

Se uma emoção nova entrar em `src/data/emocoes.ts`: rode `node scripts/gerar-widgets-android.js`,
depois `node scripts/gerar-icones-emocao.js` e acrescente o id em `EMOCOES` no plugin.

## Mudança nativa

Precisa de APK novo (`versionCode` 9). Não chega por EAS Update. Em APKs antigos, o ajuste nem
aparece (`temIconePorEmocao` é falso).

## Para testar em aparelho

Não deu para compilar o Kotlin nem abrir o launcher neste ambiente. No APK, conferir:

- ligar o ajuste e registrar uma emoção: o ícone muda (pode demorar alguns segundos);
- desligar: volta ao ícone normal;
- o atalho na tela inicial continua no lugar (alguns launchers, como Samsung e Xiaomi, podem
  piscar, mover ou recriar o atalho);
- o ícone acompanha o modo escuro do sistema;
- o app não fecha ao trocar o ícone;
- abrir pelo ícone novo, por links `consi://` e pelo widget continua funcionando;
- ícone "temático" do Android 13 não tem versão monocromática por emoção (usa o balão colorido).
