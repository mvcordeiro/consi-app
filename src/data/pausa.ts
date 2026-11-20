/**
 * Tela de pausa (Figma: seção "01.1 · PAUSA", nó 700:7576). A mensagem e o tempo de espera
 * vêm da regra do grupo do app que a pessoa tentou abrir (ver gruposHome.ts).
 */

import { inserirResistencia } from './banco';
import { appPorId, ID_LIVRE, type Grupo } from './gruposHome';

/**
 * A regra que vale para a pausa: o grupo pedido, o do app ou, por fim, o "Livre".
 * `grupos` vem de useGrupos(), para a tela acompanhar quando o armazenamento termina de carregar.
 */
export function regraDaPausa(grupos: Grupo[], params: { grupo?: string; app?: string }) {
  const app = params.app ? appPorId(params.app)?.nome : undefined;
  const grupo =
    grupos.find((g) => g.id === params.grupo) ??
    (params.app ? grupos.find((g) => g.apps.includes(params.app!)) : undefined) ??
    grupos.find((g) => g.id === ID_LIVRE)!;
  return { grupo, app };
}

/**
 * Depois da pausa, "Quanto tempo você precisa?" só faz sentido no "Apenas pausar": no
 * "Cuidar tempo" (quando ignorar o lembrete leva à pausa) o grupo já tem o próprio intervalo.
 * PROVISÓRIO (pedido do produto, para testes): aparece sempre. Depois, voltar a depender do grupo:
 *   return g.modo === 'apenas-pausar';
 */
export const perguntaTempoNoApp = (g: Grupo) => true;

// ─── "Dessa vez não abro" ───────────────────────────────────────────────────
export type Resistencia = { em: number; grupo: string; app?: string };

/** Registra que a pessoa desistiu de abrir o app na pausa. */
export async function registrarResistencia(r: Omit<Resistencia, 'em'>) {
  try {
    await inserirResistencia({ ...r, em: Date.now() });
  } catch {
    // sem armazenamento, o registro vale só para esta sessão
  }
}
