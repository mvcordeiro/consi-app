import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duration, easing, inset, radius, space, useTema } from '@/theme';

import { Texto } from './Texto';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

/**
 * Folha (bottom sheet) — o Design System ainda não tem modal; esta folha usa só as variáveis:
 * fundo bg/raised, cantos radius/sheet, véu bg/scrim, margem inset/lg e a curva de motion padrão.
 * Usada para menus e confirmações. Toque no véu fecha.
 */
type Props = {
  visivel: boolean;
  onFechar: () => void;
  titulo?: string;
  descricao?: string;
  children?: ReactNode;
};

export function Folha({ visivel, onFechar, titulo, descricao, children }: Props) {
  const { cores } = useTema();
  const { bottom } = useSafeAreaInsets();
  const [montada, setMontada] = useState(visivel);
  const [v] = useState(() => new Animated.Value(0));

  if (visivel && !montada) setMontada(true);

  useEffect(() => {
    if (!montada) return;
    Animated.timing(v, {
      toValue: visivel ? 1 : 0,
      duration: visivel ? duration.slow : duration.base,
      easing: curva,
      useNativeDriver: nativo,
    }).start(({ finished }) => {
      if (finished && !visivel) setMontada(false);
    });
  }, [visivel, montada, v]);

  if (!montada) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onFechar} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: cores.bg.scrim, opacity: v }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
      </Animated.View>
      <View style={styles.base} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.folha,
            {
              backgroundColor: cores.bg.raised,
              paddingBottom: bottom + inset.lg,
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) }],
            },
          ]}
        >
          <View style={[styles.alca, { backgroundColor: cores.border.default }]} />
          {titulo || descricao ? (
            <View style={styles.textos}>
              {titulo ? <Texto estilo="Títulos/Médio">{titulo}</Texto> : null}
              {descricao ? (
                <Texto estilo="Texto/Médio" cor={cores.text.secondary}>
                  {descricao}
                </Texto>
              ) : null}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Linha de menu de uma Folha: ícone opcional, rótulo e, se for destrutiva, cor feedback/error. */
export function ItemFolha({
  rotulo,
  icone,
  destrutivo,
  onPress,
}: {
  rotulo: string;
  icone?: (cor: string) => ReactNode;
  destrutivo?: boolean;
  onPress: () => void;
}) {
  const { cores } = useTema();
  const cor = destrutivo ? cores.feedback.error : cores.text.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.item, { backgroundColor: pressed ? cores.bg.base : 'transparent' }]}
    >
      {icone ? <View style={styles.icone}>{icone(cor)}</View> : null}
      <Texto estilo="Texto/Médio" cor={cor}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, justifyContent: 'flex-end' },
  folha: {
    gap: space[24],
    paddingHorizontal: inset.lg,
    paddingTop: space[12],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  alca: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.full },
  textos: { gap: space[8] },
  item: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingHorizontal: space[12],
    marginHorizontal: -space[12],
    borderRadius: radius.md,
  },
  icone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
