/**
 * Ícone do app = a última emoção registrada (só no APK Android; ver docs/icone-emocao.md).
 * Opt-in: fica desligado até a pessoa ligar em Ajustes → Personalizar, porque a emoção
 * aparece na tela inicial do celular. Desligado, o ícone volta ao normal.
 */
import { useEffect, useState } from 'react';

import { ConsiWidgets } from '../../modules/consi-widgets';
import { carregarMomentos, useMomentos } from './momentos';
import { preferenciasCarregadas, usePreferencias } from './preferencias';

/** Só existe no APK que tem o módulo nativo com a troca de ícone (não no Expo Go, na web nem em APKs antigos). */
export const temIconePorEmocao = typeof ConsiWidgets?.definirIcone === 'function';

function aplicar(id: string | null) {
  try {
    ConsiWidgets?.definirIcone(id);
  } catch {
    // sem o módulo, o ícone fica como estava
  }
}

/** No layout raiz: mantém o ícone do app igual à última emoção registrada, se a pessoa ligou. */
export function useIconeEmocao() {
  const ligado = usePreferencias().iconePorEmocao;
  const momentos = useMomentos();
  // Espera as preferências e os momentos carregarem, para não piscar o ícone padrão na abertura.
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    if (!temIconePorEmocao) return;
    let ativo = true;
    Promise.all([preferenciasCarregadas(), carregarMomentos()]).then(() => ativo && setPronto(true));
    return () => {
      ativo = false;
    };
  }, []);

  const ultima = momentos[0]?.id ?? null;
  const escolhido = ligado ? ultima : null;
  useEffect(() => {
    if (temIconePorEmocao && pronto) aplicar(escolhido);
  }, [pronto, escolhido]);
}
