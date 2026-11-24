import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Tela, useEspacoBarra } from '@/components';
import { LinhaLink, ListaLinks } from '@/components/ajustes';
import { RodapePiloto } from '@/components/ajustes/RodapePiloto';
import { versaoDoApp } from '@/components/ajustes/Sobre';
import { nuvemConfigurada } from '@/data/nuvem/cliente';
import { souAdmin } from '@/data/nuvem/moderacao';
import { temNovidadeNaoVista } from '@/data/nuvem/novidades';
import { temLembretesDeTela, temPausaDeVerdade } from '@/data/vigia';

/** As rotas index de app/ajustes saem como "…/index" nos tipos gerados; os caminhos reais são estes. */
const ir = (rota: string) => router.push(rota as Href);

/**
 * Aba Ajustes (Figma: "📱 APP // Telas do app" → 10 · AJUSTES). Só o índice: uma linha por assunto,
 * direto no fundo, e cada uma abre a sua página. Documentação: docs/ajustes.md.
 */
export default function Ajustes() {
  const espacoBarra = useEspacoBarra();
  const [novidade, setNovidade] = useState(false);
  const [admin, setAdmin] = useState(false);
  const nuvem = nuvemConfigurada();

  // A cada volta para a aba: ponto de "novo" (Novidades) e se este aparelho é do admin.
  // Nenhuma das duas cria conta anônima.
  useFocusEffect(
    useCallback(() => {
      if (!nuvem) return;
      let vivo = true;
      temNovidadeNaoVista().then((n) => vivo && setNovidade(n));
      souAdmin().then((a) => vivo && setAdmin(a));
      return () => {
        vivo = false;
      };
    }, [nuvem]),
  );

  return (
    <Tela>
      {/* Sem o título "Ajustes": a aba já está marcada na barra de navegação. */}
      <ListaLinks>
        <LinhaLink
          titulo="Personalizar"
          descricao="Tema, texto, movimento e o que aparece no Início."
          onPress={() => ir('/ajustes/personalizar')}
        />
        {temPausaDeVerdade || temLembretesDeTela ? (
          <LinhaLink titulo="Pausa e lembretes" descricao="Permissões da pausa nos apps e lembretes de tela." onPress={() => ir('/ajustes/pausa')} />
        ) : null}
        {nuvem ? (
          <LinhaLink
            titulo="Comunidade"
            descricao={admin || __DEV__ ? 'Sugestões, novidades e moderação.' : 'Sugira ideias e veja o que há de novo.'}
            selo={novidade}
            onPress={() => ir('/ajustes/comunidade')}
          />
        ) : null}
        {nuvem ? (
          <LinhaLink titulo="Mandar feedback" descricao="Conte um problema, uma ideia ou um elogio. Só a equipe lê." onPress={() => ir('/ajustes/feedback')} />
        ) : null}
        <LinhaLink titulo="Privacidade e dados" descricao="Onde seus dados ficam, exportar e apagar." onPress={() => ir('/ajustes/privacidade')} />
        <LinhaLink titulo="Sobre" valor={`Versão ${versaoDoApp()}`} onPress={() => ir('/ajustes/sobre')} />
        {__DEV__ || admin ? <LinhaLink titulo="Para testes" descricao="Refazer onboarding, abrir a pausa." onPress={() => ir('/ajustes/testes')} /> : null}
      </ListaLinks>

      {/* Piloto: em que dia dos 7 a pessoa está e, depois, o formulário. */}
      <RodapePiloto />

      {/* A barra de navegação flutua sobre o fim da página. */}
      <View style={{ height: espacoBarra }} />
    </Tela>
  );
}
