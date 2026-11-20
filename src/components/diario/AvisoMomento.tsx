import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { emocaoPorId } from '@/data/emocoes';
import { quando, type Momento } from '@/data/momentos';
import { duration, easing, radius, space, useTema } from '@/theme';

import { useEspacoBarra } from '../BarraNavegacao';
import { Texto } from '../Texto';
import { Premo } from './Premo';

const nativo = Platform.OS !== 'web';
const VISIVEL_MS = 5000;

/**
 * Aviso "Momento guardado" (Figma 760:6257): cartão bg/sunken (o bg/inverse do Figma ficava preto
 * no modo Light e o Premo laranja perdia contraste) acima da barra, com o Premo
 * da emoção, "Satisfeito · hoje, 16:40" e "Desfazer" em text/link. Some em 5 s.
 * Uso: const [aviso, mostrar] = useAvisoMomento(); … {aviso} … mostrar(titulo, momento, desfazer?)
 */
export function useAvisoMomento(
  /** Espaço extra acima da posição padrão (ex.: para não cobrir o botão flutuante). */
  acima = 0,
): [ReactNode, (titulo: string, m: Momento, desfazer?: () => void) => void] {
  const { cores, elevacao } = useTema();
  const espacoBarra = useEspacoBarra();
  const [aviso, setAviso] = useState<{ titulo: string; m: Momento; desfazer?: () => void } | null>(null);
  const [v] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anima = useCallback(
    (para: number, fim?: () => void) =>
      Animated.timing(v, {
        toValue: para,
        duration: para ? duration.slow : duration.base,
        easing: Easing.bezier(...easing.standard),
        useNativeDriver: nativo,
      }).start(fim),
    [v],
  );
  const esconder = useCallback(() => anima(0, () => setAviso(null)), [anima]);

  const mostrar = useCallback(
    (titulo: string, m: Momento, desfazer?: () => void) => {
      if (timer.current) clearTimeout(timer.current);
      setAviso({ titulo, m, desfazer });
      anima(1);
      timer.current = setTimeout(esconder, VISIVEL_MS);
    },
    [anima, esconder],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const no = aviso ? (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={[
        styles.aviso,
        {
          bottom: espacoBarra + space[24] + acima,
          backgroundColor: cores.bg.sunken,
          ...elevacao[2],
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Premo id={aviso.m.id} tamanho={36} />
      <View style={styles.textos}>
        <Texto estilo="Texto/Médio">
          {aviso.titulo}
        </Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} numberOfLines={1}>
          {emocaoPorId(aviso.m.id)?.nome} · {quando(aviso.m.em)}
        </Texto>
      </View>
      {aviso.desfazer ? (
        <Pressable
          onPress={() => {
            aviso.desfazer?.();
            if (timer.current) clearTimeout(timer.current);
            esconder();
          }}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Texto estilo="Texto/Botões e rótulos" cor={cores.text.link}>
            Desfazer
          </Texto>
        </Pressable>
      ) : null}
    </Animated.View>
  ) : null;

  return [no, mostrar];
}

const styles = StyleSheet.create({
  aviso: {
    position: 'absolute',
    left: space[24],
    right: space[24],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingLeft: space[8],
    paddingRight: space[20],
    paddingVertical: space[8],
    borderRadius: radius.lg,
  },
  textos: { flex: 1 },
});
