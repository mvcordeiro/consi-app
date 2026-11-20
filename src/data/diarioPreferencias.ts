/**
 * Preferências da aba Diário, guardadas no aparelho: como ver (lista do Índice ou linha
 * do tempo da Constelação), se os check-ins sem texto aparecem e a pergunta do dia.
 */
import { useEffect, useState } from 'react';

import { gravarEstado, lerEstado } from './banco';
import { chaveDia, PERGUNTAS_DO_DIA } from './momentos';

export type VisaoDiario = 'lista' | 'linha';

export type PreferenciasDiario = {
  visao: VisaoDiario;
  /** Check-ins sem texto (os da Home e da Pausa) aparecem no Índice. */
  semTexto: boolean;
  /** Pergunta da "Página de hoje": o dia em que foi sorteada e qual é. */
  pergunta: { dia: string; indice: number };
};

const CHAVE = 'consi:diario:preferencias';
const padrao = (): PreferenciasDiario => ({ visao: 'lista', semTexto: true, pergunta: { dia: chaveDia(new Date()), indice: 0 } });

let atual: PreferenciasDiario | null = null;

export function usePreferenciasDiario(): [PreferenciasDiario, (m: Partial<PreferenciasDiario>) => void] {
  const [prefs, setPrefs] = useState<PreferenciasDiario>(() => atual ?? padrao());

  useEffect(() => {
    if (atual) return;
    lerEstado(CHAVE)
      .then((bruto) => {
        atual = { ...padrao(), ...(bruto ? (JSON.parse(bruto) as Partial<PreferenciasDiario>) : {}) };
        setPrefs(atual);
      })
      .catch(() => {});
  }, []);

  const mudar = (m: Partial<PreferenciasDiario>) => {
    setPrefs((p) => {
      const novo = { ...p, ...m };
      atual = novo;
      gravarEstado(CHAVE, JSON.stringify(novo)).catch(() => {});
      return novo;
    });
  };

  return [prefs, mudar];
}

/** A pergunta de hoje: troca sozinha a cada dia (e pelo botão de setas). */
export function perguntaDeHoje(p: PreferenciasDiario) {
  const hoje = chaveDia(new Date());
  if (p.pergunta.dia === hoje) return PERGUNTAS_DO_DIA[p.pergunta.indice % PERGUNTAS_DO_DIA.length];
  // um dia novo começa na pergunta seguinte à última vista
  return PERGUNTAS_DO_DIA[(p.pergunta.indice + 1) % PERGUNTAS_DO_DIA.length];
}

export function proximaPergunta(p: PreferenciasDiario): PreferenciasDiario['pergunta'] {
  const hoje = chaveDia(new Date());
  const base = p.pergunta.dia === hoje ? p.pergunta.indice : p.pergunta.indice + 1;
  return { dia: hoje, indice: (base + 1) % PERGUNTAS_DO_DIA.length };
}
