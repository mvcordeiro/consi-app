import { useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, useTema } from '@/theme';

import { Texto } from '../Texto';

const nativo = Platform.OS !== 'web';

/**
 * Instância do "Ação / Botão" usada nos cards dos Hobbies: pílula de 48 px com fundo de tom
 * (bg/error-subtle, bg/base ou bg/success-subtle), ícone de 24 px e rótulo opcional em icon/primary.
 * Como o Botão do Design System, afunda levemente ao toque.
 */
type Props = {
  icone: ReactNode;
  rotulo?: string;
  fundo: string;
  /** Ocupa o espaço que sobra na linha (flex 1). Padrão: true. */
  esticar?: boolean;
  /** Elemento por cima do botão (ex.: o ponto de mensagem nova). */
  sobreposicao?: ReactNode;
  acessibilidade: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function BotaoCard({ icone, rotulo, fundo, esticar = true, sobreposicao, acessibilidade, onPress, style }: Props) {
  const { cores } = useTema();
  const [escala] = useState(() => new Animated.Value(1));
  const afundar = (para: number) =>
    Animated.spring(escala, { toValue: para, useNativeDriver: nativo, speed: 40, bounciness: 6 }).start();

  return (
    <Animated.View style={[esticar && styles.esticar, { transform: [{ scale: escala }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => afundar(0.95)}
        onPressOut={() => afundar(1)}
        accessibilityRole="button"
        accessibilityLabel={acessibilidade}
        style={({ pressed }) => [styles.base, { backgroundColor: fundo, opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={styles.icone}>{icone}</View>
        {rotulo ? (
          <Texto estilo="Texto/Botões e rótulos" cor={cores.icon.primary} numberOfLines={1}>
            {rotulo}
          </Texto>
        ) : null}
      </Pressable>
      {sobreposicao}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  esticar: { flex: 1, minWidth: 0 },
  base: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    // O Figma usa 20, mas com o conteúdo centralizado 12 dá o mesmo visual a 430 px de largura
    // e não corta "Finalizar" em telas de 412 px.
    paddingHorizontal: space[12],
    paddingVertical: space[12],
    borderRadius: radius.full,
  },
  icone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
