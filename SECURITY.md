# Segurança

## Como reportar uma falha

Não abra uma issue pública para vulnerabilidades. Use o relato privado do GitHub:
**Security → Report a vulnerability** neste repositório
(<https://github.com/mvcordeiro/consi-app/security/advisories/new>).

Conte o que encontrou, como repetir e o possível impacto.

## O que está no escopo

- O app Android (dados locais, permissões, módulos nativos).
- As regras e migrations do Supabase em `supabase/`.

## Sobre as chaves do repositório

A chave `sb_publishable_...` em `app.json` é pública por design: ela só funciona dentro das regras de RLS das migrations. Nenhuma chave `service_role` ou secreta deve estar no repositório. Se encontrar uma, reporte pelo canal acima.
