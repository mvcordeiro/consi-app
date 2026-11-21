import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { duration, easing, useTema } from '@/theme';

import { Texto } from '../../Texto';
import { SetaArrastar } from '../assets';
import { Cabeca, Casca, vibrar, type PropsMecanica } from './comum';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

const ALCA = 38;
const RECUO_ESQUERDA = 8;
const RECUO_DIREITA = 14;
const LIMIAR = 0.85;

/** 1 · Arrastar — a mecânica atual: puxar a alça do trilho até perto do fim. */
export function Arrastar({ onRevelar, onArrastando }: PropsMecanica) {
  return (
    <Casca>
      <Cabeca instrucao="Puxe a aba e descubra uma atividade feita para o seu momento." />
      <Trilho onRevelar={onRevelar} onArrastando={onArrastando} />
    </Casca>
  );
}

function Trilho({ onRevelar, onArrastando }: Pick<PropsMecanica, 'onRevelar' | 'onArrastando'>) {
  const { cores } = useTema();
  const [x] = useState(() => new Animated.Value(0));
  const [percurso, setPercurso] = useState(0);
  const medir = (e: LayoutChangeEvent) =>
    setPercurso(Math.max(0, e.nativeEvent.layout.width - RECUO_ESQUERDA * 2 - ALCA));
  const passou = useRef(false);

  const pan = useMemo(() => {
    const voltar = () => {
      onArrastando(false);
      Animated.spring(x, { toValue: 0, useNativeDriver: nativo, bounciness: 6 }).start();
    };
    // eslint-disable-next-line react-hooks/refs -- os handlers só leem os refs nos eventos
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        passou.current = false;
        onArrastando(true);
        vibrar();
      },
      onPanResponderMove: (_, g) => {
        x.setValue(Math.min(Math.max(g.dx, 0), percurso));
        // Vibra uma vez ao cruzar o ponto em que soltar já revela.
        const agora = percurso > 0 && g.dx >= percurso * LIMIAR;
        if (agora !== passou.current) {
          passou.current = agora;
          if (agora) vibrar('limite');
        }
      },
      onPanResponderRelease: (_, g) => {
        if (percurso > 0 && g.dx >= percurso * LIMIAR) {
          onArrastando(false);
          vibrar('sucesso');
          Animated.timing(x, {
            toValue: percurso,
            duration: duration.fast,
            easing: curva,
            useNativeDriver: nativo,
          }).start(() => onRevelar());
        } else {
          voltar();
        }
      },
      onPanResponderTerminate: voltar,
    });
  }, [x, percurso, onRevelar, onArrastando]);

  const opacidadeRotulo = percurso
    ? x.interpolate({ inputRange: [0, percurso * 0.6], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;

  return (
    <View
      onLayout={medir}
      style={[styles.trilho, { backgroundColor: cores.action.primary.default }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Arraste para revelar"
      accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
      onAccessibilityAction={onRevelar}
    >
      <Animated.View style={[styles.rotulo, { opacity: opacidadeRotulo }]}>
        <Texto estilo="Texto/Botões e rótulos">Arraste para revelar</Texto>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        hitSlop={12}
        style={[styles.alca, { backgroundColor: cores.action.primary.pressed, transform: [{ translateX: x }] }]}
      >
        <SetaArrastar width={20} height={20} corTraco={cores.text.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    paddingLeft: RECUO_ESQUERDA,
    paddingRight: RECUO_DIREITA,
    overflow: 'hidden',
  },
  rotulo: { position: 'absolute', left: RECUO_ESQUERDA + ALCA + 11, right: RECUO_DIREITA },
  alca: {
    width: ALCA,
    height: ALCA,
    borderRadius: ALCA / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
