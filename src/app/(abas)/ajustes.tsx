import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Botao, Tela, Texto, useEspacoBarra } from '@/components';
import { AjustesLembretesTela } from '@/components/AjustesLembretesTela';
import { AjustesPausa } from '@/components/AjustesPausa';
import { CartaoAjustes, Divisoria, LinhaLink, Personalizar, SecoesInicio, SeusDados, Sobre } from '@/components/ajustes';
import { nuvemConfigurada } from '@/data/nuvem/cliente';
import { souAdmin } from '@/data/nuvem/moderacao';
import { temNovidadeNaoVista } from '@/data/nuvem/novidades';
import { refazerOnboarding } from '@/data/onboarding';

/** As rotas index de app/ajustes saem como "…/index" nos tipos gerados; os caminhos reais são estes. */
const ROTA = {
  sugestoes: '/ajustes/sugestoes' as Href,
  novidades: '/ajustes/novidades' as Href,
  moderacao: '/ajustes/moderacao' as Href,
  entrar: '/ajustes/admin-entrar' as Href,
};

/**
 * Aba Ajustes (Figma: "📱 APP // Telas do app" → 10 · AJUSTES). Uma página só, em cartões, na ordem:
 * Personalizar · Seções do Início · Pausa nos apps · Cuidado com o tempo de tela · Comunidade ·
 * Seus dados · Sobre · Para testes (em desenvolvimento ou para o admin). Documentação: docs/ajustes.md.
 */
export default function Ajustes() {
  const espacoBarra = useEspacoBarra();
  // Enquanto uma seção do Início é arrastada, a página não rola.
  const [arrastando, setArrastando] = useState(false);
  const [novidade, setNovidade] = useState(false);
  const [admin, setAdmin] = useState(false);

  // A cada volta para a aba: ponto de "novo" em Novidades e a linha de Moderação (só admin).
  // Nenhuma das duas cria conta anônima.
  useFocusEffect(
    useCallback(() => {
      if (!nuvemConfigurada()) return;
      let vivo = true;
      temNovidadeNaoVista().then((n) => vivo && setNovidade(n));
      souAdmin().then((a) => vivo && setAdmin(a));
      return () => {
        vivo = false;
      };
    }, []),
  );

  return (
    <Tela travarRolagem={arrastando}>
      <Texto estilo="Títulos/Grande" accessibilityRole="header">
        Ajustes
      </Texto>

      <Personalizar />
      <SecoesInicio onArrastando={setArrastando} />

      <AjustesPausa />
      <AjustesLembretesTela />

      {nuvemConfigurada() ? (
        <CartaoAjustes rotulo="Comunidade">
          <LinhaLink
            titulo="Sugerir uma ideia"
            descricao="Envie ideias e vote nas de outras pessoas."
            onPress={() => router.push(ROTA.sugestoes)}
          />
          <Divisoria />
          <LinhaLink titulo="Novidades" descricao="O que mudou em cada versão." selo={novidade} onPress={() => router.push(ROTA.novidades)} />
          {admin ? (
            <>
              <Divisoria />
              <LinhaLink titulo="Moderação" descricao="Revisar sugestões e escrever as notas de versão." onPress={() => router.push(ROTA.moderacao)} />
            </>
          ) : null}
        </CartaoAjustes>
      ) : null}

      <SeusDados />
      <Sobre onAdmin={nuvemConfigurada() ? () => router.push(admin ? ROTA.moderacao : ROTA.entrar) : undefined} />

      {__DEV__ || admin ? (
        <CartaoAjustes rotulo="Para testes">
          <Botao
            rotulo="Refazer onboarding"
            onPress={async () => {
              await refazerOnboarding();
              router.replace('/onboarding');
            }}
          />
          <Botao rotulo="Abrir tela de pausa" estilo="secundario" onPress={() => router.push('/pausa')} />
        </CartaoAjustes>
      ) : null}

      {/* A barra de navegação flutua sobre o fim da página. */}
      <View style={{ height: espacoBarra }} />
    </Tela>
  );
}
