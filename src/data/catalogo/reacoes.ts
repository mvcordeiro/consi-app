import type { NomeIcone } from '@/components/icones';

import type { ReacaoId, Sentimento } from './tipos';

/** Reações dos comentários, com os rostos do Design System (Streamline Freehand). */
export const reacoes: { id: ReacaoId; rotulo: string; icone: NomeIcone }[] = [
  { id: 'curti', rotulo: 'Curti', icone: 'rosto-positivo' },
  { id: 'amei', rotulo: 'Amei', icone: 'beijo-coracao' },
  { id: 'haha', rotulo: 'Haha', icone: 'rosto-gargalhando' },
  { id: 'uau', rotulo: 'Uau', icone: 'rosto-olhos-brilhantes' },
  { id: 'emocionei', rotulo: 'Emocionei', icone: 'rosto-chorando-arco-iris' },
  { id: 'parabens', rotulo: 'Parabéns', icone: 'gesto-comemoracao' },
];

export const reacaoPorId = Object.fromEntries(reacoes.map((r) => [r.id, r])) as Record<
  ReacaoId,
  (typeof reacoes)[number]
>;

export const sentimentos: Record<Sentimento, { rotulo: string }> = {
  leveza: { rotulo: 'Leveza' },
  calma: { rotulo: 'Calma' },
  cansaco: { rotulo: 'Cansaço' },
  distracao: { rotulo: 'Distração' },
};
