/**
 * Lembrete diário de escrita no Diário (só no APK Android, a partir do versionCode 12): nos dias
 * e no horário que a pessoa escolher, uma notificação com uma pergunta do dia. Tocar abre um
 * momento novo já com a pergunta. As escolhas ficam no aparelho e são mandadas para o Android
 * (LembreteDiario.kt), que agenda o alarme mesmo com o Consi fechado.
 *
 * Quem já usava o Consi antes desta versão (e quem acaba de terminar o onboarding) vê uma vez
 * o convite para ligar (AvisoLembreteDiario); a escolha fica gravada em `perguntado`.
 */
import { useEffect, useState } from 'react';

import { ConsiPausa } from '../../modules/consi-pausa';
import { gravarEstado, lerEstado } from './banco';
import { PERGUNTAS_DO_DIA } from './momentos';
import { pedirNotificacoes } from './vigia';

export type LembreteDiario = {
  ligado: boolean;
  hora: number;
  minuto: number;
  /** Dias da semana (0 = domingo … 6 = sábado). */
  dias: number[];
  /** O convite para ligar já apareceu (a pessoa respondeu sim ou não). */
  perguntado: boolean;
};

/** O Android deste aparelho sabe agendar o lembrete (APK 12 em diante). */
export const temLembreteDiario = !!ConsiPausa?.definirLembreteDiario;

const CHAVE = 'consi:diario:lembrete';
export const LEMBRETE_PADRAO: LembreteDiario = { ligado: false, hora: 20, minuto: 0, dias: [0, 1, 2, 3, 4, 5, 6], perguntado: false };
export const LETRAS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

let atual: LembreteDiario | null = null;
const ouvintes = new Set<(l: LembreteDiario) => void>();

export async function lerLembreteDiario(): Promise<LembreteDiario> {
  if (atual) return atual;
  try {
    const bruto = await lerEstado(CHAVE);
    atual = { ...LEMBRETE_PADRAO, ...(bruto ? (JSON.parse(bruto) as Partial<LembreteDiario>) : {}) };
  } catch {
    atual = LEMBRETE_PADRAO;
  }
  return atual;
}

/** Embaralha a partir de hoje: cada lembrete traz uma pergunta diferente, sem repetir por semanas. */
function perguntasEmbaralhadas() {
  const l = [...PERGUNTAS_DO_DIA];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

function mandarParaOAndroid(l: LembreteDiario) {
  try {
    const bits = l.dias.reduce((b, d) => b | (1 << d), 0);
    ConsiPausa?.definirLembreteDiario?.(l.ligado, l.hora, l.minuto, bits, JSON.stringify(perguntasEmbaralhadas()));
  } catch {
    // sem o módulo, nada é agendado
  }
}

export async function gravarLembreteDiario(mudanca: Partial<LembreteDiario>) {
  const antes = await lerLembreteDiario();
  const novo = { ...antes, ...mudanca };
  // ligar pede a permissão de notificação (Android 13+)
  if (novo.ligado && !antes.ligado) await pedirNotificacoes().catch(() => {});
  atual = novo;
  ouvintes.forEach((f) => f(novo));
  mandarParaOAndroid(novo);
  await gravarEstado(CHAVE, JSON.stringify(novo)).catch(() => {});
}

export function useLembreteDiario(): LembreteDiario {
  const [l, setL] = useState<LembreteDiario>(atual ?? LEMBRETE_PADRAO);
  useEffect(() => {
    let vivo = true;
    lerLembreteDiario().then((x) => vivo && setL(x));
    ouvintes.add(setL);
    return () => {
      vivo = false;
      ouvintes.delete(setL);
    };
  }, []);
  return l;
}

export const horario = (l: Pick<LembreteDiario, 'hora' | 'minuto'>) =>
  `${String(l.hora).padStart(2, '0')}:${String(l.minuto).padStart(2, '0')}`;

/** "todos os dias", "dias úteis", "fins de semana" ou "seg, qua, sex". */
export function descreverDias(dias: number[]) {
  const d = [...dias].sort();
  if (d.length === 7) return 'todos os dias';
  if (d.join() === '1,2,3,4,5') return 'de segunda a sexta';
  if (d.join() === '0,6') return 'nos fins de semana';
  if (!d.length) return 'nenhum dia';
  return d.map((x) => NOMES_DIAS[x].slice(0, 3)).join(', ');
}
