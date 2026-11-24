/**
 * Emoções da Home (Figma: seção "// HOME INTERAÇÃO PRINCIPAL", nó 667:9661).
 * A posição de cada balão é a do frame 665:7519 (436 px de largura).
 * A emoção escolhida fica salva no aparelho e vale só para o dia.
 */

import Admiracao from '../../assets/home/emocoes/emocao-admiracao.svg';
import Alegria from '../../assets/home/emocoes/emocao-alegria.svg';
import Desejo from '../../assets/home/emocoes/emocao-desejo.svg';
import Desprezo from '../../assets/home/emocoes/emocao-desprezo.svg';
import Esperanca from '../../assets/home/emocoes/emocao-esperanca.svg';
import Fascinacao from '../../assets/home/emocoes/emocao-fascinacao.svg';
import Medo from '../../assets/home/emocoes/emocao-medo.svg';
import Orgulho from '../../assets/home/emocoes/emocao-orgulho.svg';
import Raiva from '../../assets/home/emocoes/emocao-raiva.svg';
import Repulsa from '../../assets/home/emocoes/emocao-repulsa.svg';
import Satisfeito from '../../assets/home/emocoes/emocao-satisfeito.svg';
import Tedio from '../../assets/home/emocoes/emocao-tedio.svg';
import Tristeza from '../../assets/home/emocoes/emocao-tristeza.svg';
import Vazio from '../../assets/home/emocoes/emocao-vazio.svg';
import Vergonha from '../../assets/home/emocoes/emocao-vergonha.svg';
import AdmiracaoTextura from '../../assets/home/emocoes/emocao-admiracao-textura.svg';
import AlegriaTextura from '../../assets/home/emocoes/emocao-alegria-textura.svg';
import DesejoTextura from '../../assets/home/emocoes/emocao-desejo-textura.svg';
import DesprezoTextura from '../../assets/home/emocoes/emocao-desprezo-textura.svg';
import EsperancaTextura from '../../assets/home/emocoes/emocao-esperanca-textura.svg';
import FascinacaoTextura from '../../assets/home/emocoes/emocao-fascinacao-textura.svg';
import MedoTextura from '../../assets/home/emocoes/emocao-medo-textura.svg';
import OrgulhoTextura from '../../assets/home/emocoes/emocao-orgulho-textura.svg';
import RaivaTextura from '../../assets/home/emocoes/emocao-raiva-textura.svg';
import RepulsaTextura from '../../assets/home/emocoes/emocao-repulsa-textura.svg';
import SatisfeitoTextura from '../../assets/home/emocoes/emocao-satisfeito-textura.svg';
import TedioTextura from '../../assets/home/emocoes/emocao-tedio-textura.svg';
import TristezaTextura from '../../assets/home/emocoes/emocao-tristeza-textura.svg';
import VergonhaTextura from '../../assets/home/emocoes/emocao-vergonha-textura.svg';
import type { IconeSvg } from '@/components/onboarding/assets';
import {
  adicionarMomento,
  apagarMomento,
  atualizarMomento,
  carregarMomentos,
  MARCADOR_PAUSA,
  restaurarMomento,
  type Momento,
  type OrigemMomento,
} from './momentos';
import { resolverNome } from './nomesEmocoes';
import { preferenciasAtuais, usePreferencias } from './preferencias';

export type Emocao = {
  id: string;
  /** O nome que aparece no app: o escolhido em Ajustes → Nomes das emoções, ou o original. */
  readonly nome: string;
  /** Nome como está na camada do Figma. */
  nomeOriginal: string;
  /** Contorno e rosto (por cima). */
  Svg: IconeSvg;
  /** Textura do fundo, recortada no círculo abaixo (no lugar da máscara do Figma). */
  Textura: IconeSvg;
  /** Círculo da máscara "Fundo" do Figma, no SVG de 90 px. */
  circulo: { cx: number; cy: number };
  /** Canto do componente "Premo" (87,6 × 84,5) no frame de 436 px. */
  x: number;
  y: number;
};

const BASE: (Omit<Emocao, 'nome' | 'nomeOriginal'> & { nome: string })[] = [
  { id: 'satisfeito', nome: 'Satisfeito', Svg: Satisfeito, Textura: SatisfeitoTextura, circulo: { cx: 43.4922, cy: 44.8477 }, x: 204, y: 89 },
  { id: 'alegria', nome: 'Alegria', Svg: Alegria, Textura: AlegriaTextura, circulo: { cx: 44, cy: 44.8477 }, x: 308, y: 146 },
  { id: 'tristeza', nome: 'Tristeza', Svg: Tristeza, Textura: TristezaTextura, circulo: { cx: 43.4922, cy: 44.8477 }, x: 116, y: 159 },
  { id: 'vergonha', nome: 'Vergonha', Svg: Vergonha, Textura: VergonhaTextura, circulo: { cx: 43.4922, cy: 44.8477 }, x: 19, y: 204 },
  { id: 'orgulho', nome: 'Orgulho', Svg: Orgulho, Textura: OrgulhoTextura, circulo: { cx: 43.4922, cy: 44.8481 }, x: 212, y: 208 },
  { id: 'admiracao', nome: 'Admiração', Svg: Admiracao, Textura: AdmiracaoTextura, circulo: { cx: 43.4922, cy: 44.8477 }, x: 320, y: 266 },
  { id: 'medo', nome: 'Medo', Svg: Medo, Textura: MedoTextura, circulo: { cx: 43.4922, cy: 44.8481 }, x: 126, y: 279 },
  { id: 'repulsa', nome: 'Repulsa', Svg: Repulsa, Textura: RepulsaTextura, circulo: { cx: 43.4922, cy: 44.8477 }, x: 18, y: 316 },
  { id: 'tedio', nome: 'Tédio', Svg: Tedio, Textura: TedioTextura, circulo: { cx: 43.4922, cy: 44.8481 }, x: 218, y: 368 },
  { id: 'fascinacao', nome: 'Fascinação', Svg: Fascinacao, Textura: FascinacaoTextura, circulo: { cx: 43.4922, cy: 44.8477 }, x: 330, y: 375 },
  { id: 'raiva', nome: 'Raiva', Svg: Raiva, Textura: RaivaTextura, circulo: { cx: 43.4922, cy: 44.8477 }, x: 95, y: 399 },
  { id: 'desprezo', nome: 'Desprezo', Svg: Desprezo, Textura: DesprezoTextura, circulo: { cx: 43.8896, cy: 44.8481 }, x: 36, y: 482 },
  { id: 'esperanca', nome: 'Esperança', Svg: Esperanca, Textura: EsperancaTextura, circulo: { cx: 43.4922, cy: 44.8481 }, x: 324, y: 483 },
  { id: 'desejo', nome: 'Desejo', Svg: Desejo, Textura: DesejoTextura, circulo: { cx: 43.4932, cy: 44.8477 }, x: 197, y: 501 },
];

export const emocoes: Emocao[] = BASE.map(({ nome, ...e }) => ({
  ...e,
  nomeOriginal: nome,
  get nome() {
    return resolverNome(preferenciasAtuais().nomesEmocoes, e.id, nome);
  },
}));

/**
 * Assina os nomes das emoções: quem mostra `emocao.nome` chama este hook para se redesenhar
 * quando a pessoa troca um nome em Ajustes.
 */
export function useNomesEmocoes() {
  return usePreferencias().nomesEmocoes;
}

/** Balão "?" do estado inicial. */
export const BalaoVazio = Vazio;

export function emocaoPorId(id?: string | null) {
  return emocoes.find((e) => e.id === id);
}

// ─── Registro (check-ins) ───────────────────────────────────────────────────
// Os check-ins são momentos do Diário (data/momentos.ts): uma lista só, guardada no aparelho.

export type RegistroEmocao = Momento;

export const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Quantos dias de check-ins aparecem em "Sua semana". */
export const DIAS_GUARDADOS = 7;

/** Meia-noite de `dias` dias atrás (0 = hoje). */
export function inicioDoDia(dias = 0, agora = new Date()) {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dias);
  return d;
}

const daSemana = (l: Momento[]) => {
  const limite = inicioDoDia(DIAS_GUARDADOS - 1).getTime();
  return l.filter((r) => r.em >= limite);
};

/**
 * Registra a emoção (o check-in) como um momento e devolve as de hoje, da mais recente
 * para a mais antiga. Da pausa, o momento ganha o marcador "Depois de uma pausa".
 */
export async function salvarEmocao(id: string, origem: OrigemMomento = 'home'): Promise<RegistroEmocao[]> {
  await adicionarMomento({ id, origem, marcadores: origem === 'pausa' ? [MARCADOR_PAUSA] : undefined });
  return emocoesDeHoje();
}

/** Os check-ins da última semana, do mais recente para o mais antigo. */
export async function emocoesDaSemana(): Promise<RegistroEmocao[]> {
  return daSemana(await carregarMomentos());
}

/** Apaga o check-in feito no instante `em`. */
export const apagarCheckin = async (em: number) => daSemana(await apagarMomento(em));

/** Devolve um check-in apagado (o "Desfazer"). */
export const restaurarCheckin = async (r: RegistroEmocao) => daSemana(await restaurarMomento(r));

/** Troca a emoção do check-in feito no instante `em` (o horário continua o mesmo). */
export const editarCheckin = async (em: number, id: string) => daSemana(await atualizarMomento(em, { id }));

/** "14:05" */
export function horaMinuto(em: number) {
  const d = new Date(em);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** As emoções registradas hoje, da mais recente para a mais antiga (as de ontem não contam mais). */
export async function emocoesDeHoje(): Promise<RegistroEmocao[]> {
  const agora = new Date();
  return (await carregarMomentos()).filter((r) => mesmoDia(new Date(r.em), agora));
}

/** "agora" no primeiro minuto, "há X min" até 1 h e depois "às HH:MM". */
export function quandoFoi(em: number, agora = Date.now()) {
  const minutos = Math.floor((agora - em) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  return `às ${horaMinuto(em)}`;
}
