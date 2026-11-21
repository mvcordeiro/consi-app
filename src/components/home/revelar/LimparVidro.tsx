import { useId, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';

import { duration, useTema } from '@/theme';

import { Texto } from '../../Texto';
import { Casca, Previa, vibrar, type PropsMecanica } from './comum';

const nativo = Platform.OS !== 'web';

/** Largura do "dedo" que limpa o vidro: larga, para não exigir precisão. */
const PINCEL = 64;
/** Parte limpa que já revela o resto sozinho. */
const LIMIAR = 0.45;
/** Grade usada só para medir quanto já foi limpo. */
const CELULA = 24;

/**
 * 2 · Limpar o vidro — o card começa embaçado; passar o dedo abre caminhos no vidro
 * (máscara SVG do traço). Com ~45 % limpo, o resto desembaça sozinho e o drop aparece.
 */
export function LimparVidro({ onRevelar, onArrastando, hobbyPrevia }: PropsMecanica) {
  const { cores } = useTema();
  const idMascara = `vidro-${useId().replace(/:/g, '')}`;
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [tracos, setTracos] = useState<string[]>([]);
  const [neblina] = useState(() => new Animated.Value(1));
  const [dica] = useState(() => new Animated.Value(1));

  const estado = useRef({ atual: '', limpas: new Set<number>(), ultimo: null as null | { x: number; y: number }, fim: false, desdeVibrar: 0 });

  const medir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTam({ w: width, h: height });
  };

  const pan = useMemo(() => {
    const cols = Math.max(1, Math.ceil(tam.w / CELULA));
    const linhas = Math.max(1, Math.ceil(tam.h / CELULA));
    const total = cols * linhas;
    const r = PINCEL / 2;

    const marcar = (x: number, y: number) => {
      const s = estado.current;
      const c0 = Math.max(0, Math.floor((x - r) / CELULA));
      const c1 = Math.min(cols - 1, Math.floor((x + r) / CELULA));
      const l0 = Math.max(0, Math.floor((y - r) / CELULA));
      const l1 = Math.min(linhas - 1, Math.floor((y + r) / CELULA));
      let novas = 0;
      for (let c = c0; c <= c1; c++)
        for (let l = l0; l <= l1; l++) {
          const cx = c * CELULA + CELULA / 2;
          const cy = l * CELULA + CELULA / 2;
          if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) {
            const k = l * cols + c;
            if (!s.limpas.has(k)) {
              s.limpas.add(k);
              novas++;
            }
          }
        }
      // Um "tique" leve a cada pedaço novo limpo, como um rangido do vidro.
      s.desdeVibrar += novas;
      if (s.desdeVibrar >= 10) {
        s.desdeVibrar = 0;
        vibrar();
      }
    };

    const terminar = () => {
      const s = estado.current;
      if (s.fim) return;
      s.fim = true;
      onArrastando(false);
      vibrar('sucesso');
      Animated.timing(neblina, { toValue: 0, duration: 420, useNativeDriver: nativo }).start(() =>
        setTimeout(onRevelar, 350),
      );
    };

    const ponto = (x: number, y: number) => {
      const s = estado.current;
      const p = { x: Math.max(0, Math.min(tam.w, x)), y: Math.max(0, Math.min(tam.h, y)) };
      // Interpola entre o ponto anterior e o novo: movimentos rápidos não deixam buracos.
      if (s.ultimo) {
        const d = Math.hypot(p.x - s.ultimo.x, p.y - s.ultimo.y);
        const passos = Math.ceil(d / (CELULA / 2));
        for (let i = 1; i <= passos; i++)
          marcar(s.ultimo.x + ((p.x - s.ultimo.x) * i) / passos, s.ultimo.y + ((p.y - s.ultimo.y) * i) / passos);
        s.atual += ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      } else {
        marcar(p.x, p.y);
        s.atual = `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${(p.x + 0.1).toFixed(1)} ${p.y.toFixed(1)}`;
      }
      s.ultimo = p;
      setTracos((t) => [...t.slice(0, -1), s.atual]);
      if (s.limpas.size / total >= LIMIAR) terminar();
    };

    // eslint-disable-next-line react-hooks/refs -- os handlers só leem os refs nos eventos
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !estado.current.fim,
      onMoveShouldSetPanResponder: () => !estado.current.fim,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        onArrastando(true);
        Animated.timing(dica, { toValue: 0, duration: duration.base, useNativeDriver: nativo }).start();
        estado.current.ultimo = null;
        setTracos((t) => [...t, '']);
        ponto(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => ponto(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease: () => {
        onArrastando(false);
        estado.current.ultimo = null;
      },
      onPanResponderTerminate: () => {
        onArrastando(false);
        estado.current.ultimo = null;
      },
    });
  }, [tam, neblina, dica, onArrastando, onRevelar]);

  // Gotas e manchas do vidro embaçado (posições fixas, em % do card).
  const gotas = [
    [0.12, 0.18, 10],
    [0.82, 0.12, 6],
    [0.68, 0.32, 14],
    [0.22, 0.7, 8],
    [0.9, 0.78, 11],
    [0.45, 0.88, 5],
    [0.35, 0.28, 4],
    [0.58, 0.62, 7],
  ] as const;

  return (
    <Casca style={styles.casca}>
      <Previa hobby={hobbyPrevia} />
      <Animated.View
        onLayout={medir}
        {...pan.panHandlers}
        style={[StyleSheet.absoluteFill, { opacity: neblina }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Card embaçado. Passe o dedo para limpar e revelar o drop"
        accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
        onAccessibilityAction={onRevelar}
      >
        {tam.w > 0 ? (
          <Svg width={tam.w} height={tam.h} pointerEvents="none">
            <Defs>
              <Mask id={idMascara} x={0} y={0} width={tam.w} height={tam.h} maskUnits="userSpaceOnUse">
                <Rect x={0} y={0} width={tam.w} height={tam.h} fill="#fff" />
                {tracos.map((d, i) =>
                  d ? (
                    <Path
                      key={i}
                      d={d}
                      stroke="#000"
                      strokeWidth={PINCEL}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : null,
                )}
              </Mask>
            </Defs>
            <G mask={`url(#${idMascara})`}>
              {/* Névoa em bg/sunken: contrasta com o card limpo (bg/raised) nos dois modos. */}
              <Rect x={0} y={0} width={tam.w} height={tam.h} fill={cores.bg.sunken} />
              <Rect x={0} y={0} width={tam.w} height={tam.h} fill={cores.text.primary} opacity={0.05} />
              {gotas.map(([x, y, raio], i) => (
                <Circle key={i} cx={x * tam.w} cy={y * tam.h} r={raio} fill={cores.border.focus} opacity={0.22} />
              ))}
            </G>
          </Svg>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.dica, { opacity: dica }]}>
          <Texto estilo="Títulos/Médio" style={styles.centro}>
            Seu próximo drop está embaçado.
          </Texto>
          <Texto estilo="Texto/Pequeno" style={styles.centro}>
            Passe o dedo no vidro para limpar e ver o que tem por baixo.
          </Texto>
        </Animated.View>
      </Animated.View>
    </Casca>
  );
}

const styles = StyleSheet.create({
  casca: { minHeight: 220, justifyContent: 'center' },
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  dica: { ...StyleSheet.absoluteFill, justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
});
