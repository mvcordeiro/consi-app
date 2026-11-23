import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fimDoTexto, TextoAnimado } from '@/components/animacao';
import { Respiracao, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { useOnboarding, type Objetivo } from '@/data/onboarding';
import { gap, spaceFixo as space, useTema } from '@/theme';

/**
 * C3 / C4 · Respiração
 * Um único ciclo (inspirar 5 s, expirar 5,5 s). Ao terminar, a tela descansa
 * um instante e sai devagar para os hobbies — sem botão Continuar.
 * O círculo (350 no Figma) diminui para caber e tem respiro embaixo.
 */
/** O texto acompanha a resposta de "O que mais importa para você?". */
const TEXTOS: Record<Objetivo, { titulo: string; sub: string }> = {
  'menos-tempo': {
    titulo: 'Um minuto aqui, outro ali. A gente sabe como o tempo some dentro dos apps.',
    sub: 'Vamos descobrir juntos para onde ele vai, sem pressa.',
  },
  automatico: {
    titulo: 'Pegar o celular sem perceber. A gente conhece bem esse gesto.',
    sub: 'Vamos descobrir juntos quando ele acontece, sem pressa.',
  },
  hobbies: {
    titulo: 'Aquele hobby que foi ficando para depois. A gente quer abrir espaço para ele.',
    sub: 'Vamos descobrir juntos de onde tirar esse tempo, sem pressa.',
  },
};
/** Pausa depois de expirar, antes de começar a sair da tela. */
const PAUSA_FINAL_MS = 1200;
const LADO_FIGMA = 350;

export default function C3Respiracao() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { respostas } = useOnboarding();
  const { titulo: TITULO, sub: SUB } = TEXTOS[respostas.objetivo ?? 'automatico'];
  const T_SUB = fimDoTexto(TITULO, 150);
  const T_RESPIRACAO = fimDoTexto(SUB, T_SUB) + 400;
  const transicao = useTransicao();
  const { sair } = transicao;
  const [area, setArea] = useState({ w: LADO_FIGMA, h: LADO_FIGMA });
  const escala = Math.min(1, area.w / LADO_FIGMA, area.h / LADO_FIGMA);

  const aoTerminar = useCallback(() => {
    setTimeout(() => sair(() => router.replace('/onboarding/hobbies')), PAUSA_FINAL_MS);
  }, [sair]);

  return (
    <TelaOnboarding transicao={transicao}>
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.secondary} atraso={T_SUB} />
      </View>
      <View
        style={[styles.area, { marginBottom: Math.max(insets.bottom, space[16]) + space[24] }]}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <View style={{ transform: [{ scale: escala }] }}>
          <Respiracao atraso={T_RESPIRACAO} onFim={aoTerminar} />
        </View>
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: gap.default },
  // respiro entre o texto e o círculo, e entre o círculo e a borda de baixo
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: gap.section },
});
