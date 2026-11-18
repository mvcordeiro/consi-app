import { Text, type TextProps } from 'react-native';

import { tipografia, useTema, type EstiloDeTexto } from '@/theme';

type Props = TextProps & {
  /** Estilo de texto do Figma (ex.: "Títulos/Grande"). Padrão: "Texto/Médio" */
  estilo?: EstiloDeTexto;
  /** Cor do texto. Padrão: text/primary do modo atual */
  cor?: string;
};

/** Texto padrão do app: use no lugar do <Text> do React Native. */
export function Texto({ estilo = 'Texto/Médio', cor, style, ...rest }: Props) {
  const { cores } = useTema();
  return <Text style={[tipografia[estilo], { color: cor ?? cores.text.primary }, style]} {...rest} />;
}
