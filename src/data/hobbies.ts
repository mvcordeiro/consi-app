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

import type { Hobby } from './onboarding';

/** Hobbies oferecidos no onboarding (tela D4 do Figma). */
export const hobbies: Record<Hobby, { nome: string; Icone: IconeSvg; IconeResumo: IconeSvg }> = {
  leitura: { nome: 'Leitura', Icone: HobbyLeitura, IconeResumo: HobbyLeituraD5 },
  cinema: { nome: 'Cinema', Icone: HobbyCinema, IconeResumo: HobbyCinema },
  musica: { nome: 'Música', Icone: HobbyMusica, IconeResumo: HobbyMusica },
  escrita: { nome: 'Escrita', Icone: HobbyEscrita, IconeResumo: HobbyEscrita },
  jogos: { nome: 'Jogos', Icone: HobbyJogos, IconeResumo: HobbyJogos },
  atividade: { nome: 'Atividade física', Icone: HobbyAtividade, IconeResumo: HobbyAtividade },
};

export const MAX_HOBBIES = 3;
