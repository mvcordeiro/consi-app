import { icones } from '@/components/icones';
import {
  HobbyAtividade,
  HobbyCinema,
  HobbyEscrita,
  HobbyJogos,
  HobbyLeitura,
  HobbyLeituraD5,
  HobbyMusica,
  type IconeSvg,
} from '@/components/onboarding/assets';

import { catalogoHobbies } from './catalogo/hobbies';
import type { Hobby } from './onboarding';

/**
 * Hobbies como as bolhas do onboarding os desenham (telas D4 e D5).
 * Vem do catálogo (catalogo/hobbies.ts); os seis originais do Figma mantêm os ícones de 28 px
 * desenhados para o onboarding, e os demais usam o ícone do Design System.
 */
type ParaBolha = { nome: string; Icone: IconeSvg; IconeResumo: IconeSvg };

const doFigma: Record<string, Pick<ParaBolha, 'Icone' | 'IconeResumo'>> = {
  leitura: { Icone: HobbyLeitura, IconeResumo: HobbyLeituraD5 },
  cinema: { Icone: HobbyCinema, IconeResumo: HobbyCinema },
  musica: { Icone: HobbyMusica, IconeResumo: HobbyMusica },
  escrita: { Icone: HobbyEscrita, IconeResumo: HobbyEscrita },
  jogos: { Icone: HobbyJogos, IconeResumo: HobbyJogos },
  atividade: { Icone: HobbyAtividade, IconeResumo: HobbyAtividade },
};

export const hobbies: Record<Hobby, ParaBolha> = Object.fromEntries(
  catalogoHobbies.map((h) => {
    const Svg = icones[h.icone][0];
    return [h.id, { nome: h.nome, Icone: doFigma[h.id]?.Icone ?? Svg, IconeResumo: doFigma[h.id]?.IconeResumo ?? Svg }];
  }),
);

export const MAX_HOBBIES = 3;
