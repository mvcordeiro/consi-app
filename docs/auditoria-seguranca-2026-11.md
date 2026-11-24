# Auditoria de segurança · novembro de 2026

Feita em 24/11/2026 na branch `feat/rodada-1.2.0` (versão 1.2.0 em preparação), como parte da issue #17.

**Quem fez:** revisão assistida por IA (Claude, da Anthropic), conferida pela pessoa que mantém o app. Não é um teste de invasão feito por uma empresa independente. O que foi olhado e o que não foi está abaixo.

## O que foi verificado

| Área | Como | Resultado |
| --- | --- | --- |
| Dependências | `npm audit --omit=dev`, `npx expo-doctor` | 3 alertas moderados no `minimatch`, usado só por ferramentas de build do Expo (`@expo/fingerprint`), fora do app instalado. A correção sugerida rebaixaria o Expo; fica para quando o Expo atualizar. expo-doctor: 20/20. |
| Chaves e segredos | busca por chaves de serviço, tokens e arquivos de assinatura no repositório | Nenhum segredo. A chave `sb_publishable_…` do `app.json` é pública por desenho; quem protege os dados é a RLS. |
| Supabase (migrations 0001 a 0004) | leitura das políticas, grants e funções | RLS ligada em todas as tabelas. Funções `security definer` com `search_path = ''`. A view de ranking usa `security_invoker`. Mesclar sugestões confere `is_admin()`. Feedback e prints só o admin lê. |
| Dados no celular | leitura de `src/data/banco.ts` e do Diário | Banco SQLite criptografado (SQLCipher) com a chave no SecureStore (Keystore). PIN do Diário guardado só como hash SHA-256 com sal, também no SecureStore. |
| Permissões Android | manifests dos módulos e `app.json` | Cada permissão tem uso: acesso de uso e sobreposição (pausa nos apps), notificações e alarme no reinício (lembretes), microfone (áudio no Diário), serviço em primeiro plano (vigia e áudio). |
| Componentes exportados | manifests e receivers | Só os widgets são exportados (exigência do Android). Eles só mudam o estado visual do próprio widget e validam a emoção recebida. Os demais receivers são internos. |

## Encontrado e corrigido nesta rodada

1. **Exportar dados furava a trava do Diário.** Com o Diário trancado, "Exportar meus dados" gerava o arquivo com todos os momentos. Agora pede o bloqueio do celular antes.
2. **Apagar tudo deixava o PIN.** "Apagar tudo" não removia o PIN do Diário do SecureStore. Agora remove.
3. **Trocar ou desligar a trava sem provar quem é.** Com o Diário trancado, mudar a trava em Ajustes pede o bloqueio do celular.

## Riscos conhecidos (aceitos por enquanto)

- **Eventos do piloto sem limite de envio.** A tabela `eventos` aceita inserções anônimas sem limite por aparelho. Alguém poderia encher a tabela de lixo; não expõe dados de ninguém. Reavaliar ao fim do piloto.
- **Widgets mostram as emoções da semana** mesmo com o Diário trancado (não mostram texto escrito).
- **PIN curto.** Um PIN de 4 a 6 dígitos poderia ser descoberto por quem tirasse o hash de um celular com root. A espera de 30 s depois de 5 erros protege só o uso normal.
- **Sem bloqueio no celular e PIN esquecido:** sem digital, rosto ou senha no aparelho, não há como recuperar o PIN pelo app.

## Fora do escopo desta vez

Teste de invasão externo, análise do APK compilado, auditoria do iOS (ainda não publicado) e revisão das ferramentas de build do Expo/EAS.
