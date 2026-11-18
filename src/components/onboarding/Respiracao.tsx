import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useTema } from '@/theme';

import { Texto } from '../Texto';
import { RespiracaoAnel1, RespiracaoAnel2, RespiracaoAnel3 } from './assets';

/**
 * Exercício de respiração (telas C3 e C4 do Figma).
 * Três anéis fixos (140, 240, 350) e um "ponto de respiro" action/secondary
 * que cresce de 140 → 286 ao inspirar ("Inspire") e volta ao expirar ("Expire").
 * Combinado: um único ciclo; ao terminar, chama onFim.
 */
const MENOR = 140;
const MAIOR = 286;

type Props = {
  ciclos?: number;
  inspirarMs?: number;
  soltarMs?: number;
  /** Espera antes de começar, em ms. */
  atraso?: number;
  onFim: () => void;
};

export function Respiracao({ ciclos = 1, inspirarMs = 5000, soltarMs = 5500, atraso = 0, onFim }: Props) {
  const { cores } = useTema();
  const tamanho = useRef(new Animated.Value(0)).current;
  const entrada = useRef(new Animated.Value(0)).current;
  const [fase, setFase] = useState<'inspire' | 'expire'>('inspire');

  useEffect(() => {
    const curva = Easing.inOut(Easing.sin);
    const passos: Animated.CompositeAnimation[] = [
      Animated.timing(entrada, { toValue: 1, duration: 900, delay: atraso, useNativeDriver: false }),
    ];
    for (let i = 0; i < ciclos; i++) {
      passos.push(
        Animated.timing(tamanho, { toValue: 1, duration: inspirarMs, easing: curva, useNativeDriver: false }),
        Animated.timing(tamanho, { toValue: 0, duration: soltarMs, easing: curva, useNativeDriver: false }),
      );
    }
    const id = tamanho.addListener(({ value }) => {
      // "Expire" a partir do ponto mais cheio; fica assim até o fim (um único ciclo)
      if (value >= 0.99) setFase('expire');
    });
    const seq = Animated.sequence(passos);
    seq.start(({ finished }) => finished && onFim());
    return () => {
      seq.stop();
      tamanho.removeListener(id);
    };
  }, [ciclos, inspirarMs, soltarMs, atraso, onFim, tamanho, entrada]);

  return (
    <Animated.View
      style={[
        styles.area,
        {
          opacity: entrada,
          transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        },
      ]}
    >
      <View style={styles.centro}>
        <RespiracaoAnel1 />
      </View>
      <View style={styles.centro}>
        <RespiracaoAnel2 />
      </View>
      <View style={styles.centro}>
        <RespiracaoAnel3 />
      </View>
      <Animated.View
        style={[
          styles.ponto,
          {
            backgroundColor: cores.action.secondary.default,
            transform: [{ scale: tamanho.interpolate({ inputRange: [0, 1], outputRange: [1, MAIOR / MENOR] }) }],
          },
        ]}
      />
      <View style={styles.centro}>
        <Texto estilo="Texto/Pequeno">{fase === 'inspire' ? 'Inspire' : 'Expire'}</Texto>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  area: { width: 350, height: 350, alignItems: 'center', justifyContent: 'center' },
  centro: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ponto: { width: MENOR, height: MENOR, borderRadius: MENOR / 2 },
});
