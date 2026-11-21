import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { borderWidth, easing, radius, space, useTema } from '@/theme';

import { Texto } from '../../Texto';
import { Cabeca, Casca, Previa, vibrar, type PropsMecanica } from './comum';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);
/** Fração da altura que já abre a tampa ao soltar (ou um puxão rápido para cima). */
const LIMIAR = 0.35;

/**
 * 5 · Puxar a tampa — uma tampa cobre o card; puxar a aba de baixo para cima levanta a tampa
 * e mostra o hobby do drop por baixo. Soltar depois de ~35 % (ou com um puxão) abre.
 */
export function PuxarTampa({ onRevelar, onArrastando, hobbyPrevia, movimentoReduzido }: PropsMecanica) {
  const { cores } = useTema();
  const [y] = useState(() => new Animated.Value(0));
  const [convite] = useState(() => new Animated.Value(0));
  const [altura, setAltura] = useState(0);
  const passou = useRef(false);
  const fim = useRef(false);

  // A aba "respira" para cima de vez em quando, mostrando para onde puxar.
  useEffect(() => {
    if (movimentoReduzido) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(convite, { toValue: 1, duration: 260, easing: curva, useNativeDriver: nativo }),
        Animated.spring(convite, { toValue: 0, bounciness: 12, useNativeDriver: nativo }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [convite, movimentoReduzido]);

  const pan = useMemo(() => {
    const voltar = () => {
      onArrastando(false);
      Animated.spring(y, { toValue: 0, bounciness: 8, useNativeDriver: nativo }).start();
    };
    // eslint-disable-next-line react-hooks/refs -- os handlers só leem os refs nos eventos
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !fim.current,
      onMoveShouldSetPanResponder: (_, g) => !fim.current && Math.abs(g.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        passou.current = false;
        onArrastando(true);
        vibrar();
      },
      onPanResponderMove: (_, g) => {
        // Para baixo, quase não sai do lugar (resistência).
        const d = g.dy < 0 ? g.dy : g.dy * 0.15;
        y.setValue(Math.max(d, -altura));
        const agora = altura > 0 && -g.dy >= altura * LIMIAR;
        if (agora !== passou.current) {
          passou.current = agora;
          if (agora) vibrar('limite');
        }
      },
      onPanResponderRelease: (_, g) => {
        if (altura > 0 && (-g.dy >= altura * LIMIAR || g.vy < -0.8)) {
          fim.current = true;
          onArrastando(false);
          vibrar('sucesso');
          Animated.timing(y, { toValue: -altura - 24, duration: 260, easing: curva, useNativeDriver: nativo }).start(() =>
            setTimeout(onRevelar, 300),
          );
        } else voltar();
      },
      onPanResponderTerminate: voltar,
    });
  }, [y, altura, onArrastando, onRevelar]);

  const medir = (e: LayoutChangeEvent) => setAltura(e.nativeEvent.layout.height);
  const sombra = altura ? y.interpolate({ inputRange: [-altura, 0], outputRange: [0, 1], extrapolate: 'clamp' }) : 1;

  return (
    <Casca style={styles.casca}>
      <Animated.View style={{ opacity: altura ? y.interpolate({ inputRange: [-altura * 0.6, 0], outputRange: [1, 0.25], extrapolate: 'clamp' }) : 0.25 }}>
        <Previa hobby={hobbyPrevia} />
      </Animated.View>
      <Animated.View
        onLayout={medir}
        style={[
          styles.tampa,
          {
            backgroundColor: cores.bg.raised,
            borderColor: cores.border.focus,
            transform: [{ translateY: Animated.add(y, convite.interpolate({ inputRange: [0, 1], outputRange: [0, -10] })) }],
          },
        ]}
      >
        <Animated.View style={[styles.conteudoTampa, { opacity: sombra }]}>
          <Cabeca instrucao="Levante a tampa e descubra uma atividade feita para o seu momento." />
        </Animated.View>
        {/* Aba larga na base: é só ela que pega o gesto, para não brigar com a rolagem. */}
        <View
          {...pan.panHandlers}
          hitSlop={{ top: 12, bottom: 12 }}
          style={[styles.aba, { backgroundColor: cores.action.primary.default }]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Puxe a aba para cima para revelar"
          accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
          onAccessibilityAction={onRevelar}
        >
          <View style={[styles.pegador, { backgroundColor: cores.text.primary }]} />
          <Texto estilo="Texto/Botões e rótulos">Puxe para cima</Texto>
        </View>
      </Animated.View>
    </Casca>
  );
}

const styles = StyleSheet.create({
  casca: { minHeight: 250, justifyContent: 'center' },
  tampa: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.xl,
    borderWidth: borderWidth.thin,
    paddingTop: 22 - borderWidth.thin,
    paddingHorizontal: space[24] - borderWidth.thin,
    paddingBottom: space[16],
    justifyContent: 'space-between',
  },
  conteudoTampa: { alignItems: 'center', gap: space[16] },
  aba: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pegador: { width: 32, height: 4, borderRadius: 2, opacity: 0.6 },
});
