# Supabase: sugestões, votos e novidades

O Supabase guarda só as sugestões públicas, os votos, as denúncias e o changelog. O diário, os hobbies,
a pausa e as preferências continuam só no aparelho. Cada pessoa entra com **login anônimo**, criado na
primeira vez que abre Sugestões ou Novidades (nunca na abertura do app). Você entra como **admin** com
e-mail e senha.

Arquivos:
- `supabase/migrations/0001_sugestoes.sql`: tabelas, triggers, RLS, view `sugestoes_ranking`, RPC `mesclar_sugestoes`
- `supabase/migrations/0002_permissoes.sql`: grants das tabelas para `anon`/`authenticated`
- `src/data/nuvem/cliente.ts`: cliente, sessão no SecureStore, `garantirSessao()`, erros (`ErroNuvem`, tipo `offline`)
- `src/data/nuvem/sugestoes.ts`, `novidades.ts`, `moderacao.ts`: funções que as telas chamam

`@supabase/supabase-js` é só JavaScript (sem código nativo), então tudo isto chega por EAS Update, sem APK novo.

## 1. Criar o projeto

1. Crie uma conta em https://supabase.com e um projeto novo (plano Free serve para o piloto).
   Região: **South America (São Paulo)**. Guarde a senha do banco num gerenciador de senhas.
2. Em **Project Settings → API** (ou **API Keys**), copie:
   - **Project URL** (`https://xxxx.supabase.co`)
   - a chave **publishable** (`sb_publishable_...`) ou, nos projetos antigos, a **anon public**.
   Nunca use a `service_role` / `secret` no app.
3. Cole em `app.json → expo.extra.supabase`:
   ```json
   "supabase": {
     "url": "https://xxxx.supabase.co",
     "anonKey": "sb_publishable_..."
   }
   ```
   Enquanto houver `PREENCHER`, a nuvem fica desligada no app (`nuvemConfigurada()` = false) e nada vai para a rede.
   A chave é pública por desenho: quem protege os dados é a RLS da migration.

## 2. Ligar o login anônimo e os limites

Em **Authentication → Sign In / Providers** (Auth providers):
1. Ative **Allow anonymous sign-ins**.
2. Em **Email**, deixe o provedor ligado (é o login do admin). Não desligue **Allow new users to sign up**:
   isso também bloqueia o login anônimo. O app já pede `shouldCreateUser: false` no login por e-mail,
   então ninguém cria conta de e-mail por ele.

Em **Authentication → Rate Limits**:
- O limite de login anônimo é por IP (30 por hora por padrão). Para o piloto, 30 está bom; baixe se notar abuso.
- Deixe os limites de e-mail/OTP no padrão.

**CAPTCHA** (recomendado pelo Supabase para login anônimo, em **Authentication → Attack Protection**):
ligar o CAPTCHA faz o Supabase exigir um token em cada `signInAnonymously`. O app ainda **não** mostra
um CAPTCHA (precisaria de um widget hCaptcha/Turnstile numa WebView); `garantirSessao(captchaToken)` já aceita
o token para quando isso existir. Então: **não ligue o CAPTCHA ainda**, ou o login anônimo vai falhar.
No piloto, a pré-moderação cuida do conteúdo e o placar de votos é indicativo.

## 3. Rodar a migration

Opção simples: **SQL Editor → New query**, cole todo o conteúdo de `supabase/migrations/0001_sugestoes.sql` e **Run**;
depois faça o mesmo com `0002_permissoes.sql`. Deve terminar sem erro (rodar duas vezes dá erro de "already exists"; é só uma vez).

A `0002` existe porque projetos novos do Supabase não dão acesso automático às tabelas para os papéis da API
(`anon`, `authenticated`): sem ela, tudo volta "permission denied" antes mesmo da RLS.

No projeto **Consi** (`qxrxvosvavtlqhzzhhfg`, us-west-2) as duas já rodaram em 2026-11-21 e estão registradas em
`supabase_migrations.schema_migrations` (versões `0001` e `0002`). O deploy automático de migrations pela integração
com o GitHub está desligado; uma migration nova deve ser rodada à mão do mesmo jeito.

Opção com CLI (se um dia for usar): `npx supabase link --project-ref xxxx` e `npx supabase db push`.

Confira em **Table Editor** que existem `admins`, `sugestoes`, `votos`, `denuncias`, `versoes`, todas com o
cadeado de RLS ligado, e a view `sugestoes_ranking`.

## 4. Virar admin

1. **Authentication → Users → Add user → Create new user** com o seu e-mail, uma senha só sua e **Auto confirm user** marcado.
2. Copie o **User UID** da conta na lista de usuários e rode no SQL Editor:
   ```sql
   insert into public.admins (user_id) values ('COLE-O-UID-AQUI');
   ```
3. No app: Ajustes → tocar 7× na versão → e-mail e senha. A sessão de admin fica no aparelho.

Por que senha e não código: o e-mail padrão do Supabase só manda um link, e os modelos de e-mail só podem ser
editados depois de configurar um SMTP próprio. Esqueceu a senha? Como o app não tem página de redefinição, o
caminho simples é apagar a conta no painel, criar de novo e trocar o UID em `admins`.

No projeto Consi o admin é `valinhocm@gmail.com`.

Uma conta anônima nunca vira admin, mesmo que o UID dela entre em `admins`: `is_admin()` confere
o claim `is_anonymous` do token.

## Como as regras funcionam (resumo da RLS)

| Tabela | Quem lê | Quem escreve |
|---|---|---|
| `sugestoes` | publicadas: todos logados; pendentes/rejeitadas: só o autor; tudo: admin | insert: qualquer logado (o servidor força `pendente`, máx. 3/dia); editar: admin; apagar: admin ou autor da própria pendente |
| `votos` | só o próprio | só o próprio, só em publicada (upsert; tocar de novo apaga) |
| `denuncias` | admin | cada um uma vez por sugestão publicada; 3+ escondem a sugestão |
| `versoes` | publicadas: todos (até sem login); rascunhos: admin | admin |
| `admins` | a própria linha | só pelo Studio |

O placar (`pontos`, `votos_pos`, `votos_neg`) é recalculado por trigger a cada voto; o cliente nunca conta.
"Em alta" = `pontos / (horas + 2)^1.5` (`sugestoes_ranking.calor`).

## Limpeza de contas anônimas

O Supabase não apaga anônimos sozinho. Se um dia quiser limpar (SQL Editor), apague só quem não tem sugestão;
os votos dessas contas somem junto e o placar se ajusta:
```sql
delete from auth.users u
 where u.is_anonymous
   and u.created_at < now() - interval '90 days'
   and not exists (select 1 from public.sugestoes s where s.autor = u.id);
```

## Testar

Testado localmente (Postgres em memória) com dois anônimos e um admin: B não vê a pendente de A; o cliente não
consegue se publicar nem mudar o placar; a 4ª sugestão no dia falha; voto duplo vira troca; ninguém mexe no
voto do outro; 3 denúncias escondem; versões em rascunho não aparecem; `mesclar_sugestoes` só para admin.
Depois de criar o projeto, vale repetir o essencial pelo app: enviar como A, aprovar como admin e votar como B.
