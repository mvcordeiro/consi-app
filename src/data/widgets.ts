/**
 * Widgets da tela inicial (só no APK Android; ver docs/widgets-e-lembretes.md).
 * O banco do Consi é criptografado e só o JS o abre: os widgets nativos não leem os momentos.
 * Daqui o app manda o resumo de hoje (as emoções na ordem dos aglomerados do Diário e quantos
 * registros) sempre que algo muda, e os widgets se redesenham.
 */
import { useEffect, useMemo } from 'react';

import { ConsiWidgets } from '../../modules/consi-widgets';
import { horaMinuto } from './emocoes';
import { chaveDia, emocoesDoDia, useMomentos } from './momentos';

/** Etiquetas do widget grande ("Alegria · às 10:12"), como as da Home. */
const ETIQUETAS_NO_WIDGET = 3;

/** No layout raiz: mantém os widgets em dia com os registros de hoje. */
export function useWidgets() {
  const momentos = useMomentos();
  const hoje = chaveDia(new Date());
  const resumo = useMemo(() => {
    const doDia = momentos.filter((m) => chaveDia(m.em) === hoje);
    // A hora fixa ("às 10:12") e não "há 5 min": o widget não se redesenha a cada minuto.
    const recentes = doDia.slice(0, ETIQUETAS_NO_WIDGET).map((m) => ({ id: m.id, hora: horaMinuto(m.em) }));
    return JSON.stringify({ dia: hoje, emocoes: emocoesDoDia(doDia), total: doDia.length, recentes });
  }, [momentos, hoje]);

  useEffect(() => {
    if (!ConsiWidgets) return;
    try {
      ConsiWidgets.atualizar(resumo);
    } catch {
      // sem o módulo, os widgets ficam como estavam
    }
  }, [resumo]);
}
