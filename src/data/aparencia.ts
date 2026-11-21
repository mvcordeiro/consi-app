/**
 * Aparência escolhida em Ajustes (PROVISÓRIO, para testes): seguir o celular, Claro ou Escuro.
 * Fica gravada no aparelho e vale para o app todo (o <ModoDeCor> do layout raiz lê daqui).
 */
import { useSyncExternalStore } from 'react';

import type { Modo } from '@/theme/tokens';

import { gravarEstado, lerEstado } from './banco';

export type Aparencia = 'sistema' | Modo;

const CHAVE = 'consi:aparencia';
let atual: Aparencia = 'sistema';
let carregou = false;
const ouvintes = new Set<() => void>();

function assinar(f: () => void) {
  if (!carregou) {
    carregou = true;
    lerEstado(CHAVE)
      .then((v) => {
        if (v === 'light' || v === 'dark') {
          atual = v;
          ouvintes.forEach((o) => o());
        }
      })
      .catch(() => {});
  }
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function useAparencia(): Aparencia {
  return useSyncExternalStore(
    assinar,
    () => atual,
    () => atual,
  );
}

export function definirAparencia(a: Aparencia) {
  atual = a;
  ouvintes.forEach((o) => o());
  gravarEstado(CHAVE, a).catch(() => {});
}
