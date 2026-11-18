import { useState } from 'react';

import { EditorGrupo } from '@/components/grupos/EditorGrupo';
import { grupoNovo } from '@/data/gruposHome';

/** Criar grupo ("Criar grupo" da Home ou da engrenagem). */
export default function CriarGrupo() {
  const [inicial] = useState(grupoNovo);
  return <EditorGrupo inicial={inicial} novo />;
}
