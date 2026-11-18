import { useEffect, useRef, type FC } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { borderWidth, duration, radius, useTema } from '@/theme';

import { Texto } from '../Texto';

/**
 * Bolha de hobby (telas D4 e D5 do Figma).
 * Contorno border/focus; selecionada: fundo action/secondary/pressed.
 * Ao tocar, uma "Onda" (anel border/focus) se expande ao redor e some.
 */
type Props = {
  Icone: FC<SvgProps>;
  rotulo: string;
  tamanho: number;
  /** Largura do texto (no Figma: tamanho − 20). */
  larguraRotulo?: number;
  selecionada?: boolean;
  onPress?: () => void;
  /**
   * Movimento sutil e contínuo, como se a bolha estivesse submersa.
   * O número muda o ritmo, para cada bolha se mover de um jeito.
   */
  flutuar?: number;
  style?: ViewStyle;
};

const nativo = Platform.OS !== 'web';

export function Bolha({ Icone, rotulo, tamanho, larguraRotulo, selecionada, onPress, flutuar, style }: Props) {
  const { cores } = useTema();
  const onda = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (flutuar === undefined) return;
    // durações diferentes em x e y desenham um caminho orgânico, que não se repete igual
    const vaiEVem = (v: Animated.Value, ms: number, atraso: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, delay: atraso, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
          Animated.timing(v, { toValue: -1, duration: ms * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
        ]),
      );
    const ax = vaiEVem(x, 2400 + (flutuar % 3) * 550, flutuar * 200);
    const ay = vaiEVem(y, 2000 + (flutuar % 4) * 450, flutuar * 110);
    ax.start();
    ay.start();
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [flutuar, x, y]);

  const amplitude = 4;
  const deriva = {
    transform: [
      { translateX: x.interpolate({ inputRange: [-1, 1], outputRange: [-amplitude, amplitude] }) },
      { translateY: y.interpolate({ inputRange: [-1, 1], outputRange: [-amplitude * 1.4, amplitude * 1.4] }) },
    ],
  };

  const tocar = () => {
    onda.setValue(0);
    Animated.timing(onda, {
      toValue: 1,
      duration: 900,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: false,
    }).start();
    onPress?.();
  };

  const conteudo = (
    <View
      style={[
        styles.bolha,
        {
          width: tamanho,
          height: tamanho,
          borderColor: cores.border.focus,
          backgroundColor: selecionada ? cores.action.secondary.pressed : 'transparent',
        },
      ]}
    >
      <View style={styles.icone}>
        <Icone />
      </View>
      <Texto
        estilo="Legenda/Pequena"
        style={[styles.rotulo, { width: larguraRotulo ?? tamanho - 20 }]}
        numberOfLines={2}
      >
        {rotulo}
      </Texto>
    </View>
  );

  return (
    <Animated.View style={[{ width: tamanho, height: tamanho }, style, deriva]}>
      {/* Onda: 112 px ao redor de uma bolha de 92 no Figma (≈ 1,22×) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.onda,
          {
            borderColor: cores.border.focus,
            borderRadius: tamanho,
            opacity: onda.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
            transform: [{ scale: onda.interpolate({ inputRange: [0, 1], outputRange: [1, 112 / 92] }) }],
          },
        ]}
      />
      {onPress ? (
        <Pressable
          onPress={tocar}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!selecionada }}
          accessibilityLabel={rotulo}
        >
          {conteudo}
        </Pressable>
      ) : (
        conteudo
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bolha: {
    borderWidth: borderWidth.thin,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  icone: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  rotulo: { textAlign: 'center' },
  onda: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: borderWidth.thin },
});
