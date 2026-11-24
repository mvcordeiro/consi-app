/**
 * Duração das atividades em rótulos qualitativos, sem número. As atividades continuam
 * guardando `minutos` (catálogo, salvas e widgets), e o nível sai dele; ao criar, cada nível
 * grava um valor representativo. Os limites são os mesmos em Widgets.kt.
 */
export const NIVEIS_DURACAO = [
  { id: 'rapido', rotulo: 'É rápido', ate: 15, minutos: 15 },
  { id: 'tempinho', rotulo: 'Leva um tempinho', ate: 45, minutos: 30 },
  { id: 'demorar', rotulo: 'Pode demorar', ate: Infinity, minutos: 60 },
] as const;

export type NivelDuracao = (typeof NIVEIS_DURACAO)[number];

export function nivelDuracao(minutos: number): NivelDuracao {
  return NIVEIS_DURACAO.find((n) => minutos <= n.ate) ?? NIVEIS_DURACAO[NIVEIS_DURACAO.length - 1];
}

export function rotuloDuracao(minutos: number) {
  return nivelDuracao(minutos).rotulo;
}
