import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useCoresSvg } from '@/theme';

import type { IconeSvg } from '../onboarding/assets';

const nativo = Platform.OS !== 'web';

/** O SVG exportado tem 90 px para um balão de 84 px (o contorno passa um pouco da borda). */
export const LADO_SVG_BALAO = 90;
export const LADO_BALAO = 84;
/** Raio da máscara "Fundo" do Figma, no SVG de 90 px. */
const RAIO_MASCARA = 42;

type Props = {
  /** Contorno e rosto. */
  Svg: IconeSvg;
  /**
   * Textura do fundo. No Figma ela fica dentro de uma máscara circular; aqui o recorte
   * é feito por um View redondo, porque máscaras SVG com o mesmo id (os 14 balões usam
   * "mask0_430_1101") se confundem quando há mais de um balão na tela.
   */
  Textura?: IconeSvg;
  /** Centro do círculo da máscara, no SVG de 90 px. */
  circulo?: { cx: number; cy: number };
  /** Lado do balão em px (84 no Figma). */
  tamanho?: number;
  /** Flutua para cima e para baixo, como no Figma (8 px em 2 s, em loop; a textura sobe mais 4 px). */
  flutuar?: boolean;
  /** Atraso do início da flutuação, para os balões não subirem juntos. */
  fase?: number;
  style?: StyleProp<ViewStyle>;
};

/** Premo — balão de emoção com a textura, o rosto e o contorno do Figma. */
export function BalaoEmocao({ Svg, Textura, circulo, tamanho = LADO_BALAO, flutuar = true, fase = 0, style }: Props) {
  const cores = useCoresSvg();
  const [y] = useState(() => new Animated.Value(0));
  const escala = tamanho / LADO_BALAO;
  const lado = LADO_SVG_BALAO * escala;
  const k = lado / LADO_SVG_BALAO;

  useEffect(() => {
    if (!flutuar) return;
    const meia = (para: number) =>
      Animated.timing(y, {
        toValue: para,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: nativo,
      });
    const loop = Animated.loop(Animated.sequence([meia(1), meia(0)]));
    const t = setTimeout(() => loop.start(), fase);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [flutuar, fase, y]);

  const sobe = (px: number) => y.interpolate({ inputRange: [0, 1], outputRange: [0, -px * escala] });
  const recorte = circulo
    ? {
        left: (circulo.cx - RAIO_MASCARA) * k,
        top: (circulo.cy - RAIO_MASCARA) * k,
        width: RAIO_MASCARA * 2 * k,
        height: RAIO_MASCARA * 2 * k,
      }
    : null;

  return (
    <Animated.View style={[{ width: lado, height: lado, transform: [{ translateY: sobe(8) }] }, style]}>
      {Textura && recorte ? (
        <View pointerEvents="none" style={[styles.recorte, recorte, { borderRadius: recorte.width / 2 }]}>
          <Animated.View
            style={{
              position: 'absolute',
              left: -recorte.left,
              top: -recorte.top,
              transform: [{ translateY: sobe(4) }],
            }}
          >
            <Textura width={lado} height={lado} corBalao={cores.corBalao} corTraco={cores.corTraco} />
          </Animated.View>
        </View>
      ) : null}
      {/* Também posicionado: na web, um View absoluto seria pintado por cima de um SVG comum. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={lado} height={lado} corTraco={cores.corTraco} corBalao={cores.corBalao} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  recorte: { position: 'absolute', overflow: 'hidden' },
});
