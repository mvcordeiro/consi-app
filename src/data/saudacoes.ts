/**
 * Saudação dinâmica do hero da Home (issue #7). No lugar de um "Olá, (nome)! Como você está
 * hoje?" fixo, a frase muda pelo contexto: quem volta depois de dias, a primeira abertura do dia,
 * a última emoção registrada, o horário e o dia da semana.
 *
 * - Cada frase tem duas linhas: um cumprimento e uma pergunta. `{, nome}` vira ", Ana" (ou some,
 *   sem nome) e `{a emoção}` vira "a alegria", "o tédio"…
 * - Rotação sem repetição recente: as últimas frases ditas ficam no banco local e não voltam
 *   enquanto houver outra do mesmo contexto.
 * - A frase dura um tempo (DURACAO_MS): sair da Home e voltar logo não troca o texto.
 * - Os textos ficam todos aqui, num lugar só, para a tradução (issue #8).
 */
import { gravarEstado, lerEstado } from './banco';
import { emocaoPorId, type RegistroEmocao } from './emocoes';

type Contexto =
  | 'retorno'
  | 'emocao'
  | 'madrugada'
  | 'manha'
  | 'tarde'
  | 'noite'
  | 'segunda'
  | 'sexta'
  | 'fim-de-semana'
  | 'geral';

/** Emoção com artigo, para caber no meio da frase. */
const EMOCAO_NA_FRASE: Record<string, string> = {
  satisfeito: 'a satisfação',
  alegria: 'a alegria',
  tristeza: 'a tristeza',
  vergonha: 'a vergonha',
  orgulho: 'o orgulho',
  admiracao: 'a admiração',
  medo: 'o medo',
  repulsa: 'a repulsa',
  tedio: 'o tédio',
  fascinacao: 'a fascinação',
  raiva: 'a raiva',
  desprezo: 'o desprezo',
  esperanca: 'a esperança',
  desejo: 'o desejo',
};

const FRASES: Record<Contexto, string[]> = {
  retorno: [
    'Que bom te ver de novo{, nome}!\nComo você tem estado?',
    'Oi de novo{, nome}!\nComo foram esses dias?',
    'Que bom que você voltou{, nome}.\nO que mudou por aí?',
    'Faz uns dias, né{, nome}?\nComo você está agora?',
    'Olá{, nome}! Sem pressa.\nComo você chega hoje?',
    'Voltou{, nome}!\nComo anda o coração?',
  ],
  emocao: [
    'Mais cedo foi {a emoção}.\nE agora, como está?',
    'Ainda sentindo {a emoção}?\nOu algo mudou?',
    'Como ficou {a emoção}\nde mais cedo?',
    '{A emoção} ainda está por aí?\nConta pra gente.',
    'Depois {da emoção} de hoje,\ncomo você está?',
    'Oi de novo{, nome}.\nAinda é {a emoção}?',
  ],
  madrugada: [
    'Sem sono{, nome}?\nComo você está?',
    'A noite está longa?\nComo você se sente?',
    'Oi{, nome}. Tudo quieto por aí?\nComo você está?',
    'Madrugada pede calma.\nO que você está sentindo?',
    'Ainda de pé{, nome}?\nComo está a cabeça?',
  ],
  manha: [
    'Bom dia{, nome}!\nComo você acordou?',
    'Bom dia{, nome}!\nComo você está hoje?',
    'Bom dia{, nome}!\nO que o dia está pedindo?',
    'Manhã nova{, nome}.\nComo você chega nela?',
    'Bom dia{, nome}!\nComo foi a noite?',
    'Começando o dia{, nome}?\nComo você está?',
    'Bom dia{, nome}!\nQual é o clima por dentro?',
  ],
  tarde: [
    'Boa tarde{, nome}!\nComo está o dia?',
    'Boa tarde{, nome}!\nComo você está agora?',
    'Boa tarde{, nome}!\nO dia está sendo como?',
    'Metade do dia já foi{, nome}.\nComo você está?',
    'Boa tarde{, nome}!\nUma pausa pra sentir?',
    'Oi{, nome}! Como vai a tarde?\nE você, como está?',
    'Boa tarde{, nome}!\nO que ficou da manhã?',
  ],
  noite: [
    'Boa noite{, nome}!\nComo foi o seu dia?',
    'Boa noite{, nome}!\nComo você está agora?',
    'Boa noite{, nome}!\nO que ficou de hoje?',
    'O dia está terminando{, nome}.\nComo você está?',
    'Boa noite{, nome}!\nComo chega o fim do dia?',
    'Boa noite{, nome}!\nHora de desacelerar?',
    'Oi{, nome}! Dia longo?\nComo você se sente?',
  ],
  segunda: [
    'Segunda-feira{, nome}.\nComo começa a semana?',
    'Semana nova{, nome}!\nComo você chega nela?',
    'Oi{, nome}! É segunda.\nO que a semana está pedindo?',
    'Segunda de novo{, nome}.\nComo você está?',
  ],
  sexta: [
    'Sexta-feira{, nome}!\nComo foi a semana?',
    'Chegou a sexta{, nome}.\nComo você está?',
    'Oi{, nome}! É sexta.\nO que fica dessa semana?',
    'Sexta{, nome}!\nComo está o cansaço?',
  ],
  'fim-de-semana': [
    'Fim de semana{, nome}!\nComo você está?',
    'Oi{, nome}! Dia de descanso?\nComo você se sente?',
    'Fim de semana chegou{, nome}.\nO que você quer sentir?',
    'Sem pressa hoje{, nome}.\nComo você está?',
    'Oi{, nome}! Dia mais leve?\nComo está por dentro?',
  ],
  geral: [
    'Olá{, nome}!\nComo você está hoje?',
    'Oi{, nome}!\nComo você está agora?',
    'Olá{, nome}!\nO que você está sentindo?',
    'Oi{, nome}! Respira um pouco.\nComo você está?',
    'Olá{, nome}!\nComo está o coração hoje?',
    'Oi{, nome}!\nQual emoção está por perto?',
    'Olá{, nome}!\nComo você chega aqui agora?',
    'Oi{, nome}! Um segundo pra você.\nComo está?',
    'Olá{, nome}!\nO que está passando por aí?',
    'Oi{, nome}!\nComo está a cabeça hoje?',
  ],
};

/** Frase escolhida mais o que for preciso para montá-la. */
export type Saudacao = { modelo: string; emocao?: string };

const CHAVE = 'consi:home:saudacao';
/** Quantas frases ditas por último ficam de fora da próxima escolha. */
const RECENTES = 24;
/** A frase vale por esse tempo: voltar à Home logo depois não troca o texto. */
const DURACAO_MS = 20 * 60 * 1000;
/** Sem abrir o app por esse tempo, a pessoa "voltou". */
const RETORNO_MS = 3 * 24 * 60 * 60 * 1000;
/** A emoção registrada (de hoje) só entra na frase depois desse tempo: logo após, seria repetitivo. */
const EMOCAO_DEPOIS_MS = 45 * 60 * 1000;

type Guardado = {
  recentes: string[];
  ultimaAbertura: number;
  atual?: Saudacao & { em: number };
};

async function ler(): Promise<Guardado> {
  try {
    const bruto = await lerEstado(CHAVE);
    if (bruto) {
      const g = JSON.parse(bruto) as Partial<Guardado>;
      return {
        recentes: Array.isArray(g.recentes) ? g.recentes.filter((x) => typeof x === 'string') : [],
        ultimaAbertura: typeof g.ultimaAbertura === 'number' ? g.ultimaAbertura : 0,
        atual: g.atual && typeof g.atual.modelo === 'string' ? g.atual : undefined,
      };
    }
  } catch {
    // sem banco ou dado corrompido: começa do zero
  }
  return { recentes: [], ultimaAbertura: 0 };
}

const sortear = <T>(l: T[]) => l[Math.floor(Math.random() * l.length)];

/** Contextos que valem agora, do mais específico para o mais geral. */
function contextos(agora: Date, ultimaAbertura: number, emocao?: RegistroEmocao): Contexto[] {
  const r: Contexto[] = [];
  if (ultimaAbertura && agora.getTime() - ultimaAbertura >= RETORNO_MS) r.push('retorno');
  if (emocao && EMOCAO_NA_FRASE[emocao.id] && agora.getTime() - emocao.em >= EMOCAO_DEPOIS_MS) r.push('emocao');
  const h = agora.getHours();
  const dia = agora.getDay();
  if (dia === 0 || dia === 6) r.push('fim-de-semana');
  else if (dia === 1 && h < 14) r.push('segunda');
  else if (dia === 5 && h >= 12) r.push('sexta');
  r.push(h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite');
  r.push('geral');
  return r;
}

/**
 * A saudação desta abertura da Home. `ultimaEmocao` é o check-in mais recente de hoje.
 * Primeira abertura do dia e retorno sempre ganham frase nova; fora isso, a frase dura DURACAO_MS.
 */
export async function saudacaoDaVez(ultimaEmocao?: RegistroEmocao, agora = new Date()): Promise<Saudacao> {
  const g = await ler();
  const t = agora.getTime();
  const primeiraDoDia = !g.ultimaAbertura || new Date(g.ultimaAbertura).toDateString() !== agora.toDateString();

  if (g.atual && !primeiraDoDia && t - g.atual.em < DURACAO_MS) {
    await gravarEstado(CHAVE, JSON.stringify({ ...g, ultimaAbertura: t })).catch(() => {});
    return g.atual;
  }

  const ctx = contextos(agora, g.ultimaAbertura, ultimaEmocao);
  // Quem volta ou abre pela primeira vez no dia é cumprimentado pelo horário (ou pelo retorno),
  // não pela emoção de antes. Nas outras vezes, um contexto específico ganha de "geral" em 2 de 3.
  const ordem = primeiraDoDia ? ctx.filter((c) => c !== 'emocao') : ctx;
  const escolhido =
    ordem[0] === 'retorno' || ordem[0] === 'emocao' || Math.random() < 2 / 3
      ? ordem[0]
      : sortear(ordem.slice(1));

  // Ainda não ditas há pouco; se todas foram, a dita há mais tempo (nunca a mesma em sequência).
  const pool = FRASES[escolhido];
  const livres = pool.filter((f) => !g.recentes.includes(f));
  const modelo = livres.length
    ? sortear(livres)
    : pool.reduce((a, b) => (g.recentes.indexOf(b) > g.recentes.indexOf(a) ? b : a));
  const s: Saudacao = escolhido === 'emocao' && ultimaEmocao ? { modelo, emocao: ultimaEmocao.id } : { modelo };

  const novo: Guardado = {
    recentes: [modelo, ...g.recentes.filter((f) => f !== modelo)].slice(0, RECENTES),
    ultimaAbertura: t,
    atual: { ...s, em: t },
  };
  await gravarEstado(CHAVE, JSON.stringify(novo)).catch(() => {});
  return s;
}

/** Monta o texto com o nome e a emoção. */
export function textoDaSaudacao({ modelo, emocao }: Saudacao, nome: string) {
  // Nome trocado em Ajustes (estilo ou nome próprio): entra o nome escolhido, sem artigo,
  // porque não dá para saber o gênero dele.
  const e = emocaoPorId(emocao);
  const renomeada = !!e && e.nome !== e.nomeOriginal;
  const comEmocao = renomeada ? e.nome.toLowerCase() : (EMOCAO_NA_FRASE[emocao ?? ''] ?? 'essa emoção');
  const daEmocao = renomeada ? `de ${comEmocao}` : comEmocao.replace(/^a /, 'da ').replace(/^o /, 'do ');
  return modelo
    .replace('{, nome}', nome ? `, ${nome}` : '')
    .replace('{A emoção}', comEmocao[0].toUpperCase() + comEmocao.slice(1))
    .replace('{a emoção}', comEmocao)
    .replace('{da emoção}', daEmocao);
}

/** Para testes e para a contagem da issue (60+). */
export const TOTAL_SAUDACOES = Object.values(FRASES).reduce((n, l) => n + l.length, 0);
