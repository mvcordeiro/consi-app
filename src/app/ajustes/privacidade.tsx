import { Ajuste, Divisoria, SeusDados, TelaAjustes } from '@/components/ajustes';

/** Ajustes → Privacidade e dados: o que fica onde, exportar tudo e apagar tudo. */
export default function PaginaPrivacidade() {
  return (
    <TelaAjustes titulo="Privacidade e dados">
      <Ajuste
        titulo="Sem conta, sem login"
        descricao="O Consi não pede e-mail nem senha. Diário, emoções, hobbies e grupos ficam só neste celular, num banco criptografado."
      />
      <Divisoria />
      <Ajuste
        titulo="Comunidade"
        descricao="Sugestões e votos vão para o nosso servidor sem seu nome. Ninguém consegue ligar uma sugestão ao seu diário."
      />
      <Divisoria />
      <SeusDados />
    </TelaAjustes>
  );
}
