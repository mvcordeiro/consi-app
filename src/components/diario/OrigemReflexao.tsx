import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, useTema } from '@/theme';

import { Icone } from '../Icone';
import { Texto } from '../Texto';

/**
 * Origem: a pessoa chegou ao Diário por uma Reflexão da Home (issue #15). Mostra de qual reflexão
 * veio, para o recorte da tela fazer sentido. Fundo bg/raised, contorno border/focus.
 */
export function OrigemReflexao({ titulo, style }: { titulo: string; style?: StyleProp<ViewStyle> }) {
  const { cores } = useTema();
  return (
    <View
      style={[styles.caixa, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }, style]}
      accessible
      accessibilityLabel={`Você veio de Reflexões: ${titulo}`}
    >
      <Icone nome="lampada" tamanho={20} cor={cores.text.accent} />
      <View style={styles.textos}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.accent}>
          Você veio de Reflexões
        </Texto>
        <Texto estilo="Texto/Botões e rótulos">{titulo}</Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textos: { flex: 1, gap: space[2] },
});
