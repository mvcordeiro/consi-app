import { useLocalSearchParams } from 'expo-router';

import { EmConstrucao } from '@/components';
import { EditorGrupo } from '@/components/grupos/EditorGrupo';
import { useGrupos } from '@/data/gruposHome';

/** Abrir / editar um grupo (toque no card da Home). */
export default function Grupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const grupo = useGrupos().find((g) => g.id === id);
  // key: se o grupo carregar do armazenamento depois, o editor recomeça com os dados certos
  return grupo ? <EditorGrupo key={grupo.id} inicial={grupo} novo={false} /> : <EmConstrucao titulo="Grupo" />;
}
