import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import type { Momento } from '@/data/momentos';

/**
 * Aviso deixado por uma tela que fechou (ex.: "Alterações salvas" depois de editar, ou
 * "Momento apagado"), para a tela que volta ao foco mostrar com o "Desfazer".
 */
export type AvisoPendente = { titulo: string; momento: Momento; desfazer?: () => void };

let pendente: AvisoPendente | null = null;

export function deixarAviso(a: AvisoPendente) {
  pendente = a;
}

/** Mostra o aviso pendente (uma vez) quando a tela volta ao foco. */
export function useAvisoPendente(mostrar: (a: AvisoPendente) => void) {
  useFocusEffect(
    useCallback(() => {
      if (!pendente) return;
      const a = pendente;
      pendente = null;
      // espera a transição de volta terminar
      const t = setTimeout(() => mostrar(a), 250);
      return () => clearTimeout(t);
    }, [mostrar]),
  );
}
