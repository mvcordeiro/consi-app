import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { duration, easing, radius, space, useTema } from '@/theme';

import { Texto } from './Texto';

type Props = {
  total: number;
  /** Etapa atual, começando em 1. */
  atual: number;
  /** Texto acima das barras (ex.: "Padrão 1 de 3"). */
  rotulo?: string;
};

/**
 * Progresso / Segmento — uma barra por etapa. As etapas até a atual ficam em
 * action/primary; as seguintes em bg/disabled.
 */
export function ProgressoSegmentos({ total, atual, rotulo }: Props) {
  const { cores } = useTema();
  return (
    <View style={styles.coluna} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: atual }}>
      {rotulo ? (
        <Texto estilo="Legenda/Pequena" cor={cores.text.disabled}>
          {rotulo}
        </Texto>
      ) : null}
      <View style={styles.barras}>
        {Array.from({ length: total }, (_, i) => (
          <Segmento key={i} ativo={i < atual} />
        ))}
      </View>
    </View>
  );
}

function Segmento({ ativo }: { ativo: boolean }) {
  const { cores } = useTema();
  const [v] = useState(() => new Animated.Value(ativo ? 1 : 0));

  useEffect(() => {
    Animated.timing(v, {
      toValue: ativo ? 1 : 0,
      duration: duration.slow,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: false,
    }).start();
  }, [ativo, v]);

  return (
    <View style={[styles.segmento, { backgroundColor: cores.bg.disabled }]}>
      <Animated.View
        style={[
          styles.preenchimento,
          {
            backgroundColor: cores.action.primary.default,
            width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[8] },
  barras: { flexDirection: 'row', gap: 6 },
  segmento: { flex: 1, height: space[8], borderRadius: radius.full, overflow: 'hidden' },
  preenchimento: { height: '100%', borderRadius: radius.full },
});
