import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform } from 'react-native';

import { easing } from '@/theme';

const nativo = Platform.OS !== 'web';
/** Duração do slide do topo e da barra de navegação. */
export const DURACAO_IMERSAO = 420;

type Contexto = {
  /** true enquanto a pessoa escolhe uma emoção: o topo e a barra saem da tela. */
  imersivo: boolean;
  setImersivo: (v: boolean) => void;
  /** 0 = barras no lugar, 1 = fora da tela. Animado com slide. */
  saida: Animated.Value;
};

const ContextoImersivo = createContext<Contexto | null>(null);

/** Envolve as abas: a Home liga o modo e a barra de navegação (e o topo da Home) obedecem. */
export function ModoImersivoProvider({ children }: { children: ReactNode }) {
  const [imersivo, setImersivo] = useState(false);
  const [saida] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(saida, {
      toValue: imersivo ? 1 : 0,
      duration: DURACAO_IMERSAO,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: nativo,
    }).start();
  }, [imersivo, saida]);

  const valor = useMemo(() => ({ imersivo, setImersivo, saida }), [imersivo, saida]);
  return <ContextoImersivo.Provider value={valor}>{children}</ContextoImersivo.Provider>;
}

export function useModoImersivo() {
  const ctx = useContext(ContextoImersivo);
  if (!ctx) throw new Error('useModoImersivo precisa estar dentro de <ModoImersivoProvider>');
  return ctx;
}
