/**
 * Momentos do Diário (Figma: seção "4 - Diário final", 760:7273).
 *
 * Um momento é um check-in de emoção com o que a pessoa quiser juntar: texto, trechos
 * destacados, marcadores, áudio e fotos. Os check-ins da Home e da Pausa também são
 * momentos (sem texto): tudo fica numa lista só, guardada no aparelho.
 * Ficam nas tabelas `momentos` e `anexos` do banco local criptografado (ver banco.ts).
 */
import { useSyncExternalStore } from 'react';

import { gravarEstado, lerEstado, lerMomentos, sincronizarMomentos } from './banco';
import { registrar } from './piloto';

export type Anexo =
  | { tipo: 'audio'; uri: string; /** segundos */ duracao: number }
  | { tipo: 'foto'; uri: string };

/** Trecho destacado do texto (índices de caractere, fim exclusivo). */
export type Destaque = { inicio: number; fim: number };

/**
 * 'hobby': nota ou emoção registradas ao finalizar uma atividade dos Hobbies.
 * 'widget': check-in feito pelo widget grande da tela inicial (consi://registrar).
 */
export type OrigemMomento = 'home' | 'pausa' | 'diario' | 'hobby' | 'widget';

export type Momento = {
  /** Id da emoção (ver data/emocoes.ts). */
  id: string;
  /** Instante do momento, em ms. Também é o identificador do momento. */
  em: number;
  texto?: string;
  destaques?: Destaque[];
  marcadores?: string[];
  anexos?: Anexo[];
  origem?: OrigemMomento;
  /** A pergunta ("prompt") da Página de hoje que a pessoa respondeu. */
  pergunta?: string;
  /** Última edição do texto. */
  editadoEm?: number;
};

export const MARCADOR_PAUSA = 'Depois de uma pausa';

/** Marcadores sugeridos na folha "+ marcador" (além dos que a pessoa já usou). */
export const MARCADORES_SUGERIDOS = ['Trabalho', 'Casa', 'Família', 'Amigos', 'Estudo', 'Ônibus', 'Antes de dormir', MARCADOR_PAUSA];

const CHAVE_SEMENTE = 'consi:diario:exemplos';

// ─── Armazenamento com aviso a quem estiver ouvindo ─────────────────────────
let lista: Momento[] = [];
let carregou = false;
let carregando: Promise<Momento[]> | null = null;
const ouvintes = new Set<() => void>();

const ordenar = (l: Momento[]) => [...l].sort((a, b) => b.em - a.em);

function avisar() {
  ouvintes.forEach((f) => f());
}

/** Grava em fila, na ordem das mudanças. */
let fila: Promise<unknown> = Promise.resolve();
function gravar(antes: Momento[], depois: Momento[]) {
  fila = fila.then(() => sincronizarMomentos(antes, depois)).catch(() => {
    // sem banco, os momentos valem só enquanto o app estiver aberto
  });
  return fila;
}

/** Lê os momentos salvos (uma vez). */
export function carregarMomentos(): Promise<Momento[]> {
  if (carregou) return Promise.resolve(lista);
  if (!carregando) {
    carregando = (async () => {
      let salvos: Momento[] = [];
      try {
        salvos = await lerMomentos();
      } catch {
        salvos = [];
      }
      // Versões antigas gravavam momentos de exemplo na primeira abertura: tira-os uma vez.
      let limpar = false;
      try {
        limpar = (await lerEstado(CHAVE_SEMENTE)) === '1';
      } catch {
        limpar = false;
      }
      const lidos = salvos;
      if (limpar) {
        salvos = salvos.filter((m) => !ehExemplo(m));
        try {
          await gravarEstado(CHAVE_SEMENTE, 'removidos');
        } catch {
          // tenta de novo na próxima abertura
        }
      }
      lista = ordenar(salvos);
      carregou = true;
      if (limpar) await gravar(lidos, lista);
      avisar();
      return lista;
    })();
  }
  return carregando;
}

async function mudar(f: (l: Momento[]) => Momento[]) {
  await carregarMomentos();
  const antes = lista;
  lista = ordenar(f(lista));
  avisar();
  await gravar(antes, lista);
  return lista;
}

/** Todos os momentos, do mais recente para o mais antigo. Atualiza sozinho. */
export function useMomentos(): Momento[] {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      if (!carregou) carregarMomentos();
      return () => ouvintes.delete(f);
    },
    () => lista,
    () => lista,
  );
}

export const momentoPorEm = (em?: number | string | null) => {
  const n = Number(em);
  return lista.find((m) => m.em === n);
};

export async function adicionarMomento(m: Omit<Momento, 'em'> & { em?: number }): Promise<Momento> {
  await carregarMomentos();
  // o instante é o identificador: dois momentos no mesmo milissegundo ganham +1
  let em = m.em ?? Date.now();
  while (lista.some((x) => x.em === em)) em += 1;
  const novo: Momento = { ...m, em };
  registrar('momento_criado', { origem: m.origem ?? 'diario', escrito: !!m.texto?.trim() });
  await mudar((l) => [novo, ...l]);
  return novo;
}

/** Quando o horário de um momento muda, o instante antigo aponta para o novo. */
const renomes = new Map<number, number>();

/** O instante atual de um momento que pode ter mudado de horário (telas abertas pelo antigo). */
export function emAtual(em: number) {
  let atual = em;
  for (let i = 0; i < 20 && renomes.has(atual); i++) atual = renomes.get(atual)!;
  return atual;
}

/** Junta `mudancas` no momento `em`. Trocar `em` (outro horário) também é permitido. */
export const atualizarMomento = (em: number, mudancas: Partial<Momento>) => {
  if (mudancas.em && mudancas.em !== em) {
    renomes.set(em, mudancas.em);
    renomes.delete(mudancas.em);
  }
  return mudar((l) => l.map((m) => (m.em === em ? { ...m, ...mudancas } : m)));
};

export const apagarMomento = (em: number) => mudar((l) => l.filter((m) => m.em !== em));

/** Devolve um momento apagado (o "Desfazer"). */
export const restaurarMomento = (m: Momento) => {
  // voltou com o instante antigo: ele deixa de apontar para outro
  renomes.delete(m.em);
  return mudar((l) => [...l.filter((x) => x.em !== m.em), m]);
};

// ─── Datas ──────────────────────────────────────────────────────────────────
export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "2026-11-18" — identifica um dia no fuso do aparelho. */
export function chaveDia(d: Date | number) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function dataDaChave(chave: string) {
  const [a, m, d] = chave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export const mesmoDiaQue = (a: Date | number, b: Date | number) => chaveDia(a) === chaveDia(b);

/** "Quarta, 18" */
export const diaCurto = (d: Date) => `${maiuscula(DIAS_SEMANA[d.getDay()])}, ${d.getDate()}`;
/** "Quarta, 18 de novembro" */
export const diaLongo = (d: Date) => `${diaCurto(d)} de ${MESES[d.getMonth()]}`;
export const nomeMes = (mes: number) => maiuscula(MESES[mes]);

export function hora(em: number) {
  const d = new Date(em);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Diferença em dias de calendário entre `d` e hoje (0 = hoje, 1 = ontem…). */
export function diasAtras(d: Date | number, agora = new Date()) {
  const a = new Date(agora);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** "hoje, 16:40" · "ontem, 09:10" · "12 nov, 21:00" */
export function quando(em: number) {
  const n = diasAtras(em);
  const d = new Date(em);
  const dia = n === 0 ? 'hoje' : n === 1 ? 'ontem' : `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
  return `${dia}, ${hora(em)}`;
}

/** "editado agora" · "editado há 5 min" · "editado às 14:02" · "editado em 12 nov" */
export function editado(em?: number) {
  if (!em) return 'sem edições';
  const min = Math.floor((Date.now() - em) / 60000);
  if (min < 1) return 'editado agora';
  if (min < 60) return `editado há ${min} min`;
  if (diasAtras(em) === 0) return `editado às ${hora(em)}`;
  const d = new Date(em);
  return `editado em ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

/** Quantas emoções um dia mostra na linha do tempo e no dia aberto (a central + 4 em volta). */
export const EMOCOES_POR_DIA = 5;

/**
 * As emoções de um dia, sem repetir, na ordem em que aparecem nos aglomerados:
 * 1ª (a central) = a mais repetida; se nenhuma se repete (ou há empate), a mais recente.
 * Depois as outras, das mais repetidas para as menos, e no empate as mais recentes.
 * `momentos` vem do mais recente para o mais antigo (como useMomentos).
 */
export function emocoesDoDia(momentos: Momento[], limite = EMOCOES_POR_DIA) {
  const conta = new Map<string, number>();
  const recencia = new Map<string, number>();
  momentos.forEach((m, i) => {
    conta.set(m.id, (conta.get(m.id) ?? 0) + 1);
    if (!recencia.has(m.id)) recencia.set(m.id, i);
  });
  return [...conta.keys()]
    .sort((a, b) => conta.get(b)! - conta.get(a)! || recencia.get(a)! - recencia.get(b)!)
    .slice(0, limite);
}

/** A emoção que mais aparece no dia (empate: a mais recente). */
export function maisSentida(momentos: Momento[]) {
  return emocoesDoDia(momentos, 1)[0] ?? null;
}

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export const temAudio = (m: Momento) => !!m.anexos?.some((a) => a.tipo === 'audio');
export const temFoto = (m: Momento) => !!m.anexos?.some((a) => a.tipo === 'foto');

/** "1 áudio · 2 fotos" (vazio sem anexos). */
export function resumoAnexos(anexos: Anexo[] = []) {
  const a = anexos.filter((x) => x.tipo === 'audio').length;
  const f = anexos.filter((x) => x.tipo === 'foto').length;
  return [a ? plural(a, 'áudio', 'áudios') : '', f ? plural(f, 'foto', 'fotos') : ''].filter(Boolean).join(' · ');
}

// ─── Busca ──────────────────────────────────────────────────────────────────
/** Sem acento e em minúsculas, para a busca achar "onibus" em "ônibus". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Onde o termo aparece no texto (índices no texto original). */
export function acharTermo(texto: string, termo: string) {
  const i = normalizar(texto).indexOf(normalizar(termo));
  return i < 0 ? null : { inicio: i, fim: i + termo.length };
}

// ─── Perguntas ──────────────────────────────────────────────────────────────
/**
 * Perguntas da "Página de hoje" (a do Figma primeiro). O botão de setas troca a pergunta; o
 * lembrete diário (lembreteDiario.ts) usa a mesma lista. Agrupadas por tema só para facilitar a
 * leitura: celular e atenção, corpo e presença, emoções, pessoas, gratidão e o dia em si.
 */
export const PERGUNTAS_DO_DIA = [
  'O que você queria fazer quando pegou o celular pela primeira vez hoje?',
  'Qual foi o momento mais calmo do seu dia até agora?',
  'Teve alguma hora em que você abriu um app sem perceber? O que estava sentindo?',
  'O que você fez hoje que não envolveu uma tela?',
  'Quem você gostaria de ter encontrado hoje, mesmo que por pouco tempo?',
  'O que te deixou inquieto hoje? E o que te acalmou?',
  'Se hoje tivesse um título, qual seria?',
  // celular e atenção
  'Qual app mais chamou sua atenção hoje? O que você estava procurando nele?',
  'Teve um momento hoje em que largar o celular foi bom? Como foi?',
  'O que você estaria fazendo agora se o celular não existisse?',
  'Em que momento do dia você mais sentiu vontade de rolar a tela sem pensar?',
  'O que você viu hoje numa tela que ficou na sua cabeça?',
  'Qual notificação você poderia ter ignorado hoje sem perder nada?',
  'Quando foi a última vez hoje que você ficou sem fazer nada, só olhando em volta?',
  'O que te fez pegar o celular da última vez? Era o que você precisava?',
  // corpo e presença
  'Como está o seu corpo agora? Onde você sente mais tensão?',
  'O que você ouviu hoje que não veio de um fone ou de uma tela?',
  'Qual foi a última coisa que você comeu com calma, prestando atenção?',
  'Você saiu de casa hoje? O que reparou no caminho?',
  'Como você dormiu? O que gostaria de fazer diferente esta noite?',
  'Que cheiro, som ou cor marcou o seu dia?',
  'Quanto tempo você passou ao ar livre hoje? Como se sentiu?',
  'Respire fundo três vezes. O que mudou?',
  // emoções
  'Que emoção apareceu mais vezes hoje? Quando ela chegou?',
  'Teve algo hoje que te irritou mais do que deveria? Por quê?',
  'O que você está evitando sentir hoje?',
  'Qual foi o momento em que você se sentiu mais você mesmo hoje?',
  'Se o seu humor de hoje fosse um clima, qual seria?',
  'O que te deu orgulho hoje, mesmo que seja pequeno?',
  'Do que você sentiu saudade hoje?',
  'Teve algo hoje que te deu medo? O que ajudaria a enfrentar?',
  'O que você diria para alguém que estivesse sentindo o mesmo que você agora?',
  'Qual pensamento se repetiu na sua cabeça hoje?',
  // pessoas
  'Com quem você conversou de verdade hoje, olhando nos olhos?',
  'Quem te fez rir hoje?',
  'Tem alguém a quem você gostaria de mandar uma mensagem de carinho? O que diria?',
  'Qual conversa de hoje você gostaria de ter tido de outro jeito?',
  'Quem você admirou hoje, de perto ou de longe?',
  'Alguém precisou de você hoje? Como você se sentiu ajudando?',
  // gratidão e coisas boas
  'Escreva três coisas pequenas que foram boas hoje.',
  'O que você aprendeu hoje, mesmo sem querer?',
  'Qual foi a melhor parte do seu dia até agora?',
  'Pelo que você é grato hoje?',
  'O que te deu energia hoje? E o que tirou?',
  'Que gentileza você recebeu ou fez hoje?',
  // o dia e o que vem
  'O que você quer deixar para amanhã sem culpa?',
  'Se você pudesse repetir uma hora de hoje, qual seria?',
  'O que ficou por fazer hoje? Precisa mesmo ser feito?',
  'O que você espera de amanhã?',
  'Qual pequena mudança deixaria seus dias mais leves?',
  'Do que você precisa agora, neste momento?',
  'O que você fez hoje só por você?',
  'Se você contasse o dia de hoje para uma criança, o que diria?',
  'Que hobby ou atividade você gostaria de ter feito hoje? O que impediu?',
  'Termine a frase: hoje eu percebi que…',
];

/** O texto de apoio do campo, por emoção ("O que trouxe essa alegria?"). */
export const PERGUNTA_DA_EMOCAO: Record<string, string> = {
  satisfeito: 'O que te deixou satisfeito?',
  alegria: 'O que trouxe essa alegria?',
  tristeza: 'O que está pesando agora?',
  vergonha: 'O que aconteceu? Pode escrever sem pressa.',
  orgulho: 'Do que você se orgulhou?',
  admiracao: 'O que ou quem você admirou?',
  medo: 'Do que você está com medo?',
  repulsa: 'O que te causou repulsa?',
  tedio: 'Onde você estava quando bateu o tédio?',
  fascinacao: 'O que te fascinou?',
  raiva: 'O que te deixou com raiva?',
  desprezo: 'O que despertou esse desprezo?',
  esperanca: 'O que te dá esperança agora?',
  desejo: 'O que você está desejando?',
};

// ─── Exemplos antigos (só para removê-los) ──────────────────────────────────
/**
 * Os momentos de exemplo que as versões do protótipo gravavam: [emoção, hora, minuto, texto].
 * Um momento salvo com a mesma emoção, horário exato e texto, nunca editado, é um desses exemplos.
 */
const EXEMPLOS_ANTIGOS: [string, number, number, string?][] = [
  ['esperanca', 8, 20, 'Acordei e não olhei o celular primeiro. Fiz café com calma.'],
  ['tedio', 13, 5, 'Fila do restaurante. Abri o celular três vezes sem motivo nenhum.'],
  ['tristeza', 9, 40, 'Manhã pesada. Foi bom conseguir colocar em palavras o que estava me incomodando.'],
  ['satisfeito', 22, 10, 'Li vinte páginas antes de dormir, sem conferir mensagens.'],
  ['satisfeito', 12, 30, 'Almoço sem celular. O que fez a tarde render tanto? Acho que foi a pausa no meio do dia.'],
  ['esperanca', 18, 15],
  ['medo', 7, 50, 'Reunião importante amanhã. To tentando dar um nome pra isso que estou sentindo.'],
  ['alegria', 16, 40, 'Queria só ver a hora. Acabei lendo notícias e o ônibus já tinha passado do meu ponto. Pelo menos ri da situação.'],
  ['tedio', 20, 0],
  ['orgulho', 11, 20, 'Terminei o relatório que vinha adiando há duas semanas.'],
  ['admiracao', 19, 45, 'Minha irmã tocou violão no jantar. Fazia tempo que eu não prestava atenção nela assim.'],
  ['tristeza', 8, 5, 'Perdi o ônibus de novo olhando o celular na parada.'],
  ['raiva', 21, 30, 'Discussão boba no grupo da família. Saí do app antes de responder no impulso.'],
  ['fascinacao', 7, 55, 'No ônibus deixei o celular no bolso e reparei na cidade. Tinha um ipê florido que eu nunca tinha visto.'],
  ['satisfeito', 15, 10, 'Tarde de estudo sem notificações. Rendeu.'],
  ['vergonha', 23, 0, 'Fiquei rolando a tela até tarde de novo.'],
];
const chaveExemplo = (id: string, h: number, min: number, texto?: string) => `${id}|${h}:${min}|${texto ?? ''}`;
const assinaturas = new Set(EXEMPLOS_ANTIGOS.map(([id, h, min, t]) => chaveExemplo(id, h, min, t)));

function ehExemplo(m: Momento) {
  const d = new Date(m.em);
  if (d.getSeconds() !== 0 || d.getMilliseconds() !== 0 || m.editadoEm || m.anexos?.length) return false;
  return assinaturas.has(chaveExemplo(m.id, d.getHours(), d.getMinutes(), m.texto));
}
