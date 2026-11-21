/**
 * Widgets da tela inicial (só no APK Android; ver docs/widgets-e-lembretes.md).
 * O banco do Consi é criptografado e só o JS o abre: os widgets nativos não leem nada sozinhos.
 * Daqui o app manda, por assunto, os dados prontos sempre que algo muda, e os widgets se
 * redesenham:
 * - dia: as emoções de hoje (na ordem dos aglomerados do Diário), quantos registros e os últimos;
 * - atividades: as atividades em andamento;
 * - sugestao: a primeira atividade da pilha "Para você";
 * - frases: as frases filosóficas da pausa (o widget mostra uma por dia).
 */
import { useEffect, useMemo } from 'react';

import { ConsiWidgets, type AssuntoWidget } from '../../modules/consi-widgets';
import { hobbyInfo } from './catalogo';
import { horaMinuto } from './emocoes';
import { FRASES } from './frases';
import { useHobbies } from './hobbiesEstado';
import { chaveDia, emocoesDoDia, useMomentos } from './momentos';

/** Etiquetas do widget grande ("Alegria · às 10:12"), como as da Home. */
const ETIQUETAS_NO_WIDGET = 3;
/** Linhas do widget "Suas atividades". */
const ATIVIDADES_NO_WIDGET = 3;

function mandar(assunto: AssuntoWidget, json: string) {
  if (!ConsiWidgets) return;
  try {
    ConsiWidgets.atualizar(assunto, json);
  } catch {
    // sem o módulo, os widgets ficam como estavam
  }
}

/** Manda um assunto quando o JSON dele muda. */
function useAssunto(assunto: AssuntoWidget, json: string | null) {
  useEffect(() => {
    if (json != null) mandar(assunto, json);
  }, [assunto, json]);
}

/** No layout raiz (dentro do HobbiesProvider): mantém os widgets em dia. */
export function useWidgets() {
  const momentos = useMomentos();
  const h = useHobbies();
  const hoje = chaveDia(new Date());

  const dia = useMemo(() => {
    const doDia = momentos.filter((m) => chaveDia(m.em) === hoje);
    // A hora fixa ("às 10:12") e não "há 5 min": o widget não se redesenha a cada minuto.
    const recentes = doDia.slice(0, ETIQUETAS_NO_WIDGET).map((m) => ({ id: m.id, hora: horaMinuto(m.em) }));
    return JSON.stringify({ dia: hoje, emocoes: emocoesDoDia(doDia), total: doDia.length, recentes });
  }, [momentos, hoje]);

  const atividades = useMemo(() => {
    if (!h.carregado) return null;
    const abertas = h.atividades.filter((a) => a.status === 'andamento');
    const lista = abertas.slice(0, ATIVIDADES_NO_WIDGET).map((a) => ({
      id: a.id,
      titulo: a.titulo,
      hobby: hobbyInfo(a.hobby).nome,
      minutos: a.minutos,
    }));
    return JSON.stringify({ lista, total: abertas.length });
  }, [h.carregado, h.atividades]);

  // A primeira sugestão do primeiro hobby que ainda tem sugestões (a mesma ordem da aba Hobbies).
  const { carregado, hobbies, pilha } = h;
  const sugestao = useMemo(() => {
    if (!carregado) return null;
    const s = hobbies.map((hb) => pilha(hb)[0]).find(Boolean);
    return JSON.stringify({
      sugestao: s ? { id: s.id, titulo: s.titulo, resumo: s.resumo, hobby: hobbyInfo(s.hobby).nome, minutos: s.minutos } : null,
    });
  }, [carregado, hobbies, pilha]);

  const frases = useMemo(
    () => JSON.stringify({ frases: FRASES.map((f) => ({ texto: f.texto, autor: f.autor, obra: f.obra })) }),
    [],
  );

  useAssunto('dia', dia);
  useAssunto('atividades', atividades);
  useAssunto('sugestao', sugestao);
  useAssunto('frases', frases);
}
