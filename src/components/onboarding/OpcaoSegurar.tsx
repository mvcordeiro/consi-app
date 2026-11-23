import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { borderWidth, radius, spaceFixo as space, useCoresSvg, useTema } from '@/theme';

import { Texto } from '../Texto';
import { AnelProgresso } from './AnelProgresso';
import type { IconeSvg } from './assets';

/**
 * Opção que se escolhe segurando (telas C1 e C2 do Figma).
 * Ao segurar: o card encolhe levemente (349×84 → 338×80), um preenchimento
 * bg/raised (combinado: superfície do modo, não a cor secundária) cresce da
 * esquerda e o anel de progresso se completa.
 * Soltar antes do tempo desfaz o progresso.
 */
type Props = {
  Icone: IconeSvg;
  texto: string;
  /** Tempo que é preciso segurar, em ms. */
  duracaoMs: number;
  /** Outra opção está sendo segurada (opacidade 40%). */
  esmaecida?: boolean;
  onInicio?: () => void;
  onCancelar?: () => void;
  onCompleto: () => void;
};

const nativo = false; // largura e props de SVG não rodam no driver nativo

export function OpcaoSegurar({ Icone, texto, duracaoMs, esmaecida, onInicio, onCancelar, onCompleto }: Props) {
  const { cores } = useTema();
  const coresSvg = useCoresSvg();
  const progresso = useRef(new Animated.Value(0)).current;
  const pressao = useRef(new Animated.Value(0)).current;
  const animacao = useRef<Animated.CompositeAnimation | null>(null);
  const completou = useRef(false);

  const iniciar = () => {
    onInicio?.();
    Animated.timing(pressao, { toValue: 1, duration: 180, useNativeDriver: nativo }).start();
    animacao.current = Animated.timing(progresso, {
      toValue: 1,
      duration: duracaoMs,
      easing: Easing.linear,
      useNativeDriver: nativo,
    });
    completou.current = false;
    animacao.current.start(({ finished }) => {
      if (finished) {
        completou.current = true;
        onCompleto();
      }
    });
  };

  const soltar = () => {
    if (completou.current) return;
    animacao.current?.stop();
    onCancelar?.();
    Animated.parallel([
      Animated.timing(progresso, { toValue: 0, duration: 400, useNativeDriver: nativo }),
      Animated.timing(pressao, { toValue: 0, duration: 250, useNativeDriver: nativo }),
    ]).start();
  };

  return (
    <Pressable onPressIn={iniciar} onPressOut={soltar} accessibilityRole="button" accessibilityHint="Segure para escolher">
      <Animated.View
        style={[
          styles.card,
          {
            borderColor: cores.border.focus,
            opacity: esmaecida ? 0.4 : 1,
            transform: [{ scale: pressao.interpolate({ inputRange: [0, 1], outputRange: [1, 338 / 349] }) }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.preenchimento,
            {
              backgroundColor: cores.bg.raised,
              width: progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
        <View style={styles.conteudo}>
          <View style={styles.icone}>
            <Icone {...coresSvg} />
          </View>
          <Texto estilo="Texto/Médio" style={styles.texto}>
            {texto}
          </Texto>
          <AnelProgresso progresso={progresso} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 84,
    borderWidth: borderWidth.thin,
    borderRadius: radius.card,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  preenchimento: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
    paddingHorizontal: space[16] - borderWidth.thin,
  },
  icone: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1 },
});
