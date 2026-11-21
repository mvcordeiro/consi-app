import { Text, type TextProps } from 'react-native';

import { FATOR_TEXTO, usePreferencias } from '@/data/preferencias';
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
  // "Texto maior" em Ajustes: aumenta tamanho e entrelinha do estilo do Figma.
  const fator = FATOR_TEXTO[usePreferencias().tamanhoTexto];
  const base = tipografia[estilo];
  const escala =
    fator === 1 || base.fontSize === undefined
      ? null
      : { fontSize: base.fontSize * fator, lineHeight: base.lineHeight === undefined ? undefined : base.lineHeight * fator };
  return <Text style={[base, escala, { color: cor ?? cores.text.primary }, style]} {...rest} />;
}
