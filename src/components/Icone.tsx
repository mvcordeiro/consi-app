import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTema } from '@/theme';

import { icones, type NomeIcone } from './icones';

/**
 * Ícone do Design System (Streamline Freehand) numa caixa quadrada, sem distorcer:
 * os SVGs do Figma vêm com preserveAspectRatio="none", então a proporção natural vem do registro.
 * A cor padrão é icon/primary.
 */
export function Icone({
  nome,
  tamanho = 24,
  cor,
  style,
}: {
  nome: NomeIcone;
  tamanho?: number;
  cor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { cores } = useTema();
  const [Svg, w, h] = icones[nome];
  const escala = tamanho / Math.max(w, h);
  return (
    <View
      style={[{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }, style]}
      pointerEvents="none"
    >
      <Svg width={w * escala} height={h * escala} corTraco={cor ?? cores.icon.primary} />
    </View>
  );
}

export type { NomeIcone };
