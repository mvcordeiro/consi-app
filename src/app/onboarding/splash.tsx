import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aparecer, TextoAnimado } from '@/components/animacao';
import { TelaOnboarding } from '@/components/onboarding';
import { Logo, SplashTraco } from '@/components/onboarding/assets';
import { easing, space, tipografia, useTema } from '@/theme';

/**
 * A1 · Splash — "Você consigo, no seu ritmo."
 * Só avança arrastando para cima. Enquanto o dedo sobe, rabiscos, logo e texto
 * sobem junto (em velocidades diferentes, para dar profundidade) e somem;
 * passando do limite, a tela "sai" por cima e o nome aparece.
 *
 * A FAZER (combinado): animação dos rabiscos sendo desenhados.
 */
const LIMITE_PX = 120;
const nativo = Platform.OS !== 'web';

export default function A1Splash() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const s = width / 412;

  // quanto o dedo subiu (px, sempre ≥ 0)
  const arraste = useRef(new Animated.Value(0)).current;
  // convite: a dica "Arraste para cima" flutua levemente
  const convite = useRef(new Animated.Value(0)).current;
  const saindo = useRef(false);

  useEffect(() => {
    const ida = { duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(convite, { toValue: 1, ...ida }),
        Animated.timing(convite, { toValue: 0, ...ida }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [convite]);

  const gesto = useMemo(
    () =>
      PanResponder.create({
        // um toque não faz nada: o gesto só "pega" quando o dedo sobe
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.dy < -4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (!saindo.current) arraste.setValue(Math.max(0, -g.dy));
        },
        onPanResponderRelease: (_, g) => {
          if (saindo.current) return;
          // passou do limite, ou foi um movimento rápido e de tamanho razoável
          if (-g.dy > LIMITE_PX || (g.vy < -0.8 && -g.dy > LIMITE_PX / 2)) {
            saindo.current = true;
            Animated.timing(arraste, {
              toValue: height,
              duration: 650,
              easing: Easing.bezier(...easing.standard),
              useNativeDriver: nativo,
            }).start(() => router.replace('/onboarding/nome'));
          } else {
            Animated.spring(arraste, { toValue: 0, useNativeDriver: nativo }).start();
          }
        },
      }),
    [arraste, height],
  );

  // cada camada sobe numa velocidade (parallax) e some aos poucos
  const subir = (fator: number) => ({
    transform: [{ translateY: Animated.multiply(arraste, -fator) }],
  });
  const sumir = (ate: number) => ({
    opacity: arraste.interpolate({ inputRange: [0, ate], outputRange: [1, 0], extrapolate: 'clamp' }),
  });

  return (
    <TelaOnboarding>
      <Animated.View style={[StyleSheet.absoluteFill, subir(1.3), sumir(height * 0.6)]} pointerEvents="none">
        <Aparecer duracao={1200} deslocamento={0} escalaInicial={1.04} style={StyleSheet.absoluteFill}>
          <Traco x={-131 * s} y={-207 * s} s={s} />
          <Traco x={155 * s} y={422 * s} s={s} />
        </Aparecer>
      </Animated.View>

      <View style={StyleSheet.absoluteFill} {...gesto.panHandlers} accessibilityLabel="Arraste para cima para começar">
        <Animated.View style={[styles.logo, subir(1.1), sumir(240)]}>
          <Aparecer atraso={100}>
            <Logo width={67} height={25} accessibilityLabel="Consi" />
          </Aparecer>
        </Animated.View>

        <Animated.View style={[styles.centro, subir(0.9), sumir(260)]}>
          <TextoAnimado texto={'Você consigo,\nno seu ritmo.'} estilo="Títulos/Destaque" centralizado atraso={300} />
        </Animated.View>

        <Animated.View
          style={[styles.arraste, { bottom: Math.max(insets.bottom, space[16]) + space[64] }, subir(0.6), sumir(120)]}
        >
          <Aparecer atraso={900}>
            <Animated.Text
              style={[
                tipografia['Texto/Médio'],
                { color: cores.text.link, textAlign: 'center' },
                { transform: [{ translateY: convite.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] },
              ]}
            >
              Arraste para cima
            </Animated.Text>
          </Aparecer>
        </Animated.View>
      </View>
    </TelaOnboarding>
  );
}

/** "Vector 78": caixa de 558,78 × 598,25 com o traço (476 × 376) girado 61,21°. */
function Traco({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 558.78 * s,
        height: 598.25 * s,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ transform: [{ rotate: '61.21deg' }, { scale: s }] }}>
        <SplashTraco />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  arraste: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
