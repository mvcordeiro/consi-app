/**
 * Grupos de apps da Home ("Aplicativos e hobbies"). Cada grupo tem um nome, um ícone, os apps
 * dele (um app fica em um grupo só) e uma regra:
 * - Não interromper: o app abre liberado, sem pausa.
 * - Apenas pausar: antes de abrir, uma pausa de X segundos com uma mensagem; depois a pessoa
 *   escolhe quanto tempo vai passar no app (1–30 min).
 * - Cuidar tempo: abre sem pausa, mas notifica a cada X minutos; ignorar a notificação ou só
 *   reinicia o timer, ou leva para a mesma pausa do "Apenas pausar".
 * O grupo "Livre" é fixo (pode ser editado, não apagado) e reúne os apps sem grupo.
 * Os apps "acompanhados" são os que a pessoa escolheu (no onboarding ou ao montar um grupo);
 * os outros apps do aparelho ficam de fora e nunca são pausados. No APK Android, o vigia
 * nativo aplica as regras (ver vigia.ts).
 */
import { useSyncExternalStore } from 'react';

import type { TomEtiqueta } from '@/components/Etiqueta';
import { IconeNotificacao, IconeRelogio, RostoPositivo16 } from '@/components/home/assets';
import type { NomeIcone } from '@/components/Icone';
import type { IconeSvg } from '@/components/onboarding/assets';

import { APPS_EXEMPLO, appsAgora, carregarApps, comAppsDoAparelho, pacoteDoExemplo } from './apps';
import { gravarEstado, lerEstado } from './banco';
import type { PeriodoFilosofico } from './frases';
import { respostasSalvas, type CaixaDeApp } from './onboarding';
import { registrar } from './piloto';

// ─── Catálogo ───────────────────────────────────────────────────────────────
// Os apps vêm de ./apps (do aparelho no APK Android; de exemplo no navegador).
export { appPorId, type AppInfo } from './apps';

export type Modo = 'nao-interromper' | 'apenas-pausar' | 'cuidar-tempo';

export const MODOS: Record<Modo, { nome: string; descricao: string; tom: TomEtiqueta; icone: IconeSvg }> = {
  'nao-interromper': {
    nome: 'Não interromper',
    descricao: 'Os apps abrem liberados, sem pausa.',
    tom: 'sucesso',
    icone: RostoPositivo16,
  },
  'apenas-pausar': {
    nome: 'Apenas pausar',
    descricao: 'Uma pausa antes de abrir. Depois você escolhe quanto tempo vai passar no app.',
    tom: 'info',
    icone: IconeRelogio,
  },
  'cuidar-tempo': {
    nome: 'Cuidar tempo',
    descricao: 'Abre sem pausa, mas você recebe um lembrete de tempos em tempos.',
    tom: 'aviso',
    icone: IconeNotificacao,
  },
};
export const ORDEM_MODOS: Modo[] = ['nao-interromper', 'apenas-pausar', 'cuidar-tempo'];

/** Segundos de espera da pausa. */
export const PAUSAS = [3, 5, 10, 15, 30];
/** Minutos entre os lembretes do "Cuidar tempo". */
export const INTERVALOS = [5, 10, 15, 20, 30, 45, 60];
/** O que a pessoa escolhe depois da pausa (mostrado como prévia no editor). */
export const TEMPOS_NO_APP = [1, 3, 5, 10, 15, 30];

export type AoIgnorar = 'resetar' | 'pausa';

/** Estilos do timer flutuante (desenhados em modules/consi-pausa/.../Bolha.kt). */
export type EstiloTimer = 'pilula' | 'faixa' | 'bolha';
export const ESTILOS_TIMER: { id: EstiloTimer; nome: string }[] = [
  { id: 'pilula', nome: 'Pílula' },
  { id: 'faixa', nome: 'Faixa' },
  { id: 'bolha', nome: 'Bolha' },
];

export const MENSAGENS_PRONTAS = [
  'Você queria mesmo abrir agora?',
  'Respira. O que você veio fazer aqui?',
  'Isso é o que você precisa neste momento?',
  'Que tal checar como você está antes?',
];

/** Ícones que dá para escolher para um grupo. */
export const ICONES_GRUPO: NomeIcone[] = [
  'filtrar-musicas',
  'rolo-filme',
  'hobby-leitura',
  'hobby-escrita',
  'hobby-jogos',
  'hobby-atividade',
  'camera',
  'conversa',
  'rede-mundial',
  'calendario',
  'lampada',
  'gato',
];

export type Grupo = {
  id: string;
  nome: string;
  icone: NomeIcone;
  modo: Modo;
  pausaSegundos: number;
  mensagem: string;
  /** Só no "Cuidar tempo". */
  intervaloMin: number;
  aoIgnorar: AoIgnorar;
  /** Ids dos apps; no "Livre" é calculado (os apps sem grupo). */
  apps: string[];
  /** Escondido da Home pela engrenagem. */
  oculto?: boolean;
  /** Timer flutuante por cima do app (padrão: ligado). Desligado, o tempo fica na notificação. */
  timerFlutuante?: boolean;
  /** Estilo do timer flutuante (padrão: pílula, a do Figma). */
  estiloTimer?: EstiloTimer;
  /** No lugar da `mensagem`, uma frase filosófica sorteada a cada pausa (ver frases.ts). */
  mensagemFilosofica?: boolean;
  /** Com as frases filosóficas: de que período elas vêm (sem valor: de todos). */
  periodoFilosofico?: PeriodoFilosofico | null;
};

/** Pausa personalizada: no mínimo 3 s (o menor dos prontos), no máximo 5 min. */
export const PAUSA_MINIMA = 3;
export const PAUSA_MAXIMA = 300;

/** Ícones para escolher no grupo, por assunto (abas da folha "Ícone do grupo"). */
export const CATEGORIAS_ICONES: { nome: string; icones: NomeIcone[] }[] = [
  {
    nome: 'Lazer',
    icones: [
      'hobby-jogos', 'hobby-atividade', 'xadrez', 'rpg', 'pacman', 'dado-peao', 'quebra-cabeca', 'naipes', 'cubo',
      'balao-festa', 'cartola', 'palhaco', 'teatro', 'piscina', 'pedestre', 'bagagem', 'aviao-papel', 'mapa',
      'binoculos', 'gesto-comemoracao',
    ],
  },
  {
    nome: 'Música e vídeo',
    icones: [
      'filtrar-musicas', 'toca-discos', 'contrabaixo', 'microfone', 'karaoke', 'discoteca', 'dj', 'podcast',
      'audiolivro', 'rolo-filme', 'claquete', 'tv-retro', 'camera', 'camera-instantanea',
    ],
  },
  {
    nome: 'Leitura e escrita',
    icones: [
      'hobby-leitura', 'livro-marcador', 'caderno', 'hobby-escrita', 'pena-escrita', 'maquina-escrever',
      'texto-quadrado', 'tamanho-fonte', 'aspas', 'traducao', 'lingua-sinais',
    ],
  },
  {
    nome: 'Trabalho e estudo',
    icones: [
      'calendario', 'lista-tarefas', 'lista-numerada', 'lista-marcadores', 'programacao', 'teclado', 'arduino',
      'mesa-digitalizadora', 'rede-mundial', 'conversa', 'cronometro', 'relogio', 'lampada', 'martelo',
      'engrenagem', 'cadeado',
    ],
  },
  {
    nome: 'Arte',
    icones: ['pincel', 'pena-desenho', 'caneta-vetor', 'spray', 'tesoura', 'blocos', 'inserir-imagem'],
  },
  {
    nome: 'Bem-estar',
    icones: [
      'rosto-positivo', 'rosto-abencoado', 'rosto-gargalhando', 'rosto-olhos-brilhantes', 'rosto-mal-humorado',
      'rosto-chorando-arco-iris', 'beijo-coracao', 'mao-doacao', 'muda-planta', 'gato', 'olho', 'bateria', 'repetir',
    ],
  },
];

export const ID_LIVRE = 'livre';

/** Valores de um grupo novo. */
export const grupoNovo = (): Grupo => ({
  id: `g${Date.now().toString(36)}`,
  nome: '',
  icone: 'lampada',
  modo: 'nao-interromper',
  pausaSegundos: 5,
  mensagem: MENSAGENS_PRONTAS[0],
  intervaloMin: 15,
  aoIgnorar: 'resetar',
  apps: [],
});

const livre: Grupo = { ...grupoNovo(), id: ID_LIVRE, nome: 'Livre', icone: 'repetir', modo: 'apenas-pausar' };

/** Começa só com o "Livre": os outros grupos são criados pela pessoa. */
const iniciais: Grupo[] = [livre];
/** Ids dos grupos de exemplo que as versões antigas gravavam (grupos novos usam `g…`). */
const IDS_EXEMPLO = new Set(['musica', 'leitura', 'cinema']);

// ─── Armazenamento (um store simples, compartilhado entre a Home e as telas de grupo) ──
const CHAVE = 'consi:home:grupos:v2';
const CHAVE_ACOMPANHADOS = 'consi:home:apps-acompanhados:v1';
let estado: Grupo[] = iniciais;
/** Ids dos apps acompanhados. No navegador, os de exemplo; no Android, os escolhidos pela pessoa. */
let acompanhados: string[] = comAppsDoAparelho ? [] : APPS_EXEMPLO.map((a) => a.id);
let carregado = false;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((f) => f());
}

function carregar() {
  if (carregado) return;
  carregado = true;
  Promise.all([lerEstado(CHAVE), lerEstado(CHAVE_ACOMPANHADOS), respostasSalvas(), carregarApps()])
    .then(([bruto, brutoAcompanhados, respostas]) => {
      if (brutoAcompanhados) acompanhados = JSON.parse(brutoAcompanhados) as string[];
      else if (comAppsDoAparelho) acompanhados = appsQueIncomodam(respostas.apps);
      if (bruto) {
        const lido = (JSON.parse(bruto) as Grupo[]).filter((g) => !IDS_EXEMPLO.has(g.id));
        // O "Livre" sempre existe e vem primeiro.
        estado = [{ ...livre, ...lido.find((g) => g.id === ID_LIVRE) }, ...lido.filter((g) => g.id !== ID_LIVRE)];
      }
      if (comAppsDoAparelho) migrarExemplos();
      estado = [...estado];
      avisar();
    })
    .catch(() => {});
}

/**
 * Versões antigas do APK gravavam os apps de exemplo ("instagram"…). Com a lista real, eles
 * viram o pacote instalado (com.instagram.android) ou saem, se o app não estiver no celular.
 */
function migrarExemplos() {
  const instalados = new Set(appsAgora().map((a) => a.id));
  if (!instalados.size) return;
  const exemplos = new Set(APPS_EXEMPLO.map((a) => a.id));
  const temExemplo = (ids: string[]) => ids.some((id) => exemplos.has(id));
  if (!estado.some((g) => temExemplo(g.apps)) && !temExemplo(acompanhados)) return;
  const trocar = (ids: string[]) => [
    ...new Set(ids.map((id) => (exemplos.has(id) ? pacoteDoExemplo(id, instalados) : id)).filter((id) => !exemplos.has(id))),
  ];
  estado = estado.map((g) => ({ ...g, apps: trocar(g.apps) }));
  gravarEstado(CHAVE, JSON.stringify(estado)).catch(() => {});
  gravarAcompanhados(trocar(acompanhados));
}

function gravar(novo: Grupo[]) {
  // Um app posto num grupo passa a ser acompanhado.
  const novos = novo.flatMap((g) => g.apps).filter((id) => !acompanhados.includes(id));
  if (novos.length) gravarAcompanhados([...acompanhados, ...novos]);
  estado = novo;
  avisar();
  gravarEstado(CHAVE, JSON.stringify(novo)).catch(() => {});
}

function gravarAcompanhados(ids: string[]) {
  acompanhados = ids;
  gravarEstado(CHAVE_ACOMPANHADOS, JSON.stringify(ids)).catch(() => {});
}

/** Do onboarding: os apps nas caixas "Me perco no tempo" e "Abro no automático". */
export const appsQueIncomodam = (classificacao: Record<string, CaixaDeApp>) =>
  Object.entries(classificacao)
    .filter(([, caixa]) => caixa !== 'nao-incomoda')
    .map(([id]) => id);

/**
 * Fim do "Quais apps mais te incomodam?": os apps que incomodam passam a ser acompanhados
 * (entram no "Livre", que pausa). Os que "não incomodam" ficam de fora.
 */
export function definirAcompanhados(ids: string[]) {
  gravarAcompanhados([...new Set(ids)]);
  estado = [...estado];
  avisar();
}

/** Os ids dos apps acompanhados (em algum grupo ou no Livre). */
export const appsAcompanhados = () => acompanhados;

function assinar(f: () => void) {
  carregar();
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Os grupos com os apps do "Livre" calculados (os que não estão em nenhum outro grupo). */
function comLivre(lista: Grupo[]): Grupo[] {
  const usados = new Set(lista.filter((g) => g.id !== ID_LIVRE).flatMap((g) => g.apps));
  const soltos = acompanhados.filter((id) => !usados.has(id));
  return lista.map((g) => (g.id === ID_LIVRE ? { ...g, apps: soltos } : g));
}

let cache: { de: Grupo[]; valor: Grupo[] } | null = null;
function retrato() {
  if (cache?.de !== estado) cache = { de: estado, valor: comLivre(estado) };
  return cache.valor;
}

export function useGrupos() {
  return useSyncExternalStore(assinar, retrato, retrato);
}

export const grupoPorId = (id?: string) => retrato().find((g) => g.id === id);

/** Em que grupo (fora o Livre) o app está. */
export const grupoDoApp = (appId: string, ignorar?: string) =>
  retrato().find((g) => g.id !== ID_LIVRE && g.id !== ignorar && g.apps.includes(appId));

/**
 * Salva (cria ou atualiza) um grupo. Os apps escolhidos saem dos outros grupos:
 * um app fica em um grupo só. No "Livre", os apps não são gravados (são calculados).
 */
export function salvarGrupo(g: Grupo) {
  const apps = g.id === ID_LIVRE ? [] : g.apps;
  const outros = estado
    .filter((x) => x.id !== g.id)
    .map((x) => ({ ...x, apps: x.apps.filter((a) => !apps.includes(a)) }));
  const existe = estado.some((x) => x.id === g.id);
  registrar('grupo_salvo', { novo: !existe });
  const salvo = { ...g, apps };
  gravar(existe ? estado.map((x) => (x.id === g.id ? salvo : outros.find((o) => o.id === x.id)!)) : [...outros, salvo]);
}

/** Desfaz o agrupamento: o grupo some e os apps dele voltam para o Livre. */
export function apagarGrupo(id: string) {
  if (id === ID_LIVRE) return;
  gravar(estado.filter((g) => g.id !== id));
}

/** Engrenagem da seção: quais grupos aparecem na Home. */
export function definirOcultos(ids: string[]) {
  gravar(estado.map((g) => ({ ...g, oculto: ids.includes(g.id) })));
}

/** O rótulo da etiqueta do card: a regra do grupo. */
export function limiteDoGrupo(g: Grupo) {
  const m = MODOS[g.modo];
  return { rotulo: m.nome, icone: m.icone, tom: m.tom };
}

// ─── Layout da grade ────────────────────────────────────────────────────────
/** Uma linha da grade: um card inteiro (1fr) ou dois meios (0.5fr cada). */
export type LinhaGrade = { tipo: 'inteiro'; grupo: Grupo } | { tipo: 'metades'; grupos: [Grupo, Grupo] };

/**
 * Distribui os grupos em linhas:
 * - 1 ou 2 grupos: uma coluna só, cada grupo numa linha inteira (1fr);
 * - número par (4, 6…): pares de meios (0.5fr);
 * - número ímpar (3, 5…): o "Livre" ocupa a primeira linha inteira e o resto vai em pares.
 */
export function linhasDaGrade(grupos: Grupo[]): LinhaGrade[] {
  if (grupos.length <= 2) return grupos.map((grupo) => ({ tipo: 'inteiro', grupo }));
  const linhas: LinhaGrade[] = [];
  let resto = grupos;
  if (grupos.length % 2 === 1) {
    linhas.push({ tipo: 'inteiro', grupo: grupos[0] });
    resto = grupos.slice(1);
  }
  for (let i = 0; i < resto.length; i += 2) linhas.push({ tipo: 'metades', grupos: [resto[i], resto[i + 1]] });
  return linhas;
}
