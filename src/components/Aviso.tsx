import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duration, easing, radius, space, useTema } from '@/theme';

import { useEspacoBarra } from './BarraNavegacao';
import { Texto } from './Texto';

const nativo = Platform.OS !== 'web';
const DURACAO_VISIVEL = 2600;
const DURACAO_COM_ACAO = 4500;

type Acao = { rotulo: string; onPress: () => void };

/**
 * Aviso curto (toast) que sobe embaixo da tela e some sozinho, com uma ação opcional
 * (ex.: "Desfazer"). Sem componente no Design System: usa bg/inverse com text/on-inverse,
 * radius/full e Texto/Pequeno; a ação usa Texto/Botões e rótulos em text/on-inverse.
 * Uso: const [aviso, mostrarAviso] = useAviso(); … {aviso} … mostrarAviso('Feito!', acao?)
 * `comBarra`: a tela tem a barra de navegação embaixo (abas); fora delas, fica acima da área segura.
 */
export function useAviso({ comBarra = true }: { comBarra?: boolean } = {}): [
  ReactNode,
  (texto: string, acao?: Acao) => void,
] {
  const { cores } = useTema();
  const espacoBarra = useEspacoBarra();
  const { bottom } = useSafeAreaInsets();
  const [aviso, setAviso] = useState<{ texto: string; acao?: Acao } | null>(null);
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
    (texto: string, acao?: Acao) => {
      if (timer.current) clearTimeout(timer.current);
      setAviso({ texto, acao });
      anima(1);
      timer.current = setTimeout(esconder, acao ? DURACAO_COM_ACAO : DURACAO_VISIVEL);
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
      pointerEvents={aviso.acao ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
      style={[
        styles.aviso,
        {
          bottom: (comBarra ? espacoBarra : bottom) + space[12],
          backgroundColor: cores.bg.inverse,
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Texto estilo="Texto/Pequeno" cor={cores.text['on-inverse']} style={styles.texto}>
        {aviso.texto}
      </Texto>
      {aviso.acao ? (
        <Pressable
          onPress={() => {
            aviso.acao?.onPress();
            if (timer.current) clearTimeout(timer.current);
            esconder();
          }}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Texto estilo="Texto/Botões e rótulos" cor={cores.text['on-inverse']} style={styles.acao}>
            {aviso.acao.rotulo}
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
    alignSelf: 'center',
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
    paddingHorizontal: space[20],
    paddingVertical: space[12],
    borderRadius: radius.full,
  },
  texto: { textAlign: 'center', flexShrink: 1 },
  acao: { textDecorationLine: 'underline' },
});
