/**
 * Duração das atividades em rótulos qualitativos, sem número. As atividades continuam
 * guardando `minutos` (catálogo, salvas e widgets), e o nível sai dele; ao criar, cada nível
 * grava um valor representativo. Os limites são os mesmos em Widgets.kt.
 *
 * `fracao` desenha o IconeDuracao: um relógio que vai se enchendo do instante ao dia livre.
 */
export const NIVEIS_DURACAO = [
  { id: 'instante', rotulo: 'Num instante', ate: 5, minutos: 5, fracao: 1 / 8 },
  { id: 'rapido', rotulo: 'É rápido', ate: 15, minutos: 15, fracao: 1 / 4 },
  { id: 'tempinho', rotulo: 'Leva um tempinho', ate: 30, minutos: 30, fracao: 1 / 2 },
  { id: 'calma', rotulo: 'Pede um tempo com calma', ate: 60, minutos: 60, fracao: 3 / 4 },
  { id: 'demorar', rotulo: 'Pode demorar', ate: 120, minutos: 120, fracao: 1 },
  { id: 'dia', rotulo: 'Para um dia sem pressa', ate: Infinity, minutos: 180, fracao: 1 },
] as const;

export type NivelDuracao = (typeof NIVEIS_DURACAO)[number];

export function nivelDuracao(minutos: number): NivelDuracao {
  return NIVEIS_DURACAO.find((n) => minutos <= n.ate) ?? NIVEIS_DURACAO[NIVEIS_DURACAO.length - 1];
}

export function rotuloDuracao(minutos: number) {
  return nivelDuracao(minutos).rotulo;
}
