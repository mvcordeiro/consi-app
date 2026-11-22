# Contribuindo com o Consi

Obrigado pelo interesse! O Consi está em piloto e muda rápido, então **abra uma issue antes de começar uma mudança grande**.

## Como ajudar

- **Bug:** abra uma [issue](https://github.com/mvcordeiro/consi-app/issues/new/choose) com o aparelho, a versão do Android e os passos para repetir.
- **Ideia:** abra uma issue, ou use a aba Comunidade dentro do app.
- **Código:** faça um fork, crie um branch curto e abra um pull request pequeno e focado.

## Ambiente

```bash
npm install
npx expo start
```

Veja o [README](README.md) para development builds (necessários para a Pausa e os widgets).

## Antes de enviar o pull request

```bash
npx tsc --noEmit
npx expo lint
```

- Use `npx expo install <pacote>` (e não `npm install`) para adicionar bibliotecas, assim as versões ficam compatíveis com o Expo SDK.
- Rotas ficam em `src/app/`. Componentes, hooks e utilitários ficam fora dela.
- Cores, tipografia e espaços vêm dos tokens em `src/theme`, nunca valores soltos.
- Mensagens de commit no formato `feat:`, `fix:`, `design:`, `docs:` ou `chore:`.
- Textos do app são em português do Brasil, em linguagem simples.

## Licença

Ao contribuir, você concorda que seu código seja distribuído sob a [licença MIT](LICENSE) do projeto.
