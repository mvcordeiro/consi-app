import type { ComponentType } from 'react';

import { Arrastar } from './Arrastar';
import type { PropsMecanica } from './comum';
import { EstourarBolhas } from './EstourarBolhas';
import { LimparVidro } from './LimparVidro';
import { PuxarTampa } from './PuxarTampa';
import { Segurar } from './Segurar';
import { Toques } from './Toques';
import { VirarCarta } from './VirarCarta';

export type IdMecanica = 'arrastar' | 'vidro' | 'segurar' | 'toques' | 'tampa' | 'carta' | 'bolhas';

export type Mecanica = {
  id: IdMecanica;
  nome: string;
  Componente: ComponentType<PropsMecanica>;
};

/**
 * As formas de revelar um drop. O resultado é sempre o mesmo (a sugestão aparece);
 * só muda a interação. Em preview, a Home deixa escolher qualquer uma para comparar.
 */
export const MECANICAS: readonly Mecanica[] = [
  { id: 'arrastar', nome: 'Arrastar', Componente: Arrastar },
  { id: 'vidro', nome: 'Limpar o vidro', Componente: LimparVidro },
  { id: 'segurar', nome: 'Segurar', Componente: Segurar },
  { id: 'toques', nome: 'Toques', Componente: Toques },
  { id: 'tampa', nome: 'Puxar a tampa', Componente: PuxarTampa },
  { id: 'carta', nome: 'Virar a carta', Componente: VirarCarta },
  { id: 'bolhas', nome: 'Estourar bolhas', Componente: EstourarBolhas },
];

export { RevelarSemGesto, useMovimentoReduzido, type PropsMecanica } from './comum';
