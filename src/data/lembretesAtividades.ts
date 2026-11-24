/**
 * Lembretes das atividades (issue #13). O lembrete de cada atividade é escolhido na folha
 * "Adicionar à agenda" (dia, horário e, opcional, repetir toda semana) e fica na própria
 * atividade. Aqui a lista vai para o Android (LembreteAtividades.kt), que agenda o alarme mesmo
 * com o Consi fechado. Uma chave geral em Ajustes → Pausa e lembretes desliga todos.
 * Sem o módulo nativo (web, Expo Go, APK antigo) nada é agendado.
 */
import { useEffect, useState } from 'react';

import { ConsiPausa } from '../../modules/consi-pausa';
import { gravarEstado, lerEstado } from './banco';
import type { AtividadeMinha } from './catalogo';

export const temLembretesAtividades = !!ConsiPausa?.definirLembretesAtividades;

const CHAVE = 'consi:atividades:lembretes-ligados';
let ligados: boolean | null = null;
let ultimas: AtividadeMinha[] = [];
const ouvintes = new Set<(l: boolean) => void>();

export async function lerLembretesAtividadesLigados(): Promise<boolean> {
  if (ligados !== null) return ligados;
  try {
    ligados = (await lerEstado(CHAVE)) !== 'nao';
  } catch {
    ligados = true;
  }
  return ligados;
}

export async function definirLembretesAtividadesLigados(l: boolean) {
  ligados = l;
  ouvintes.forEach((f) => f(l));
  await gravarEstado(CHAVE, l ? 'sim' : 'nao').catch(() => {});
  await sincronizarLembretesAtividades(ultimas);
}

export function useLembretesAtividadesLigados(): boolean {
  const [l, setL] = useState(ligados ?? true);
  useEffect(() => {
    lerLembretesAtividadesLigados().then(setL);
    ouvintes.add(setL);
    return () => {
      ouvintes.delete(setL);
    };
  }, []);
  return l;
}

/** Manda para o Android os lembretes das atividades em andamento (ou nenhum, com a chave desligada). */
export async function sincronizarLembretesAtividades(atividades: AtividadeMinha[]) {
  ultimas = atividades;
  if (!temLembretesAtividades) return;
  const lista = (await lerLembretesAtividadesLigados())
    ? atividades
        .filter((a) => a.status === 'andamento' && a.lembrete)
        .map((a) => ({ id: a.id, titulo: a.titulo, quando: a.lembrete!.quando, semanal: !!a.lembrete!.semanal }))
    : [];
  try {
    ConsiPausa?.definirLembretesAtividades?.(JSON.stringify(lista));
  } catch {
    // módulo nativo indisponível: fica sem lembrete
  }
}
