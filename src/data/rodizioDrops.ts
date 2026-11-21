/**
 * Rodízio das formas de revelar um drop (ver src/components/home/revelar).
 *
 * Algoritmo: "saco embaralhado". As 7 mecânicas entram numa fila em ordem aleatória
 * (Fisher–Yates); cada drop revelado consome a primeira da fila. Quando a fila acaba, ela é
 * embaralhada de novo, e a primeira da nova rodada nunca é a última da anterior. Assim:
 * - cada mecânica aparece uma vez a cada 7 drops (nenhuma some ou domina por azar);
 * - nunca há a mesma mecânica duas vezes seguidas;
 * - a ordem muda a cada rodada, então a pessoa não decora a sequência.
 * A fila fica no banco local (tabela estado), para seguir de onde parou entre aberturas do app.
 * Só avança quando um drop é revelado: abrir a Home e sair não "gasta" a mecânica.
 */
import { gravarEstado, lerEstado } from './banco';

export const IDS_MECANICAS = ['arrastar', 'vidro', 'segurar', 'toques', 'tampa', 'carta', 'bolhas'] as const;
export type IdMecanica = (typeof IDS_MECANICAS)[number];

const CHAVE = 'consi:drops:rodizio';

type Rodizio = { fila: IdMecanica[]; ultima: IdMecanica | null };

function embaralhar<T>(lista: readonly T[]): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Nova rodada: todas embaralhadas, sem começar pela que acabou de sair. */
export function novaRodada(ultima: IdMecanica | null): IdMecanica[] {
  const fila = embaralhar(IDS_MECANICAS);
  if (ultima && fila[0] === ultima) {
    const j = 1 + Math.floor(Math.random() * (fila.length - 1));
    [fila[0], fila[j]] = [fila[j], fila[0]];
  }
  return fila;
}

function valido(x: unknown): x is IdMecanica {
  return typeof x === 'string' && (IDS_MECANICAS as readonly string[]).includes(x);
}

async function ler(): Promise<Rodizio> {
  try {
    const bruto = await lerEstado(CHAVE);
    if (bruto) {
      const r = JSON.parse(bruto) as Partial<Rodizio>;
      const fila = Array.isArray(r.fila) ? r.fila.filter(valido) : [];
      const ultima = valido(r.ultima) ? r.ultima : null;
      if (fila.length) return { fila, ultima };
      return { fila: novaRodada(ultima), ultima };
    }
  } catch {
    // sem banco (ou dado corrompido): começa uma rodada nova
  }
  return { fila: novaRodada(null), ultima: null };
}

/** A mecânica do próximo drop (não consome: a fila só anda quando o drop é revelado). */
export async function mecanicaAtual(): Promise<IdMecanica> {
  const r = await ler();
  await gravarEstado(CHAVE, JSON.stringify(r)).catch(() => {});
  return r.fila[0];
}

/** O drop foi revelado: tira a mecânica usada da fila e devolve a do próximo drop. */
export async function avancarMecanica(): Promise<IdMecanica> {
  const r = await ler();
  const usada = r.fila.shift() ?? null;
  const fila = r.fila.length ? r.fila : novaRodada(usada);
  await gravarEstado(CHAVE, JSON.stringify({ fila, ultima: usada })).catch(() => {});
  return fila[0];
}
