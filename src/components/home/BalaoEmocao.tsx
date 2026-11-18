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
  /**
   * Flutuação livre: amplitude e ritmo sorteados, com um balanço lateral
   * independente do vertical (as emoções da Home não sobem e descem juntas).
   */
  deriva?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Premo — balão de emoção com a textura, o rosto e o contorno do Figma. */
export function BalaoEmocao({
  Svg,
  Textura,
  circulo,
  tamanho = LADO_BALAO,
  flutuar = true,
  fase = 0,
  deriva = false,
  style,
}: Props) {
  const cores = useCoresSvg();
  const [y] = useState(() => new Animated.Value(0));
  const [x] = useState(() => new Animated.Value(0));
  // Sorteado uma vez por balão: no Figma é 8 px para cima em 2 s, sem lateral.
  const [ritmo] = useState(() =>
    deriva
      ? {
          subida: 6 + Math.random() * 6,
          meiaY: 800 + Math.random() * 600,
          lado: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 6),
          meiaX: 1100 + Math.random() * 900,
          atraso: Math.random() * 1200,
        }
      : { subida: 8, meiaY: 1000, lado: 0, meiaX: 1000, atraso: 0 },
  );
  const escala = tamanho / LADO_BALAO;
  const lado = LADO_SVG_BALAO * escala;
  const k = lado / LADO_SVG_BALAO;

  useEffect(() => {
    if (!flutuar) return;
    const meia = (v: Animated.Value, para: number, ms: number) =>
      Animated.timing(v, { toValue: para, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: nativo });
    const loops = [Animated.loop(Animated.sequence([meia(y, 1, ritmo.meiaY), meia(y, 0, ritmo.meiaY)]))];
    if (ritmo.lado) loops.push(Animated.loop(Animated.sequence([meia(x, 1, ritmo.meiaX), meia(x, -1, ritmo.meiaX * 2), meia(x, 0, ritmo.meiaX)])));
    const t = setTimeout(() => loops.forEach((l) => l.start()), fase + ritmo.atraso);
    return () => {
      clearTimeout(t);
      loops.forEach((l) => l.stop());
    };
  }, [flutuar, fase, ritmo, x, y]);

  // a altura sorteada substitui os 8 px do Figma; a textura sobe metade disso a mais
  const sobe = (px: number) => y.interpolate({ inputRange: [0, 1], outputRange: [0, -px * (ritmo.subida / 8) * escala] });
  const balanco = x.interpolate({ inputRange: [-1, 1], outputRange: [-ritmo.lado * escala, ritmo.lado * escala] });
  const recorte = circulo
    ? {
        left: (circulo.cx - RAIO_MASCARA) * k,
        top: (circulo.cy - RAIO_MASCARA) * k,
        width: RAIO_MASCARA * 2 * k,
        height: RAIO_MASCARA * 2 * k,
      }
    : null;

  return (
    <Animated.View style={[{ width: lado, height: lado, transform: [{ translateX: balanco }, { translateY: sobe(8) }] }, style]}>
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
