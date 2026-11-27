import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions } from 'react-native';

import { ImpactoVibracao, vibrarImpacto, vibrarSelecao, vibrarSucesso } from '@/data/haptica';
import { borderWidth, easing, mola, radius, space, useTema } from '@/theme';

import { Icone, type NomeIcone } from '../Icone';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

export type Lado = 'esquerda' | 'direita';

/** Vibração curta (no web ou com "Vibração" desligada em Ajustes não faz nada). */
export function vibrar(tipo: 'toque' | 'limite' | 'sucesso' = 'toque') {
  if (tipo === 'sucesso') vibrarSucesso();
  else if (tipo === 'limite') vibrarImpacto(ImpactoVibracao.Medium);
  else vibrarSelecao();
}

/**
 * Arrastar para os lados com limite de decisão (o mesmo gesto de "Para você").
 * Vibra ao cruzar o limite; ao soltar depois dele chama `onSoltar(lado)`, senão volta ao lugar.
 */
export function useArrasteLateral({
  limiar = 96,
  onSoltar,
  onArrastando,
}: {
  limiar?: number;
  onSoltar: (lado: Lado, pan: Animated.Value) => void;
  onArrastando?: (a: boolean) => void;
}) {
  const [pan] = useState(() => new Animated.Value(0));
  const vivo = useRef({ onSoltar, onArrastando, passou: false });
  useLayoutEffect(() => {
    vivo.current.onSoltar = onSoltar;
    vivo.current.onArrastando = onArrastando;
  });

  // eslint-disable-next-line react-hooks/refs -- os handlers só leem o ref nos eventos
  const [gesto] = useState(() => {
    const v = vivo.current;
    const horizontal = (dx: number, dy: number) => Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.4;
    const soltar = (dx: number, vx: number) => {
      v.onArrastando?.(false);
      v.passou = false;
      if (dx > limiar || (vx > 0.7 && dx > 40)) v.onSoltar('direita', pan);
      else if (dx < -limiar || (vx < -0.7 && dx < -40)) v.onSoltar('esquerda', pan);
      else Animated.spring(pan, { toValue: 0, useNativeDriver: nativo, speed: 14, bounciness: 8 }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => horizontal(g.dx, g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => horizontal(g.dx, g.dy),
      onPanResponderGrant: () => v.onArrastando?.(true),
      onPanResponderMove: (_, g) => {
        pan.setValue(g.dx);
        const passou = Math.abs(g.dx) > limiar;
        if (passou !== v.passou) {
          v.passou = passou;
          if (passou) vibrar('limite');
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => soltar(g.dx, g.vx),
      onPanResponderTerminate: () => soltar(0, 0),
    });
  });

  const progressoEsq = pan.interpolate({ inputRange: [-limiar, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const progressoDir = pan.interpolate({ inputRange: [0, limiar], outputRange: [0, 1], extrapolate: 'clamp' });
  return { pan, handlers: gesto.panHandlers, progressoEsq, progressoDir };
}

export function voltarAoLugar(pan: Animated.Value) {
  Animated.spring(pan, { toValue: 0, useNativeDriver: nativo, speed: mola.speed, bounciness: mola.bounciness }).start();
}

export function sairPeloLado(pan: Animated.Value, lado: Lado, largura: number, fim: () => void) {
  Animated.timing(pan, {
    toValue: lado === 'direita' ? largura : -largura,
    duration: 260,
    easing: curva,
    useNativeDriver: nativo,
  }).start(fim);
}

/** Aba de feedback na borda da tela (Figma 574:3689): 76 × 124, cantos radius/lg do lado de dentro. */
export function AbaArraste({
  lado,
  progresso,
  cor,
  icone,
  corIcone,
  topo,
}: {
  lado: Lado;
  progresso: Animated.AnimatedInterpolation<number>;
  cor: string;
  icone: NomeIcone;
  corIcone: string;
  topo: number;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.aba,
        lado === 'esquerda' ? styles.abaEsq : styles.abaDir,
        {
          top: topo,
          backgroundColor: cor,
          opacity: progresso,
          transform: [
            {
              translateX: progresso.interpolate({
                inputRange: [0, 1],
                outputRange: [lado === 'esquerda' ? -ABA_L : ABA_L, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Icone nome={icone} tamanho={44} cor={corIcone} />
    </Animated.View>
  );
}

const ABA_L = 76;
export const ABA_A = 124;

/** Bordas coloridas que acendem conforme o arraste (feedback/error à esquerda, success à direita). */
export function BordasArraste({
  progressoEsq,
  progressoDir,
}: {
  progressoEsq: Animated.AnimatedInterpolation<number>;
  progressoDir: Animated.AnimatedInterpolation<number>;
}) {
  const { cores } = useTema();
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.borda, { borderColor: cores.feedback.error, opacity: progressoEsq }]} />
      <Animated.View pointerEvents="none" style={[styles.borda, { borderColor: cores.feedback.success, opacity: progressoDir }]} />
    </>
  );
}

/** Largura da tela, para o card sair inteiro pelo lado. */
export function useLarguraTela() {
  return useWindowDimensions().width;
}

const styles = StyleSheet.create({
  aba: {
    position: 'absolute',
    width: ABA_L,
    height: ABA_A,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[16],
  },
  abaEsq: { left: 0, borderTopRightRadius: radius.lg, borderBottomRightRadius: radius.lg },
  abaDir: { right: 0, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  borda: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
  },
});

