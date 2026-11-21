/**
 * Aparência escolhida em Ajustes: seguir o celular, Claro ou Escuro. Agora faz parte das
 * preferências (src/data/preferencias.ts); o <ModoDeCor> do layout raiz lê daqui.
 */
import { definirPreferencias, usePreferencias, type Aparencia } from './preferencias';

export type { Aparencia };

export function useAparencia(): Aparencia {
  return usePreferencias().aparencia;
}

export function definirAparencia(aparencia: Aparencia) {
  definirPreferencias({ aparencia });
}
