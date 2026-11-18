import { useTema } from '@/theme';

import { Tela } from './Tela';
import { Texto } from './Texto';

/** Marcador temporário para telas que ainda não foram implementadas. */
export function EmConstrucao({ titulo, descricao }: { titulo: string; descricao?: string }) {
  const { cores } = useTema();
  return (
    <Tela>
      <Texto estilo="Títulos/Grande">{titulo}</Texto>
      <Texto cor={cores.text.secondary}>{descricao ?? 'Tela ainda não implementada.'}</Texto>
    </Tela>
  );
}
