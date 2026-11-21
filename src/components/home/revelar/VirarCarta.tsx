import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { easing, radius, space, useTema } from '@/theme';

import { Texto } from '../../Texto';
import { IconeHobbies } from '../assets';
import { Casca, Convite, vibrar, type PropsMecanica } from './comum';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

/**
 * 6 · Virar a carta — o drop é uma carta virada para baixo. Arrastar para o lado gira a
 * carta em 3D; passou da metade (90°), ao soltar ela termina de virar. Um toque só dá
 * uma "balançadinha", ensinando que ela gira.
 */
export function VirarCarta({ onRevelar, onArrastando, hobbyPrevia }: PropsMecanica) {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  // Meia volta com ~45 % da largura da tela: um deslize curto, sem cansar.
  const percurso = Math.max(140, width * 0.45);
  const [giro] = useState(() => new Animated.Value(0)); // -1…1 (meia volta = ±1)
  const passou = useRef(false);
  const fim = useRef(false);

  const pan = useMemo(() => {
    const voltar = () => {
      onArrastando(false);
      Animated.spring(giro, { toValue: 0, bounciness: 8, useNativeDriver: nativo }).start();
    };
    const balancar = () =>
      Animated.sequence([
        Animated.timing(giro, { toValue: 0.12, duration: 140, useNativeDriver: nativo }),
        Animated.spring(giro, { toValue: 0, bounciness: 16, useNativeDriver: nativo }),
      ]).start();
    // eslint-disable-next-line react-hooks/refs -- os handlers só leem os refs nos eventos
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !fim.current,
      // Só pega gestos horizontais: o vertical continua rolando a Home.
      onMoveShouldSetPanResponderCapture: (_, g) => !fim.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        passou.current = false;
        onArrastando(true);
      },
      onPanResponderMove: (_, g) => {
        const v = Math.max(-1, Math.min(1, g.dx / percurso));
        giro.setValue(v);
        const agora = Math.abs(v) >= 0.5;
        if (agora !== passou.current) {
          passou.current = agora;
          if (agora) vibrar('limite');
        }
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
          onArrastando(false);
          vibrar();
          balancar();
          return;
        }
        const v = g.dx / percurso;
        if (Math.abs(v) >= 0.5 || Math.abs(g.vx) > 0.9) {
          fim.current = true;
          onArrastando(false);
          vibrar('sucesso');
          Animated.timing(giro, { toValue: g.dx < 0 ? -1 : 1, duration: 240, easing: curva, useNativeDriver: nativo }).start(() =>
            onRevelar(),
          );
        } else voltar();
      },
      onPanResponderTerminate: voltar,
    });
  }, [giro, percurso, onArrastando, onRevelar]);

  const frente = giro.interpolate({ inputRange: [-1, 1], outputRange: ['-180deg', '180deg'] });
  const verso = giro.interpolate({ inputRange: [-1, 1], outputRange: ['0deg', '360deg'] });
  // backfaceVisibility nem sempre esconde no Android: a opacidade troca as faces na metade.
  const opFrente = giro.interpolate({ inputRange: [-1, -0.5, -0.49, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1, 0, 0] });
  const opVerso = giro.interpolate({ inputRange: [-1, -0.5, -0.49, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0, 1, 1] });

  return (
    <View
      {...pan.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Carta virada para baixo. Deslize para o lado para virar e revelar o drop"
      accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
      onAccessibilityAction={onRevelar}
    >
      {/* Verso (o que aparece depois de virar). */}
      <Animated.View
        style={[styles.face, { opacity: opVerso, transform: [{ perspective: 900 }, { rotateY: verso }] }]}
        pointerEvents="none"
      >
        <Casca style={styles.altura}>
          <Convite hobby={hobbyPrevia} />
        </Casca>
      </Animated.View>
      {/* Frente: as costas da carta, com uma moldura e o ícone do drop. */}
      <Animated.View style={{ opacity: opFrente, transform: [{ perspective: 900 }, { rotateY: frente }] }}>
        <Casca style={[styles.altura, { backgroundColor: cores.action.primary.default, borderColor: cores.action.primary.pressed }]}>
          <View style={[styles.moldura, { borderColor: cores.text.primary }]} pointerEvents="none" />
          <View style={[styles.selo, { backgroundColor: cores.bg.base }]}>
            <IconeHobbies width={28} height={28} corTraco={cores.text.primary} />
          </View>
          <Texto estilo="Títulos/Médio" style={styles.centro}>
            Seu próximo drop está virado.
          </Texto>
          <Texto estilo="Texto/Pequeno" style={styles.centro}>
            Deslize a carta para o lado e vire para descobrir.
          </Texto>
          <View style={styles.setas}>
            <Texto estilo="Texto/Botões e rótulos">‹  Vire  ›</Texto>
          </View>
        </Casca>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { ...StyleSheet.absoluteFill },
  altura: { minHeight: 236, justifyContent: 'center' },
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  moldura: {
    position: 'absolute',
    top: space[8],
    left: space[8],
    right: space[8],
    bottom: space[8],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.45,
  },
  selo: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  setas: { opacity: 0.8 },
});
