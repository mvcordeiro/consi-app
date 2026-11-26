import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Appearance } from 'react-native';

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

/**
 * O tema do celular, sem os "pulos" do useColorScheme. Em alguns Android (One UI, MIUI) o sistema
 * avisa claro→escuro→claro toda vez que o app vai para o fundo (para a miniatura dos recentes) ou
 * quando o vigia abre a pausa por cima. Cada aviso redesenhava o app inteiro com as cores do outro
 * modo, e esse era o travamento do "Do celular". Aqui só vale o tema com o app na frente, e uma
 * troca só entra depois de 300 ms parada.
 */
const ESPERA_TEMA_MS = 300;

type Esquema = ReturnType<typeof Appearance.getColorScheme>;

function useTemaDoCelular(ligado: boolean): Esquema {
  const [esquema, setEsquema] = useState<Esquema>(() => Appearance.getColorScheme());
  useEffect(() => {
    if (!ligado) return;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const conferir = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        if (AppState.currentState !== 'active') return;
        const agora = Appearance.getColorScheme();
        setEsquema((antes) => (antes === agora ? antes : agora));
      }, ESPERA_TEMA_MS);
    };
    conferir();
    const tema = Appearance.addChangeListener(conferir);
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') conferir();
      else clearTimeout(espera);
    });
    return () => {
      clearTimeout(espera);
      tema.remove();
      app.remove();
    };
  }, [ligado]);
  return esquema;
}

export function ModoDeCor({ modo, children }: { modo?: Modo; children: ReactNode }) {
  // Blocos internos com modo fixo não precisam ouvir o sistema.
  const doCelular = useTemaDoCelular(modo === undefined);
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
    corBalao: cores.action.primary.default,
  };
}
