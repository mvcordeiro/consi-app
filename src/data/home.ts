/**
 * Dados de exemplo da Home, copiados do Figma (seção // HOME).
 * Fixos até existir registro real de uso, check-ins e grupos.
 */
import type { ImageSourcePropType } from 'react-native';

import type { TomEtiqueta } from '@/components/Etiqueta';
import {
  HobbyCinema,
  HobbyLeitura,
  HobbyMusica,
  IconeCheckin,
  IconeNotificacao,
  IconeRelogio,
  IconeRepetir,
  MarcadorManha08,
  MarcadorManha09,
  MarcadorManha11,
  MarcadorNoite20,
  MarcadorNoite21,
  MarcadorNoite22,
  RostoCorado,
  RostoPositivo16,
  iconesApps,
} from '@/components/home/assets';
import type { IconeSvg } from '@/components/onboarding/assets';

// ─── Reflexões ──────────────────────────────────────────────────────────────
export type TipoMarcador = 'alerta' | 'sucesso';

/** Um horário do gráfico "Noite anterior / Manhã seguinte". */
export type LinhaGrafico = {
  hora: string;
  marcador: {
    icone: IconeSvg;
    tipo: TipoMarcador;
    /** Posição horizontal na trilha: fração (0–1) do centro do ícone, como no Figma. */
    centro: number;
  };
};

export type Insight = {
  id: string;
  titulo: string;
  explicacao: string;
  noite: LinhaGrafico[];
  manha: LinhaGrafico[];
};

const explicacaoSono =
  'Nos seus registros, noites em que o celular segue ativo até tarde costumam vir acompanhadas de check-ins de cansaço na manhã seguinte.';

const noite: LinhaGrafico[] = [
  { hora: '20:00', marcador: { icone: MarcadorNoite20, tipo: 'alerta', centro: 0.5 } },
  { hora: '21:00', marcador: { icone: MarcadorNoite21, tipo: 'sucesso', centro: 1 / 6 } },
  { hora: '22:00', marcador: { icone: MarcadorNoite22, tipo: 'alerta', centro: 0.1 } },
];

const manha: LinhaGrafico[] = [
  { hora: '08:00', marcador: { icone: MarcadorManha08, tipo: 'alerta', centro: 0.25 } },
  { hora: '09:00', marcador: { icone: MarcadorManha09, tipo: 'alerta', centro: 0.33 } },
  { hora: '11:00', marcador: { icone: MarcadorManha11, tipo: 'alerta', centro: 0.16 } },
];

/** Na ordem do carrossel; o do meio é o que aparece primeiro, como no Figma. */
export const insights: Insight[] = [
  { id: 'descanso', titulo: 'Seu descanso faz diferença na energia do dia.', explicacao: explicacaoSono, noite, manha },
  { id: 'cansaco', titulo: 'Você fica cansada após noites com uso prolongado.', explicacao: explicacaoSono, noite, manha },
  { id: 'conexao', titulo: 'Momentos de conexão acompanham dias mais leves.', explicacao: explicacaoSono, noite, manha },
];
export const INSIGHT_INICIAL = 1;

// ─── Isso faz sentido para você? ────────────────────────────────────────────
export type Padrao = { id: string; titulo: string; descricao: string };

const descricaoSono = 'Quando o celular segue ativo até tarde, a manhã seguinte costuma vir com cansaço.';

/** Só o primeiro padrão está no Figma; os outros dois são provisórios (decisão de 18/11/2026). */
export const padroes: Padrao[] = [
  { id: 'cansaco', titulo: 'Você fica cansada após noites com uso prolongado.', descricao: descricaoSono },
  { id: 'descanso', titulo: 'Seu descanso faz diferença na energia do dia.', descricao: descricaoSono },
  { id: 'conexao', titulo: 'Momentos de conexão acompanham dias mais leves.', descricao: descricaoSono },
];

// ─── Conteúdos ──────────────────────────────────────────────────────────────
export type Conteudo = { id: string; titulo: string; minutos: number };
export type SecaoConteudo = { id: string; titulo: string; conteudos: Conteudo[] };

export const secoesConteudo: SecaoConteudo[] = [
  {
    id: 'sono',
    titulo: 'Sono e energia',
    conteudos: [
      { id: 'noite-conectada', titulo: 'Por que uma noite conectada pode pesar na manhã seguinte?', minutos: 5 },
      { id: 'descanso-energia', titulo: 'Como o descanso influencia sua energia ao longo do dia', minutos: 4 },
    ],
  },
  {
    id: 'uso',
    titulo: 'Uso consciente',
    conteudos: [
      { id: 'sem-perceber', titulo: 'O que acontece quando você pega o celular sem perceber?', minutos: 5 },
      { id: 'pausas', titulo: 'Pequenas pausas ajudam você a recuperar o foco', minutos: 3 },
    ],
  },
];

// ─── Aplicativos e hobbies ──────────────────────────────────────────────────
export type AppDoGrupo = {
  imagem: ImageSourcePropType;
  /** Tamanho do ícone dentro do quadrado de 32 px. */
  tamanho: number;
  /** Fundo atrás do ícone: escuro (bg/sunken) ou claro. */
  fundo: 'escuro' | 'claro';
};

export type Grupo = {
  id: string;
  nome: string;
  icone: IconeSvg;
  tom: Exclude<TomEtiqueta, 'neutro' | 'erro'>;
  apps: AppDoGrupo[];
  /** Espaço entre os ícones dos apps (Leitura usa 6 no Figma). */
  espacoApps?: number;
  limite: { rotulo: string; icone: IconeSvg };
};

export const grupos: Grupo[] = [
  {
    id: 'musica',
    nome: 'Música',
    icone: HobbyMusica,
    tom: 'sucesso',
    apps: [
      { imagem: iconesApps.musica1, tamanho: 32, fundo: 'escuro' },
      { imagem: iconesApps.musica2, tamanho: 16, fundo: 'escuro' },
    ],
    limite: { rotulo: 'Não interromper', icone: RostoPositivo16 },
  },
  {
    id: 'leitura',
    nome: 'Leitura',
    icone: HobbyLeitura,
    tom: 'info',
    apps: [
      { imagem: iconesApps.leitura1, tamanho: 32, fundo: 'claro' },
      { imagem: iconesApps.leitura2, tamanho: 22, fundo: 'claro' },
    ],
    espacoApps: 6,
    limite: { rotulo: 'Apenas pausar', icone: RostoPositivo16 },
  },
  {
    id: 'cinema',
    nome: 'Cinema',
    icone: HobbyCinema,
    tom: 'aviso',
    apps: [
      { imagem: iconesApps.cinema1, tamanho: 32, fundo: 'claro' },
      { imagem: iconesApps.cinema2, tamanho: 32, fundo: 'claro' },
      { imagem: iconesApps.cinema3, tamanho: 32, fundo: 'claro' },
    ],
    limite: { rotulo: 'Cuidar tempo', icone: IconeNotificacao },
  },
];

// ─── Sua semana ─────────────────────────────────────────────────────────────
export type ParteMomento = string | { rotulo: string; tom: TomEtiqueta; icone: IconeSvg };
export type Momento = { id: string; partes: ParteMomento[] };
export type DiaDaSemana = { id: string; semana: string; dia: number; momentos: Momento[] };

export const semana: DiaDaSemana[] = [
  { id: 'ter-5', semana: 'TER', dia: 5, momentos: [] },
  { id: 'qua-6', semana: 'QUA', dia: 6, momentos: [] },
  { id: 'qui-7', semana: 'QUI', dia: 7, momentos: [] },
  { id: 'sex-8', semana: 'SEX', dia: 8, momentos: [] },
  { id: 'sab-9', semana: 'SAB', dia: 9, momentos: [] },
  { id: 'dom-10', semana: 'DOM', dia: 10, momentos: [] },
  {
    id: 'seg-11',
    semana: 'SEG',
    dia: 11,
    momentos: [
      {
        id: 'automatico',
        partes: [
          'Você',
          { rotulo: 'Abriu no automático', tom: 'erro', icone: IconeRepetir },
          'às',
          { rotulo: '13:42', tom: 'info', icone: IconeRelogio },
          'e se sentiu',
          { rotulo: 'Cansada', tom: 'info', icone: RostoCorado },
        ],
      },
      {
        id: 'checkin',
        partes: [
          'Você',
          { rotulo: 'Fez check-in', tom: 'sucesso', icone: IconeCheckin },
          'às',
          { rotulo: '17:22', tom: 'info', icone: IconeRelogio },
          'e ficou 62 minutos sem abrir o celular no automático.',
        ],
      },
    ],
  },
];
export const DIA_INICIAL = 'seg-11';
