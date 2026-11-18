import { Pressable, StyleSheet, View } from 'react-native';

import { space, useTema } from '@/theme';

import ChevronDireita from '../../assets/home/chevron-direita.svg';
import { Texto } from './Texto';

type Props = {
  titulo: string;
  subtitulo?: string;
  /** Mostra "Ver tudo ›" à direita do título. */
  onVerTudo?: () => void;
  /**
   * Algumas seções do Figma reservam 36 px para o título e 24 px para o subtítulo
   * (Reflexões, Drops); as demais usam a altura de linha do texto.
   */
  espacado?: boolean;
};

/** Cabeçalho de seção: título (Títulos/Médio) e subtítulo (Texto/Pequeno, text/secondary). */
export function CabecalhoSecao({ titulo, subtitulo, onVerTudo, espacado }: Props) {
  const { cores } = useTema();
  return (
    <View style={styles.coluna}>
      <View style={[styles.linha, espacado && styles.titulo]}>
        <Texto estilo="Títulos/Médio" style={styles.flex}>
          {titulo}
        </Texto>
        {onVerTudo ? (
          <Pressable
            onPress={onVerTudo}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Ver tudo de ${titulo}`}
            style={styles.verTudo}
          >
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              Ver tudo
            </Texto>
            <ChevronDireita width={12} height={12} corTraco={cores.text.tertiary} />
          </Pressable>
        ) : null}
      </View>
      {subtitulo ? (
        <View style={espacado && styles.subtitulo}>
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            {subtitulo}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[4] },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  titulo: { minHeight: 36 },
  subtitulo: { minHeight: 24, justifyContent: 'center' },
  flex: { flexShrink: 1 },
  verTudo: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
});
