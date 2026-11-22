<div align="center">

<img src="docs/img/banner.webp" alt="Consi: você consigo, no seu ritmo" width="100%">

<br>

**Uma pausa antes de abrir o app. Um diário. Hobbies de verdade.**
<br>
O Consi ajuda você a perceber o impulso de abrir um app, respirar e escolher o que fazer com o seu tempo.

<br>

[![Baixar APK](https://img.shields.io/badge/Baixar_APK-Android-3FA66B?style=for-the-badge&logo=android&logoColor=white)](https://github.com/mvcordeiro/consi-app/releases/latest)
[![Participar do piloto](https://img.shields.io/badge/Participar_do_piloto-formulário-4362E5?style=for-the-badge&logo=googleforms&logoColor=white)](https://docs.google.com/forms/d/e/1FAIpQLSeHnQlF08s3gLX79otICOQE-sh-Ni8dyouAGYJfmrOq5tdLYQ/viewform)
[![Sugerir ideia](https://img.shields.io/badge/Sugerir_ideia-issues-FAAA27?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mvcordeiro/consi-app/issues/new/choose)

![Status](https://img.shields.io/badge/status-piloto-FAAA27?style=flat-square)
![Plataforma](https://img.shields.io/badge/plataforma-Android-3FA66B?style=flat-square&logo=android&logoColor=white)
![Expo SDK](https://img.shields.io/badge/Expo_SDK-58-000020?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
[![Licença MIT](https://img.shields.io/badge/licença-MIT-111D4F?style=flat-square)](LICENSE)

</div>

---

## O que é

O Consi é um app de bem-estar digital, feito em português, que troca o "abrir no automático" por uma escolha consciente. Em vez de bloquear, ele pergunta, dá um respiro e oferece algo melhor para fazer.

> **Estado atual:** piloto fechado, só Android. O app está sendo testado com um grupo pequeno e muda rápido.

## O que ele faz

| | |
|---|---|
| 🌬️ **Pausa** | Ao abrir um app que você escolheu, o Consi entra na frente com uma contagem curta e um check-in. Você decide se segue ou desiste. |
| 🏠 **Início** | Um resumo calmo do dia, com o seu progresso e atalhos para o que importa agora. |
| 🎨 **Hobbies** | Escolha hobbies, converse sobre eles, aceite sugestões que viram atividades e acompanhe quanto tempo dedicou. |
| 📓 **Diário** | Registre a emoção do momento com texto, fotos e áudios. Veja tudo em índice ou em linha do tempo. |
| 🎁 **Drops** | Pequenas recompensas com revelações animadas. |
| 💬 **Comunidade** | Sugira melhorias, vote nas ideias dos outros e leia as novidades de cada versão. |
| 🧩 **Widgets e lembretes** | Widgets na tela inicial do Android e lembretes para cuidar do seu tempo. |

## Privacidade

- **Seus dados ficam no seu celular.** Diário, hobbies, pausa e preferências são guardados em um banco local criptografado (SQLite com SQLCipher). Não há conta nem login.
- **Você pode exportar ou apagar tudo** em Ajustes → Privacidade e dados.
- **Só duas coisas vão para a nuvem** ([Supabase](https://supabase.com)): as sugestões públicas da Comunidade e eventos de uso anônimos do piloto. Os eventos têm um interruptor para desligar em Ajustes.
- Desinstalar o app apaga os dados locais. Exporte antes se quiser guardá-los.

## Instalar (Android)

1. Abra a página de [**Releases**](https://github.com/mvcordeiro/consi-app/releases/latest) no celular e baixe o arquivo `.apk` mais recente.
2. Toque no arquivo baixado. Se o Android pedir, permita instalar apps desta fonte.
3. Na primeira abertura, siga o onboarding e conceda as permissões da Pausa (acesso ao uso de apps e sobreposição de tela).

O app fica fora da Play Store por enquanto, por isso o Android avisa que a fonte é desconhecida. O código aberto está aqui para você conferir.

Telas e textos novos chegam sozinhos por atualização over-the-air (EAS Update) na segunda vez que você abre o app. Mudanças nativas pedem um APK novo.

## Rodar o projeto

Você precisa de [Node.js](https://nodejs.org) 20+ e, para o celular, do [Expo Go](https://expo.dev/go) ou de um *development build*.

```bash
git clone https://github.com/mvcordeiro/consi-app.git
cd consi-app
npm install
npx expo start
```

Alguns recursos usam código nativo e **não funcionam no Expo Go** (a Pausa, os widgets e o banco criptografado). Para eles, gere um development build:

```bash
npx expo run:android
# ou, na nuvem:
npx eas-cli@latest build --profile development --platform android
```

No navegador (`npx expo start --web`) dá para ver as telas, mas a Pausa não funciona na web.

Antes de abrir um pull request:

```bash
npx tsc --noEmit
npx expo lint
```

### Serviços

O app traz em `app.json` o endereço e a chave **pública** (publishable) do projeto Supabase do piloto, protegido por RLS. Para usar o seu próprio, crie um projeto no Supabase, rode as migrations em [`supabase/migrations`](supabase/migrations) e troque o endereço e a chave em `app.json`. Nunca coloque uma chave `service_role` no app.

## Estrutura

```
src/app/         telas e rotas (Expo Router)
src/components/  componentes de interface
src/data/        armazenamento local, Supabase, regras de negócio
src/theme/       tokens do design system (cores, tipografia, espaços)
modules/         módulos nativos Android (pausa e widgets)
supabase/        migrations do banco
docs/            decisões e guias
assets/          ícones, ilustrações e fontes
```

## Contribuir

Ideias, bugs e pull requests são bem-vindos. Leia o [guia de contribuição](CONTRIBUTING.md) primeiro. Para falhas de segurança, veja [SECURITY.md](SECURITY.md).

## Licença

O código é distribuído sob a [licença MIT](LICENSE).

A fonte do app, derivada de **TMT Limkin** (Gabriel Drozdov), segue a [SIL Open Font License 1.1](assets/fonts/TMT-Limkin-OFL.txt). Veja [`assets/fonts/LEIA-ME.txt`](assets/fonts/LEIA-ME.txt).
