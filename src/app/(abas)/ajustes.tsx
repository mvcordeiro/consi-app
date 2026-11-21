import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Botao, Tela, Texto, useEspacoBarra } from '@/components';
import { AjustesLembretesTela } from '@/components/AjustesLembretesTela';
import { AjustesPausa } from '@/components/AjustesPausa';
import { CartaoAjustes, Divisoria, LinhaLink, Personalizar, SecoesInicio, SeusDados, Sobre } from '@/components/ajustes';
import { refazerOnboarding } from '@/data/onboarding';

/** Destinos ainda sem tela abrem o marcador "Em construção" (convenção do app). */
function emConstrucao(titulo: string) {
  router.push({ pathname: '/em-construcao', params: { titulo } });
}

/**
 * Aba Ajustes (Figma: "📱 APP // Telas do app" → 10 · AJUSTES). Uma página só, em cartões, na ordem:
 * Personalizar · Seções do Início · Pausa nos apps · Cuidado com o tempo de tela · Comunidade ·
 * Seus dados · Sobre · Para testes (só em desenvolvimento). Documentação: docs/ajustes.md.
 */
export default function Ajustes() {
  const espacoBarra = useEspacoBarra();
  // Enquanto uma seção do Início é arrastada, a página não rola.
  const [arrastando, setArrastando] = useState(false);

  return (
    <Tela travarRolagem={arrastando}>
      <Texto estilo="Títulos/Grande" accessibilityRole="header">
        Ajustes
      </Texto>

      <Personalizar />
      <SecoesInicio onArrastando={setArrastando} />

      <AjustesPausa />
      <AjustesLembretesTela />

      {/* Sugestões e Novidades usam o Supabase (docs/supabase.md); as telas entram quando a nuvem chegar. */}
      <CartaoAjustes rotulo="Comunidade">
        <LinhaLink
          titulo="Sugerir uma ideia"
          descricao="Envie ideias e vote nas de outras pessoas."
          onPress={() => emConstrucao('Sugestões')}
        />
        <Divisoria />
        <LinhaLink titulo="Novidades" descricao="O que mudou em cada versão." onPress={() => emConstrucao('Novidades')} />
      </CartaoAjustes>

      <SeusDados />
      <Sobre />

      {__DEV__ ? (
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
