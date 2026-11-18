import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { IconeGrande, Respiracao, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { IconeGesto82 } from '@/components/onboarding/assets';
import { space, useTema } from '@/theme';

/**
 * C3 / C4 · Respiração
 * Combinado: um único ciclo (inspirar 5 s, expirar 5,5 s). Ao terminar, a tela
 * descansa um instante e sai devagar para os hobbies — sem botão Continuar.
 */
const TITULO = 'Pegar o celular sem perceber. A gente conhece bem esse gesto.';
const SUB = 'Vamos descobrir juntos quando ele acontece, sem pressa.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_RESPIRACAO = fimDoTexto(SUB, T_SUB) + 400;
/** Pausa depois de expirar, antes de começar a sair da tela. */
const PAUSA_FINAL_MS = 1200;

export default function C3Respiracao() {
  const { cores } = useTema();
  const transicao = useTransicao();
  const { sair } = transicao;

  const aoTerminar = useCallback(() => {
    setTimeout(() => sair(() => router.replace('/onboarding/hobbies')), PAUSA_FINAL_MS);
  }, [sair]);

  return (
    <TelaOnboarding etapa={2} transicao={transicao}>
      <Aparecer escalaInicial={0.9}>
        <IconeGrande Icone={IconeGesto82} />
      </Aparecer>
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado
          texto={SUB}
          estilo="Texto/Pequeno"
          cor={cores.text.secondary}
          atraso={T_SUB}
          style={styles.sub}
        />
      </View>
      <View style={styles.area}>
        <Respiracao atraso={T_RESPIRACAO} onFim={aoTerminar} />
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  cabecalho: { marginTop: space[64], gap: space[16] },
  sub: { width: 216 },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
