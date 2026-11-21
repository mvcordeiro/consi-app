import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ImpactoVibracao, vibrarImpacto } from '@/data/haptica';
import { useTema } from '@/theme';

import { Texto } from '../../Texto';
import { Casca, Convite, vibrar, type PropsMecanica } from './comum';

const nativo = Platform.OS !== 'web';

/** Posição (em % do card) e tamanho de cada bolha: grandes, fáceis de acertar. */
const BOLHAS = [
  { x: 0.2, y: 0.28, t: 76 },
  { x: 0.52, y: 0.2, t: 64 },
  { x: 0.82, y: 0.32, t: 72 },
  { x: 0.32, y: 0.72, t: 68 },
  { x: 0.7, y: 0.74, t: 80 },
] as const;

/**
 * 7 · Estourar as bolhas — balões cobrem o drop; cada toque estoura um (estalo, gotinhas
 * e um tique). Quando o último estoura, o drop aparece. Os balões flutuam devagar,
 * mas sempre perto do lugar e com alvo grande.
 */
export function EstourarBolhas({ onRevelar, hobbyPrevia, movimentoReduzido }: PropsMecanica) {
  const { cores } = useTema();
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [estouradas, setEstouradas] = useState<number[]>([]);
  const fim = useRef(false);

  const estourar = (i: number) => {
    if (fim.current || estouradas.includes(i)) return;
    const novas = [...estouradas, i];
    setEstouradas(novas);
    vibrarImpacto(ImpactoVibracao.Light);
    if (novas.length === BOLHAS.length) {
      fim.current = true;
      vibrar('sucesso');
      // Só o tempo do último estouro (360 ms): por baixo já está o convite.
      setTimeout(onRevelar, 360);
    }
  };

  const restantes = BOLHAS.length - estouradas.length;
  const medir = (e: LayoutChangeEvent) => setTam({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <Casca style={styles.casca}>
      <View
        style={{ opacity: 0.25 + 0.75 * (estouradas.length / BOLHAS.length) }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Convite hobby={hobbyPrevia} />
      </View>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={medir}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Bolhas cobrindo o drop. Toque nelas para estourar. Faltam ${restantes}`}
        accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
        onAccessibilityAction={onRevelar}
      >
        {tam.w > 0
          ? BOLHAS.map((b, i) => (
              <Bolha
                key={i}
                x={b.x * tam.w - b.t / 2}
                y={b.y * tam.h - b.t / 2}
                tamanho={b.t}
                atraso={i * 380}
                cor={cores.action.primary.default}
                brilho={cores.text.primary}
                estourada={estouradas.includes(i)}
                parada={movimentoReduzido}
                onEstourar={() => estourar(i)}
              />
            ))
          : null}
      </View>
      <View style={styles.rodape} pointerEvents="none">
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.secondary} style={styles.centro}>
          {restantes === BOLHAS.length
            ? 'Estoure as bolhas para revelar'
            : restantes > 0
              ? `Faltam ${restantes}`
              : 'Pronto!'}
        </Texto>
      </View>
    </Casca>
  );
}

function Bolha({
  x,
  y,
  tamanho,
  atraso,
  cor,
  brilho,
  estourada,
  parada,
  onEstourar,
}: {
  x: number;
  y: number;
  tamanho: number;
  atraso: number;
  cor: string;
  brilho: string;
  estourada: boolean;
  parada: boolean;
  onEstourar: () => void;
}) {
  const [flutua] = useState(() => new Animated.Value(0));
  const [estouro] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (parada) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(atraso),
        Animated.timing(flutua, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
        Animated.timing(flutua, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flutua, atraso, parada]);

  useEffect(() => {
    if (estourada)
      Animated.timing(estouro, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: nativo }).start();
  }, [estourada, estouro]);

  const gotas = [0, 60, 120, 180, 240, 300];

  return (
    <View style={[styles.bolhaLugar, { left: x, top: y, width: tamanho, height: tamanho }]} pointerEvents="box-none">
      {gotas.map((ang) => {
        const rad = (ang * Math.PI) / 180;
        const d = tamanho * 0.75;
        return (
          <Animated.View
            key={ang}
            pointerEvents="none"
            style={[
              styles.gota,
              {
                backgroundColor: cor,
                left: tamanho / 2 - 4,
                top: tamanho / 2 - 4,
                opacity: estouro.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: estouro.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * d] }) },
                  { translateY: estouro.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * d] }) },
                ],
              },
            ]}
          />
        );
      })}
      <Pressable onPress={onEstourar} disabled={estourada} hitSlop={10} accessible={false}>
        <Animated.View
          style={[
            styles.bolha,
            {
              width: tamanho,
              height: tamanho,
              borderRadius: tamanho / 2,
              backgroundColor: cor,
              opacity: estouro.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.92, 0.5, 0] }),
              transform: [
                { translateY: flutua.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
                { scale: estouro.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.3, 1.5] }) },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.reflexo,
              { backgroundColor: brilho, width: tamanho * 0.22, height: tamanho * 0.14, borderRadius: tamanho * 0.1 },
            ]}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  casca: { minHeight: 236, justifyContent: 'center' },
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 14 },
  bolhaLugar: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bolha: { alignItems: 'flex-start', justifyContent: 'flex-start' },
  reflexo: { marginTop: '18%', marginLeft: '22%', opacity: 0.55, transform: [{ rotate: '-30deg' }] },
  gota: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
});
