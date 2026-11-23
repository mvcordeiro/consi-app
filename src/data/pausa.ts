/**
 * Tela de pausa (Figma: seção "01.1 · PAUSA", nó 700:7576). A mensagem e o tempo de espera
 * vêm da regra do grupo do app que a pessoa tentou abrir (ver gruposHome.ts).
 */

import { useEffect, useState } from 'react';

import { ConsiPausa } from '../../modules/consi-pausa';
import {
  completarResistencia,
  gravarEstado,
  inserirResistencia,
  lerEstado,
  listarResistencias,
  type ResistenciaGravada,
} from './banco';
import { DIAS_GUARDADOS, inicioDoDia } from './emocoes';
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
/**
 * Uma escolha na pausa de não abrir o app (ou de sair dele).
 * - `depoisDeUsar`: a pessoa já estava usando o app (o tempo liberado acabou, ou é o "Cuidar
 *   tempo", em que a pausa sempre vem depois de um tempo no app) e escolheu parar.
 * - `checkinEm`: o check-in feito na mesma pausa (antes ou logo depois da escolha).
 * - `hobby`: o hobby explorado no lugar do app.
 */
export type Resistencia = ResistenciaGravada;

/**
 * Registra que a pessoa desistiu de abrir (ou de continuar usando) o app na pausa.
 * Devolve o instante do registro, para ligar depois o check-in feito em seguida.
 */
export async function registrarResistencia(r: Omit<Resistencia, 'em'>): Promise<number | null> {
  const em = Date.now();
  try {
    await inserirResistencia({ ...r, em });
    return em;
  } catch {
    // sem armazenamento, o registro vale só para esta sessão
    return null;
  }
}

/** Liga a escolha ao check-in feito logo depois, na mesma pausa. */
export async function ligarCheckin(resistenciaEm: number | null, checkinEm: number | null) {
  if (!resistenciaEm || !checkinEm) return;
  await completarResistencia(resistenciaEm, { checkinEm }).catch(() => {});
}

/** As escolhas de não abrir dos últimos 7 dias (para "Sua semana"). */
export async function resistenciasDaSemana(): Promise<Resistencia[]> {
  try {
    return await listarResistencias(inicioDoDia(DIAS_GUARDADOS - 1).getTime());
  } catch {
    return [];
  }
}

// ─── Liberações: saber se a pausa chegou depois de um tempo no app ──────────
const CHAVE_LIBERACOES = 'consi:pausa:liberacoes';
/** Folga depois do fim do tempo liberado em que a pausa ainda conta como "depois de usar". */
const FOLGA_MS = 3 * 60_000;

type Liberacoes = Record<string, { em: number; ate: number }>;

async function lerLiberacoes(): Promise<Liberacoes> {
  try {
    return JSON.parse((await lerEstado(CHAVE_LIBERACOES)) ?? '{}') as Liberacoes;
  } catch {
    return {};
  }
}

/** A pessoa escolheu "Quanto tempo você precisa?" e foi para o app: guarda até quando ele está liberado. */
export async function marcarLiberacao(app: string | undefined, minutos: number) {
  if (!app || minutos <= 0) return;
  const agora = Date.now();
  const l = await lerLiberacoes();
  l[app] = { em: agora, ate: agora + minutos * 60_000 };
  await gravarEstado(CHAVE_LIBERACOES, JSON.stringify(l)).catch(() => {});
}

/**
 * A pausa veio depois de a pessoa já ter usado o app? Sempre no "Cuidar tempo" (a pausa só
 * chega depois de um tempo no app); no "Apenas pausar", quando o tempo liberado para esse app
 * acabou agora há pouco. Só vale para a pausa aberta pelo vigia.
 */
export async function pausaDepoisDeUsar(g: Grupo, app: string | undefined, doVigia: boolean) {
  if (!doVigia) return false;
  if (g.modo === 'cuidar-tempo') return true;
  if (!app) return false;
  const lib = (await lerLiberacoes())[app];
  const agora = Date.now();
  return !!lib && agora >= lib.em && agora <= lib.ate + FOLGA_MS;
}

// ─── Bloqueio depois do "Dessa vez não abro" (só no APK Android) ───────────
/**
 * Depois de escolher não abrir (ou de sair do app na pausa), o app fica fechado por alguns
 * minutos: tentar abrir de novo mostra a pausa sem a opção de continuar. Ligado por padrão
 * (5 minutos); a pessoa desliga ou muda o tempo em Ajustes → Pausa e lembretes.
 */
export type Bloqueio = { ligado: boolean; minutos: number };

const CHAVE_BLOQUEIO = 'consi:pausa:bloqueio';
export const BLOQUEIO_PADRAO: Bloqueio = { ligado: true, minutos: 5 };
export const BLOQUEIO_MIN = 1;
export const BLOQUEIO_MAX = 120;

let bloqueioAtual: Bloqueio | null = null;
const ouvintesBloqueio = new Set<(b: Bloqueio) => void>();

export async function lerBloqueio(): Promise<Bloqueio> {
  if (bloqueioAtual) return bloqueioAtual;
  try {
    const bruto = await lerEstado(CHAVE_BLOQUEIO);
    bloqueioAtual = { ...BLOQUEIO_PADRAO, ...(bruto ? (JSON.parse(bruto) as Partial<Bloqueio>) : {}) };
  } catch {
    bloqueioAtual = BLOQUEIO_PADRAO;
  }
  return bloqueioAtual;
}

export async function gravarBloqueio(b: Bloqueio) {
  const novo = { ligado: b.ligado, minutos: Math.min(BLOQUEIO_MAX, Math.max(BLOQUEIO_MIN, Math.round(b.minutos))) };
  bloqueioAtual = novo;
  ouvintesBloqueio.forEach((f) => f(novo));
  await gravarEstado(CHAVE_BLOQUEIO, JSON.stringify(novo)).catch(() => {});
}

export function useBloqueio(): Bloqueio {
  const [b, setB] = useState<Bloqueio>(bloqueioAtual ?? BLOQUEIO_PADRAO);
  useEffect(() => {
    let vivo = true;
    lerBloqueio().then((x) => vivo && setB(x));
    ouvintesBloqueio.add(setB);
    return () => {
      vivo = false;
      ouvintesBloqueio.delete(setB);
    };
  }, []);
  return b;
}

/** Depois do "não abro" numa pausa do vigia: fecha o app pelo tempo escolhido (se ligado). */
export async function bloquearDepoisDeNaoAbrir(app: string | undefined) {
  if (!app || !ConsiPausa?.bloquear) return;
  const b = await lerBloqueio();
  if (!b.ligado) return;
  try {
    ConsiPausa.bloquear(app, b.minutos);
  } catch {
    // sem o bloqueio, a pausa segue como antes
  }
}

/** Até quando o app está bloqueado (epoch ms; 0 = não está). */
export function bloqueadoAte(app: string | undefined): number {
  if (!app || !ConsiPausa?.bloqueadoAte) return 0;
  try {
    return ConsiPausa.bloqueadoAte(app);
  } catch {
    return 0;
  }
}

/**
 * Sair da pausa aberta pelo vigia: para a tela inicial do celular, não a do Consi (a pessoa
 * estava tentando abrir outro app). Devolve false sem o módulo (APK antigo, web, iPhone).
 */
export function irParaInicioDoCelular(): boolean {
  try {
    return ConsiPausa?.irParaInicio?.() ?? false;
  } catch {
    return false;
  }
}
