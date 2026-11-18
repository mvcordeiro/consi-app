import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { borderWidth, radius, useTema, type EstiloDeTexto } from '@/theme';

import { Texto } from './Texto';

/**
 * Avatar — componente do Design System (Átomos, nó 162:187).
 * Tamanho: Pequeno (40) ou Expandido (64); nos cards dos Hobbies a instância usa 24, sem borda.
 * Conteúdo: foto ou iniciais (duas letras, fundo bg/sunken e borda border/subtle).
 */
type Props = {
  tamanho?: 24 | 40 | 64;
  foto?: ImageSourcePropType;
  iniciais?: string;
  /** A foto do componente tem borda border/default; a instância de 24 px nos cards não tem. */
  borda?: boolean;
};

const estiloIniciais: Record<NonNullable<Props['tamanho']>, EstiloDeTexto> = {
  24: 'Legenda/Pequena',
  40: 'Títulos/Pequeno',
  64: 'Títulos/Grande',
};

export function Avatar({ tamanho = 40, foto, iniciais = '', borda = tamanho !== 24 }: Props) {
  const { cores } = useTema();
  const base = { width: tamanho, height: tamanho, borderRadius: radius.full };

  if (foto) {
    return (
      <View
        style={[
          styles.base,
          base,
          borda && { borderWidth: borderWidth.thin, borderColor: cores.border.default },
        ]}
      >
        {/* Recorte da foto como no Figma: sobra 7 % em cima e 21 % embaixo, 3,6 % à direita. */}
        <Image
          source={foto}
          resizeMode="cover"
          style={{
            position: 'absolute',
            left: 0,
            top: -tamanho * 0.0714,
            width: tamanho * (1 - 0.0357),
            height: tamanho * (1 + 0.0714 + 0.2143),
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.centro,
        base,
        { backgroundColor: cores.bg.sunken, borderWidth: borderWidth.thin, borderColor: cores.border.subtle },
      ]}
    >
      <Texto estilo={estiloIniciais[tamanho]} style={styles.centroTexto}>
        {iniciais.slice(0, 2).toUpperCase()}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  centro: { alignItems: 'center', justifyContent: 'center' },
  centroTexto: { textAlign: 'center' },
});
