/**
 * Linha do tempo privada de uma atividade (issue #6): atualizações com texto (links viram
 * toque), foto, vídeo ou áudio. Fica só no aparelho (banco local + pasta de anexos); nada vai
 * para o Supabase. Uma lista por atividade, da mais antiga para a mais nova (como um chat).
 */
import { useCallback, useEffect, useState } from 'react';

import { gravarEstado, lerEstado } from './banco';

export type MidiaAtualizacao =
  | { tipo: 'foto'; uri: string }
  | { tipo: 'video'; uri: string; duracao?: number }
  | { tipo: 'audio'; uri: string; duracao: number };

export type Atualizacao = { id: string; em: number; editadaEm?: number; texto?: string; midia?: MidiaAtualizacao };

/** Limites de mídia: vídeo até 60 s, áudio até 5 min. */
export const LIMITES_MIDIA = { videoSeg: 60, audioSeg: 5 * 60, textoMax: 2000 };

const chave = (atividadeId: string) => `consi:atividade:atualizacoes:${atividadeId}`;
const cache = new Map<string, Atualizacao[]>();
const ouvintes = new Map<string, Set<(l: Atualizacao[]) => void>>();

async function ler(id: string): Promise<Atualizacao[]> {
  const c = cache.get(id);
  if (c) return c;
  let l: Atualizacao[] = [];
  try {
    const bruto = await lerEstado(chave(id));
    if (bruto) l = (JSON.parse(bruto) as Atualizacao[]).filter((a) => a && typeof a.id === 'string');
  } catch {
    l = [];
  }
  cache.set(id, l);
  return l;
}

async function gravar(id: string, l: Atualizacao[]) {
  cache.set(id, l);
  ouvintes.get(id)?.forEach((f) => f(l));
  await gravarEstado(chave(id), JSON.stringify(l)).catch(() => {});
}

/** URLs no texto (http, https ou www.), para virarem links. */
export const REGEX_LINK = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function useAtualizacoes(atividadeId: string) {
  const [lista, setLista] = useState<Atualizacao[]>(() => cache.get(atividadeId) ?? []);

  useEffect(() => {
    let vivo = true;
    ler(atividadeId).then((l) => vivo && setLista(l));
    const set = ouvintes.get(atividadeId) ?? new Set();
    set.add(setLista);
    ouvintes.set(atividadeId, set);
    return () => {
      vivo = false;
      set.delete(setLista);
    };
  }, [atividadeId]);

  const adicionar = useCallback(
    async (a: Omit<Atualizacao, 'id' | 'em'>) => {
      const l = await ler(atividadeId);
      await gravar(atividadeId, [...l, { ...a, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, em: Date.now() }]);
    },
    [atividadeId],
  );

  const editar = useCallback(
    async (id: string, mudanca: Pick<Atualizacao, 'texto' | 'midia'>) => {
      const l = await ler(atividadeId);
      await gravar(
        atividadeId,
        l.map((a) => (a.id === id ? { ...a, ...mudanca, editadaEm: Date.now() } : a)),
      );
    },
    [atividadeId],
  );

  const apagar = useCallback(
    async (id: string) => {
      const l = await ler(atividadeId);
      await gravar(
        atividadeId,
        l.filter((a) => a.id !== id),
      );
    },
    [atividadeId],
  );

  return { lista, adicionar, editar, apagar };
}
