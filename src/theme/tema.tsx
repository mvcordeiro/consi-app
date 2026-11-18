import { createContext, useContext, type ReactNode } from 'react';

import { coresPorModo, elevacaoPorModo, type Cores, type Elevacao, type Modo } from './tokens';

/**
 * Modo de cor (Dark/Light), como no Figma: o modo vale para tudo que está dentro
 * do <ModoDeCor>, e um bloco interno pode trocar o modo só para ele.
 */
type Tema = { modo: Modo; cores: Cores; elevacao: Elevacao };

const ContextoTema = createContext<Tema>({
  modo: 'dark',
  cores: coresPorModo.dark,
  elevacao: elevacaoPorModo.dark,
});

export function ModoDeCor({ modo, children }: { modo: Modo; children: ReactNode }) {
  return (
    <ContextoTema.Provider
      value={{ modo, cores: coresPorModo[modo], elevacao: elevacaoPorModo[modo] }}
    >
      {children}
    </ContextoTema.Provider>
  );
}

/** Cores e sombras do modo atual. Use em todo componente e tela. */
export function useTema() {
  return useContext(ContextoTema);
}
