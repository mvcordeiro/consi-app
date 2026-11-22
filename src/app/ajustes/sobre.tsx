import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';

import { Sobre, TelaAjustes } from '@/components/ajustes';
import { nuvemConfigurada } from '@/data/nuvem/cliente';
import { souAdmin } from '@/data/nuvem/moderacao';

/** Ajustes → Sobre. 7 toques na versão abrem a moderação (ou o login de admin). */
export default function PaginaSobre() {
  const [admin, setAdmin] = useState(false);
  const nuvem = nuvemConfigurada();

  useFocusEffect(
    useCallback(() => {
      if (!nuvem) return;
      let vivo = true;
      souAdmin().then((a) => vivo && setAdmin(a));
      return () => {
        vivo = false;
      };
    }, [nuvem]),
  );

  return (
    <TelaAjustes titulo="Sobre">
      <Sobre onAdmin={nuvem ? () => router.push((admin ? '/ajustes/moderacao' : '/ajustes/admin-entrar') as Href) : undefined} />
    </TelaAjustes>
  );
}
