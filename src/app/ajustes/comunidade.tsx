import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';

import { LinhaLink, ListaLinks, TelaAjustes } from '@/components/ajustes';
import { souAdmin } from '@/data/nuvem/moderacao';
import { temNovidadeNaoVista } from '@/data/nuvem/novidades';

const ir = (rota: string) => router.push(rota as Href);

/** Ajustes → Comunidade: Sugestões, Novidades e, para o admin, Moderação. */
export default function PaginaComunidade() {
  const [novidade, setNovidade] = useState(false);
  const [admin, setAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      temNovidadeNaoVista().then((n) => vivo && setNovidade(n));
      souAdmin().then((a) => vivo && setAdmin(a));
      return () => {
        vivo = false;
      };
    }, []),
  );

  return (
    <TelaAjustes titulo="Comunidade">
      <ListaLinks>
        <LinhaLink titulo="Sugestões" descricao="Envie ideias e vote nas de outras pessoas." onPress={() => ir('/ajustes/sugestoes')} />
        <LinhaLink titulo="Novidades" descricao="O que mudou em cada versão." selo={novidade} onPress={() => ir('/ajustes/novidades')} />
        {/* Em desenvolvimento (Expo Go, web local) sempre aparece; sem sessão de admin, abre o login. */}
        {admin || __DEV__ ? (
          <LinhaLink titulo="Moderação" descricao="Revisar sugestões e escrever as notas de versão." onPress={() => ir('/ajustes/moderacao')} />
        ) : null}
      </ListaLinks>
    </TelaAjustes>
  );
}
