import { hobbyInfo } from '@/data/catalogo';
import type { HobbyId } from '@/data/catalogo';

import { Icone, type NomeIcone } from '../Icone';

/**
 * Ícone de um hobby do catálogo (filtros 16 px, cards 24 px, bolhas 28 px).
 * `icone` sobrescreve o do hobby (atividades criadas podem ter ícone próprio).
 */
export function IconeHobby({
  hobby,
  caixa,
  cor,
  icone,
}: {
  hobby: HobbyId;
  caixa: number;
  cor?: string;
  icone?: NomeIcone;
}) {
  return <Icone nome={icone ?? hobbyInfo(hobby).icone} tamanho={caixa} cor={cor} />;
}
