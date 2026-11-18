import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { coresPorModo, elevacaoPorModo, type Cores, type Elevacao, type Modo } from './tokens';

/**
 * Modo de cor (Dark/Light), como no Figma: o modo vale para tudo que está dentro
 * do <ModoDeCor>, e um bloco interno pode trocar o modo só para ele.
 * Sem `modo`, segue o tema do celular (claro → Light/laranja, escuro → Dark/azul).
 */
type Tema = { modo: Modo; cores: Cores; elevacao: Elevacao };

const ContextoTema = createContext<Tema>({
  modo: 'dark',
  cores: coresPorModo.dark,
  elevacao: elevacaoPorModo.dark,
});

export function ModoDeCor({ modo, children }: { modo?: Modo; children: ReactNode }) {
  const doCelular = useColorScheme();
  const efetivo: Modo = modo ?? (doCelular === 'light' ? 'light' : 'dark');
  const valor = useMemo(
    () => ({ modo: efetivo, cores: coresPorModo[efetivo], elevacao: elevacaoPorModo[efetivo] }),
    [efetivo],
  );
  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

/** Cores e sombras do modo atual. Use em todo componente e tela. */
export function useTema() {
  return useContext(ContextoTema);
}

/**
 * Cores dos SVGs exportados do Figma no modo atual. Espalhe no componente:
 *   <IconeTempo {...useCoresSvg()} />
 */
export function useCoresSvg() {
  const { cores } = useTema();
  return {
    corTraco: cores.icon.primary,
    corLinha: cores.border.focus,
    corPreenchimento: cores.action.secondary.default,
    corDecor: cores.action.primary.hover,
    corAlerta: cores.feedback.error,
    corSuave: cores.border.subtle,
  };
}
