/**
 * Reflexões da Home (issue #15; DS "Card / Reflexão" 258:2042). Tudo é calculado no aparelho, a
 * partir de três fontes locais:
 * - os check-ins e momentos do Diário (data/momentos.ts);
 * - como cada pausa terminou (data/pausa.ts → desfechos, guardados por 30 dias);
 * - as escolhas de "Dessa vez não abro" (resistências), que também ligam o check-in feito depois.
 *
 * Cada regra só aparece quando há dados suficientes. Com menos de 3 dias de uso, aparece só a
 * Pergunta ("O que vem antes do celular?"); a resposta vira uma reflexão depois.
 * "Explorar" leva ao Diário (/diario/reflexao) com os momentos que a reflexão olhou.
 */
import { useEffect, useMemo, useState } from 'react';

import type { NomeIcone } from '@/components/icones';

import { appPorId } from './apps';
import { gravarEstado, lerEstado, listarResistencias, type PausaGravada, type ResistenciaGravada } from './banco';
import { emocaoPorId, inicioDoDia } from './emocoes';
import { chaveDia, diasAtras, DIAS_SEMANA, hora, MESES, MARCADOR_PAUSA, useMomentos, type Momento } from './momentos';
import { DIAS_DESFECHOS, useDesfechos } from './pausa';

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type Periodo = 'Madrugada' | 'Manhã' | 'Tarde' | 'Noite';

/** O recorte do Diário que a reflexão olhou (vai como parâmetro para /diario/reflexao). */
export type FiltroReflexao = {
  /** Últimos N dias. */
  dias: number;
  emocoes?: string[];
  /** 0 = domingo. */
  diaSemana?: number;
  periodo?: Periodo;
  /** Só check-ins feitos depois das 22 h. */
  depoisDas22?: boolean;
  /** Só momentos ligados a uma pausa. */
  pausa?: boolean;
};

export type DestinoReflexao =
  | { tipo: 'filtro'; filtro: FiltroReflexao }
  | { tipo: 'momento'; em: number }
  | { tipo: 'dia'; data: string }
  | { tipo: 'escrever'; pergunta: string };

export type AcaoReflexao = { rotulo: string; icone: NomeIcone; destino: DestinoReflexao };

type Base = { id: string; titulo: string; explicacao: string; acao: AcaoReflexao };

export type Reflexao = Base &
  (
    | { tipo: 'numero'; numero: string; complemento: string; legenda: string; etiqueta?: { rotulo: string; tom: 'sucesso' | 'neutro' } }
    | { tipo: 'semana'; legendaTopo: string; barras: { rotulo: string; valor: number; destaque: boolean }[]; rodape: string }
    | { tipo: 'emocoes'; legendaTopo: string; partes: { id: string; nome: string; pct: number }[] }
    | { tipo: 'citacao'; texto: string; emocao: string; quando: string }
    | { tipo: 'sequencia'; passos: { hora: string; titulo: string; detalhe: string; emocao?: string }[] }
    | { tipo: 'pergunta'; pergunta: string; opcoes: string[]; escolhidas: string[] }
  );

export type DadosReflexoes = {
  momentos: Momento[];
  desfechos: PausaGravada[];
  resistencias: ResistenciaGravada[];
  /** Respostas da Pergunta (chips), já gravadas. */
  respostas: string[];
};

// ─── Apoio ──────────────────────────────────────────────────────────────────
const DIA_MS = 24 * 60 * 60 * 1000;
export const AGRADAVEIS = new Set(['satisfeito', 'alegria', 'orgulho', 'admiracao', 'fascinacao', 'esperanca']);
export const DIFICEIS = new Set(['tristeza', 'vergonha', 'medo', 'repulsa', 'raiva', 'desprezo']);

export function periodoDe(em: number): Periodo {
  const h = new Date(em).getHours();
  return h < 5 ? 'Madrugada' : h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite';
}
const NO_PERIODO: Record<Periodo, string> = { Madrugada: 'de madrugada', Manhã: 'de manhã', Tarde: 'à tarde', Noite: 'à noite' };
const FAIXA: Record<Periodo, string> = { Madrugada: '0h às 5h', Manhã: '5h às 12h', Tarde: '12h às 18h', Noite: '18h à meia-noite' };
const DIAS_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
/** Barras da semana começando na segunda, como no DS. */
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const nomeEmocao = (id: string) => emocaoPorId(id)?.nome ?? id;
const nomeApp = (id?: string) => (id ? appPorId(id)?.nome : undefined);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const decimal = (n: number) => n.toFixed(1).replace('.', ',');
const naoAbriu = (p: PausaGravada) => p.desfecho !== 'abriu';
const dentro = (em: number, dias: number, agora: number) => em >= inicioDoDia(dias - 1, new Date(agora)).getTime() && em <= agora;
const ehDaPausa = (m: Momento) => m.origem === 'pausa' || !!m.marcadores?.includes(MARCADOR_PAUSA);

function contar<T>(lista: T[], chave: (x: T) => string) {
  const c = new Map<string, number>();
  for (const x of lista) c.set(chave(x), (c.get(chave(x)) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]);
}

/** Quantos dias diferentes têm algum dado (para saber se já dá para refletir). */
export function diasComDados(d: DadosReflexoes, agora = Date.now()) {
  const dias = new Set<string>();
  for (const m of d.momentos) if (dentro(m.em, DIAS_DESFECHOS, agora)) dias.add(chaveDia(m.em));
  for (const p of d.desfechos) dias.add(chaveDia(p.em));
  for (const r of d.resistencias) dias.add(chaveDia(r.em));
  return dias.size;
}

// ─── Regras ─────────────────────────────────────────────────────────────────
/** 1 · Número: quantas pausas da semana terminaram sem abrir o app. */
function naoAbrir(d: DadosReflexoes, agora: number): Reflexao | null {
  const semana = d.desfechos.filter((p) => dentro(p.em, 7, agora));
  if (semana.length < 5) return null;
  const n = semana.filter(naoAbriu).length;
  if (!n) return null;
  const antes = d.desfechos.filter((p) => !dentro(p.em, 7, agora) && dentro(p.em, 14, agora));
  const nAntes = antes.filter(naoAbriu).length;
  const diff = n - nAntes;
  const subiu = antes.length > 0 && diff > 0;
  return {
    id: 'nao-abrir',
    tipo: 'numero',
    titulo: subiu ? 'Você tem pausado mais antes de abrir.' : n * 2 >= semana.length ? 'Muitas pausas terminam fora do app.' : 'Algumas pausas já terminam fora do app.',
    explicacao:
      `Nesta semana, você escolheu não abrir o app em ${n} das ${semana.length} pausas.` +
      (antes.length ? ` Na semana passada foram ${nAntes}.` : ''),
    numero: String(n),
    complemento: `de ${semana.length} pausas`,
    legenda: 'terminaram sem abrir o app.',
    etiqueta: antes.length && diff !== 0 ? { rotulo: `${diff > 0 ? '+' : ''}${diff} em relação à semana passada`, tom: diff > 0 ? 'sucesso' : 'neutro' } : undefined,
    acao: { rotulo: 'Ver minhas pausas', icone: 'relogio', destino: { tipo: 'filtro', filtro: { dias: 7, pausa: true } } },
  };
}

/** 2 · Semana: o dia da semana com mais pausas nas últimas 4 semanas. */
function diaComMaisPausas(d: DadosReflexoes, agora: number): Reflexao | null {
  const lista = d.desfechos.filter((p) => dentro(p.em, 28, agora));
  if (lista.length < 10 || new Set(lista.map((p) => chaveDia(p.em))).size < 4) return null;
  const porDia = [0, 0, 0, 0, 0, 0, 0];
  for (const p of lista) porDia[new Date(p.em).getDay()]++;
  const max = porDia.indexOf(Math.max(...porDia));
  const mediaOutros = (lista.length - porDia[max]) / 6;
  const razao = mediaOutros ? porDia[max] / mediaOutros : 2;
  if (razao < 1.4) return null;
  return {
    id: 'dia-semana',
    tipo: 'semana',
    titulo: `Seus ${DIAS_PLURAL[max]} pedem mais pausa.`,
    explicacao: `Nas últimas semanas, ${DIAS_SEMANA[max]} foi o dia com mais pausas: ${porDia[max]} no total, ${razao >= 1.8 ? 'quase o dobro' : 'acima'} da média dos outros dias.`,
    legendaTopo: 'PAUSAS · ÚLTIMAS 4 SEMANAS',
    barras: ORDEM_SEMANA.map((i) => ({ rotulo: LETRAS[i], valor: porDia[i], destaque: i === max })),
    rodape: `Média dos outros dias: ${decimal(mediaOutros)}`,
    acao: { rotulo: 'Ver esses dias', icone: 'calendario', destino: { tipo: 'filtro', filtro: { dias: 28, diaSemana: max } } },
  };
}

/** 3 · Número: o período do dia com mais pausas nas últimas 2 semanas. */
function periodoComMaisPausas(d: DadosReflexoes, agora: number): Reflexao | null {
  const lista = d.desfechos.filter((p) => dentro(p.em, 14, agora));
  if (lista.length < 8) return null;
  const [[periodo, n]] = contar(lista, (p) => periodoDe(p.em)) as [Periodo, number][];
  const p = pct(n, lista.length);
  if (p < 40) return null;
  return {
    id: 'periodo',
    tipo: 'numero',
    titulo: `Você pega mais o celular ${NO_PERIODO[periodo]}.`,
    explicacao: `Nas últimas duas semanas, ${p}% das suas pausas foram ${NO_PERIODO[periodo]}. Vale olhar o que costuma acontecer nessa hora.`,
    numero: `${p}%`,
    complemento: 'das pausas',
    legenda: `${periodo}, das ${FAIXA[periodo]}.`,
    acao: { rotulo: 'Explorar essa relação', icone: 'binoculos', destino: { tipo: 'filtro', filtro: { dias: 14, periodo } } },
  };
}

function partes(lista: Momento[]) {
  return contar(lista, (m) => m.id)
    .slice(0, 4)
    .map(([id, n]) => ({ id, nome: nomeEmocao(id), pct: pct(n, lista.length) }));
}

/** 4 · Emoções: as emoções mais registradas na semana. */
function emocoesDaSemana(d: DadosReflexoes, agora: number): Reflexao | null {
  const lista = d.momentos.filter((m) => dentro(m.em, 7, agora));
  if (lista.length < 6) return null;
  const p = partes(lista);
  return {
    id: 'emocoes-semana',
    tipo: 'emocoes',
    titulo: `Sua semana teve mais ${p[0].nome}.`,
    explicacao: `Dos ${lista.length} check-ins dos últimos 7 dias, ${p[0].pct}% foram ${p[0].nome}.`,
    legendaTopo: `CHECK-INS · 7 DIAS · ${lista.length}`,
    partes: p,
    acao: { rotulo: 'Explorar essas emoções', icone: 'rosto-positivo', destino: { tipo: 'filtro', filtro: { dias: 7, emocoes: p.map((x) => x.id) } } },
  };
}

/** 5 · Emoções: noites (depois das 22 h) com mais emoções difíceis. */
function noitesTensas(d: DadosReflexoes, agora: number): Reflexao | null {
  const lista = d.momentos.filter((m) => dentro(m.em, 30, agora) && new Date(m.em).getHours() >= 22);
  if (lista.length < 5) return null;
  const dificeis = lista.filter((m) => DIFICEIS.has(m.id));
  if (dificeis.length * 2 < lista.length) return null;
  const nomes = [...new Set(dificeis.map((m) => m.id))].slice(0, 2).map(nomeEmocao);
  return {
    id: 'noites',
    tipo: 'emocoes',
    titulo: 'Suas noites têm sido mais tensas.',
    explicacao: `Dos check-ins depois das 22h neste mês, ${pct(dificeis.length, lista.length)}% foram de ${nomes.join(' ou ')}.`,
    legendaTopo: `CHECK-INS DEPOIS DAS 22H · ${lista.length} NO MÊS`,
    partes: partes(lista),
    acao: { rotulo: 'Explorar essas emoções', icone: 'rosto-positivo', destino: { tipo: 'filtro', filtro: { dias: 30, depoisDas22: true } } },
  };
}

/** 6 · Número: com uma emoção na pausa, ela costuma terminar no app (ou fora dele). */
function emocaoEDesfecho(d: DadosReflexoes, agora: number): Reflexao | null {
  const porEm = new Map(d.momentos.map((m) => [m.em, m.id]));
  const pares: { emocao: string; abriu: boolean }[] = [];
  for (const p of d.desfechos) if (p.checkinEm && porEm.has(p.checkinEm) && dentro(p.em, 30, agora)) pares.push({ emocao: porEm.get(p.checkinEm)!, abriu: p.desfecho === 'abriu' });
  if (pares.length < 3) return null;
  let melhor: { emocao: string; n: number; total: number; abriu: boolean } | null = null;
  for (const [emocao] of contar(pares, (x) => x.emocao)) {
    const desta = pares.filter((x) => x.emocao === emocao);
    if (desta.length < 3) continue;
    const abriu = desta.filter((x) => x.abriu).length;
    for (const [n, ehAbriu] of [[abriu, true], [desta.length - abriu, false]] as const) {
      if (n * 3 >= desta.length * 2 && (!melhor || n / desta.length > melhor.n / melhor.total)) melhor = { emocao, n, total: desta.length, abriu: ehAbriu };
    }
  }
  if (!melhor) return null;
  const nome = nomeEmocao(melhor.emocao);
  return {
    id: 'emocao-desfecho',
    tipo: 'numero',
    titulo: melhor.abriu ? `Com ${nome}, a pausa costuma terminar no app.` : `Com ${nome}, você costuma não abrir.`,
    explicacao: `Nas pausas em que você fez check-in de ${nome}, ${melhor.abriu ? 'a maioria terminou no app' : 'a maioria terminou sem abrir o app'}.`,
    numero: String(melhor.n),
    complemento: `de ${melhor.total} vezes`,
    legenda: melhor.abriu ? `com ${nome} na pausa, você abriu o app.` : `com ${nome} na pausa, você não abriu.`,
    acao: { rotulo: 'Explorar essa relação', icone: 'binoculos', destino: { tipo: 'filtro', filtro: { dias: 30, emocoes: [melhor.emocao], pausa: true } } },
  };
}

/** 7 · Citação: algo que a pessoa escreveu há alguns dias, para reler. */
function citacao(d: DadosReflexoes, agora: number): Reflexao | null {
  const candidatos = d.momentos.filter((m) => (m.texto?.trim().length ?? 0) >= 30 && diasAtras(m.em, new Date(agora)) >= 3);
  const m = candidatos.find(ehDaPausa) ?? candidatos.find((x) => AGRADAVEIS.has(x.id)) ?? candidatos[0];
  if (!m) return null;
  const n = diasAtras(m.em, new Date(agora));
  const ha = n >= 14 ? `Há ${Math.floor(n / 7)} semanas` : `Há ${n} dias`;
  const texto = m.texto!.trim().replace(/\s+/g, ' ');
  const data = new Date(m.em);
  return {
    id: 'citacao',
    tipo: 'citacao',
    titulo: AGRADAVEIS.has(m.id) ? 'Você já sabe o que te faz bem.' : 'Lembra do que você escreveu?',
    explicacao: `${ha} você escreveu isto${ehDaPausa(m) ? ' depois de uma pausa' : ''}. Ainda faz sentido pra você?`,
    texto: texto.length > 160 ? `${texto.slice(0, 157).trimEnd()}…` : texto,
    emocao: m.id,
    quando: `${nomeEmocao(m.id)} · ${data.getDate()} de ${MESES[data.getMonth()].slice(0, 3)}., ${hora(m.em)}`,
    acao: { rotulo: 'Reler esse momento', icone: 'caderno', destino: { tipo: 'momento', em: m.em } },
  };
}

const TEXTO_DESFECHO: Record<PausaGravada['desfecho'], [string, string]> = {
  abriu: ['Abriu o app', 'Seguiu depois da pausa'],
  naoAbriu: ['Dessa vez não abro', 'Você escolheu fechar'],
  hobby: ['Trocou por um hobby', 'Foi explorar uma atividade'],
  diario: ['Foi escrever', 'Abriu o Diário no lugar do app'],
};

/** 8 · Sequência: uma pausa recente em que a escolha veio junto de um check-in. */
function sequencia(d: DadosReflexoes, agora: number): Reflexao | null {
  const porEm = new Map(d.momentos.map((m) => [m.em, m]));
  type Seq = { em: number; passos: { em: number; titulo: string; detalhe: string; emocao?: string }[] };
  const seqs: Seq[] = [];
  for (const p of d.desfechos) {
    const c = p.checkinEm ? porEm.get(p.checkinEm) : undefined;
    if (!c || p.desfecho === 'abriu' || !dentro(p.em, 3, agora)) continue;
    const app = nomeApp(p.app);
    seqs.push({
      em: p.em,
      passos: [
        { em: c.em, titulo: `Check-in: ${nomeEmocao(c.id)}`, detalhe: app ? `Na pausa do ${app}` : 'Na pausa', emocao: c.id },
        { em: p.em, titulo: TEXTO_DESFECHO[p.desfecho][0], detalhe: TEXTO_DESFECHO[p.desfecho][1] },
      ],
    });
  }
  for (const r of d.resistencias) {
    const c = r.checkinEm ? porEm.get(r.checkinEm) : undefined;
    if (!c || c.em < r.em || !dentro(r.em, 3, agora)) continue;
    const app = nomeApp(r.app);
    seqs.push({
      em: c.em,
      passos: [
        { em: r.em, titulo: 'Dessa vez não abro', detalhe: app ? `Pausa antes do ${app}` : 'Você escolheu fechar' },
        { em: c.em, titulo: `Check-in: ${nomeEmocao(c.id)}`, detalhe: 'Logo depois da escolha', emocao: c.id },
      ],
    });
  }
  const s = seqs.sort((a, b) => b.em - a.em)[0];
  if (!s) return null;
  const n = diasAtras(s.em, new Date(agora));
  const quando = n === 0 ? 'Hoje' : n === 1 ? 'Ontem' : `${DIAS_SEMANA[new Date(s.em).getDay()][0].toUpperCase()}${DIAS_SEMANA[new Date(s.em).getDay()].slice(1)}`;
  return {
    id: 'sequencia',
    tipo: 'sequencia',
    titulo: 'A pausa muda o rumo do seu dia.',
    explicacao: `${quando}, uma pausa terminou longe do app. Foi assim:`,
    passos: s.passos.map((p) => ({ hora: hora(p.em), titulo: p.titulo, detalhe: p.detalhe, emocao: p.emocao })),
    acao: { rotulo: 'Ver esse dia no Diário', icone: 'caderno', destino: { tipo: 'dia', data: chaveDia(s.em) } },
  };
}

// ─── Pergunta ───────────────────────────────────────────────────────────────
export const PERGUNTA = 'O que vem antes do celular?';
export const OPCOES_PERGUNTA = ['Cansaço', 'Tédio', 'Ansiedade', 'Costume', 'Solidão', 'Outra coisa'];

function pergunta(d: DadosReflexoes): Reflexao {
  return {
    id: 'pergunta',
    tipo: 'pergunta',
    titulo: PERGUNTA,
    explicacao: 'Ainda estamos conhecendo seus dias. Só você sabe o motivo, e sua resposta ajuda o Consi a entender suas pausas.',
    pergunta: PERGUNTA,
    opcoes: OPCOES_PERGUNTA,
    escolhidas: d.respostas,
    acao: { rotulo: 'Escrever minha resposta', icone: 'lapis', destino: { tipo: 'escrever', pergunta: PERGUNTA } },
  };
}

/** 9 · A resposta da Pergunta, de volta alguns dias depois. */
function resposta(d: DadosReflexoes, agora: number): Reflexao | null {
  const r = d.respostas.filter((x) => x !== 'Outra coisa');
  if (!r.length) return null;
  const nomes = r.map((x) => x.toLowerCase());
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
  const tedio = r.includes('Tédio') ? d.momentos.filter((m) => m.id === 'tedio' && dentro(m.em, 30, agora)).length : 0;
  return {
    id: 'resposta',
    tipo: 'numero',
    titulo: `Você disse que ${lista} ${nomes.length > 1 ? 'vêm' : 'vem'} antes do celular.`,
    explicacao: tedio
      ? `Neste mês, Tédio apareceu em ${tedio} check-ins. Escrever sobre um desses momentos ajuda a ver o padrão.`
      : 'Escrever sobre um dia em que isso aconteceu ajuda a ver o padrão.',
    numero: String(tedio || r.length),
    complemento: tedio ? 'check-ins de Tédio' : r.length === 1 ? 'motivo escolhido' : 'motivos escolhidos',
    legenda: tedio ? 'nos últimos 30 dias.' : r.join(' · '),
    acao: { rotulo: 'Escrever sobre isso', icone: 'lapis', destino: { tipo: 'escrever', pergunta: PERGUNTA } },
  };
}

/** No máximo 5 reflexões, das mais ligadas às pausas para as mais gerais. */
export const MAX_REFLEXOES = 5;

/** As reflexões do momento. Vazia = a seção não aparece na Home. */
export function calcularReflexoes(d: DadosReflexoes, agora = Date.now()): Reflexao[] {
  // Poucos dias: só a Pergunta (continua lá depois de respondida, com as opções marcadas).
  if (diasComDados(d, agora) < 3) return [pergunta(d)];
  const regras = [naoAbrir, emocaoEDesfecho, sequencia, diaComMaisPausas, periodoComMaisPausas, noitesTensas, emocoesDaSemana, citacao, resposta];
  let out: Reflexao[] = [];
  for (const r of regras) {
    const x = r(d, agora);
    if (x) out.push(x);
  }
  // As duas de emoções juntas ficam repetitivas: fica a mais específica (noites).
  if (out.some((x) => x.id === 'noites')) out = out.filter((x) => x.id !== 'emocoes-semana');
  out = out.slice(0, MAX_REFLEXOES);
  // Sem resposta ainda, a Pergunta fecha a fila.
  if (!d.respostas.length && out.length < MAX_REFLEXOES) out.push(pergunta(d));
  return out;
}

// ─── Filtro do Diário ───────────────────────────────────────────────────────
/** Os momentos que a reflexão olhou (para /diario/reflexao). */
export function momentosDoFiltro(momentos: Momento[], f: FiltroReflexao, desfechos: PausaGravada[] = [], agora = Date.now()) {
  const daPausa = new Set(desfechos.map((p) => p.checkinEm).filter(Boolean));
  return momentos.filter(
    (m) =>
      dentro(m.em, f.dias, agora) &&
      (!f.emocoes?.length || f.emocoes.includes(m.id)) &&
      (f.diaSemana === undefined || new Date(m.em).getDay() === f.diaSemana) &&
      (!f.periodo || periodoDe(m.em) === f.periodo) &&
      (!f.depoisDas22 || new Date(m.em).getHours() >= 22) &&
      (!f.pausa || ehDaPausa(m) || daPausa.has(m.em)),
  );
}

// ─── Estado ─────────────────────────────────────────────────────────────────
const CHAVE_RESPOSTAS = 'consi:reflexoes:respostas';
let respostas: string[] | null = null;
const ouvintes = new Set<() => void>();

async function carregarRespostas() {
  if (respostas) return respostas;
  try {
    const v = JSON.parse((await lerEstado(CHAVE_RESPOSTAS)) ?? '[]');
    respostas = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    respostas = [];
  }
  return respostas;
}

/** Marca ou desmarca uma opção da Pergunta (fica no aparelho). */
export async function alternarResposta(opcao: string) {
  const atual = await carregarRespostas();
  respostas = atual.includes(opcao) ? atual.filter((x) => x !== opcao) : [...atual, opcao];
  ouvintes.forEach((o) => o());
  await gravarEstado(CHAVE_RESPOSTAS, JSON.stringify(respostas)).catch(() => {});
}

function useRespostas() {
  const [r, setR] = useState<string[] | null>(respostas);
  useEffect(() => {
    let vivo = true;
    const ler = () => carregarRespostas().then((x) => vivo && setR([...x]));
    ler();
    ouvintes.add(ler);
    return () => {
      vivo = false;
      ouvintes.delete(ler);
    };
  }, []);
  return r;
}

/** Os dados das reflexões (null enquanto carrega). */
export function useDadosReflexoes(): DadosReflexoes | null {
  const momentos = useMomentos();
  const desfechos = useDesfechos();
  const r = useRespostas();
  const [resistencias, setResistencias] = useState<ResistenciaGravada[] | null>(null);
  useEffect(() => {
    let vivo = true;
    listarResistencias(Date.now() - DIAS_DESFECHOS * DIA_MS)
      .catch(() => [])
      .then((l) => vivo && setResistencias(l));
    return () => {
      vivo = false;
    };
    // recarrega quando chega um desfecho novo (as escolhas da pausa entram juntas)
  }, [desfechos]);
  return useMemo(
    () => (desfechos && r && resistencias ? { momentos, desfechos, resistencias, respostas: r } : null),
    [momentos, desfechos, r, resistencias],
  );
}

/** As reflexões da Home (vazia enquanto carrega ou sem nada a mostrar). */
export function useReflexoes(): Reflexao[] {
  const d = useDadosReflexoes();
  return useMemo(() => (d ? calcularReflexoes(d) : []), [d]);
}
