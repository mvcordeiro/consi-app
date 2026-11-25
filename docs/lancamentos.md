# Como sai uma versão do Consi

Regra: **APK novo só quando o código nativo muda.** O resto vai por EAS Update (alguns MB, chega
sozinho na segunda abertura do app, sem reinstalar).

## 1. Decidir: atualização (OTA) ou APK?

Compare o fingerprint do código atual com o do último APK publicado:

```bash
npx eas-cli@latest fingerprint:compare --build-id <id do último build preview>
```

- **Igual** → só JS, telas, textos, dados: vai por OTA (passo 2). Não muda `versionCode`.
- **Diferente** → mudou algo nativo (pacote com código nativo, `app.json`, plugins, `modules/`):
  precisa de APK (passo 3).

Mudanças pequenas de JS **nunca** devem esperar um APK. Se houver mudança nativa pela metade, publique o
JS antes (com a parte nativa guardada no stash) e deixe o APK para quando ela estiver pronta.

## 2. OTA (só JS)

```bash
npx eas-cli@latest update --channel preview --environment preview --message "1.3.1: …"
```

O `version` do `app.json` pode subir (1.3.1, 1.3.2…), mas **não** suba o `versionCode` nem mexa no
`consi-versao.json`: o app não vai pedir para baixar nada.

## 3. APK (mudança nativa)

1. Subir `expo.version` e `android.versionCode` no `app.json`.
2. `npx eas-cli@latest build --profile preview -p android`
3. Atualizar `consi-versao.json` (versionCode, versao, link do APK) e dar push em `main`: o app
   instalado mostra "Baixar" só quando o `versionCode` remoto é maior.
4. GitHub release com o APK (`gh release create vX.Y.Z consi-X.Y.Z.apk --target main`).

## Tamanho do APK

`expo-build-properties` no `app.json`: só `arm64-v8a` (praticamente todo Android atual), R8 e
remoção de recursos não usados. Um aparelho 32-bit antigo não instala; se aparecer alguém assim no piloto,
acrescentar `armeabi-v7a` em `buildArchs`.
