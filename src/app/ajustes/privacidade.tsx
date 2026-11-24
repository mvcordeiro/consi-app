import { useEffect, useState } from 'react';

import { Alternancia } from '@/components';
import { Ajuste, Divisoria, SeusDados, TelaAjustes } from '@/components/ajustes';
import { AjustesTravaDiario } from '@/components/ajustes/AjustesTravaDiario';
import { definirColeta, pilotoCarregado } from '@/data/piloto';

/** Ajustes → Privacidade e dados: o que fica onde, exportar tudo e apagar tudo. */
export default function PaginaPrivacidade() {
  const [coleta, setColeta] = useState(true);
  useEffect(() => {
    let vivo = true;
    pilotoCarregado()
      .then((d) => vivo && setColeta(d.coleta))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

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
      <Ajuste
        titulo="Dados de uso do piloto"
        descricao="Durante o teste, o app avisa quais telas e recursos foram usados (por exemplo, 'fez uma pausa'), ligado a um código aleatório. Nunca envia o que você escreve nem os nomes dos seus apps e hobbies."
      >
        <Alternancia
          rotulo="Enviar dados de uso anônimos"
          ligado={coleta}
          onMudar={(v) => {
            setColeta(v);
            void definirColeta(v);
          }}
        />
      </Ajuste>
      <Divisoria />
      <AjustesTravaDiario />
      <Divisoria />
      <SeusDados />
    </TelaAjustes>
  );
}
