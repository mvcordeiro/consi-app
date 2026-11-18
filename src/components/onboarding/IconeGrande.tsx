import type { FC } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

/**
 * Área de ícone do Figma: uma caixa de tamanho fixo (82 × 82 no onboarding)
 * com o desenho centralizado no tamanho original exportado.
 */
export function IconeGrande({
  Icone,
  tamanho = 82,
  style,
}: {
  Icone: FC<SvgProps>;
  tamanho?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.caixa, { width: tamanho, height: tamanho }, style]}>
      <Icone />
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { alignItems: 'center', justifyContent: 'center' },
});
