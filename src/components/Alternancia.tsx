import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet } from 'react-native';

import { duration, easing, radius, useTema } from '@/theme';

const nativo = Platform.OS !== 'web';

/**
 * Controle / Alternância — componente do Design System (Átomos, nó 125:38).
 * Trilho 40 × 24: bg/base desligado, action/primary/pressed ligado; indicador de 18 px em bg/disabled,
 * que desliza entre as duas posições do componente (cx 11 → 29).
 */
type Props = {
  ligado: boolean;
  onMudar: (v: boolean) => void;
  rotulo: string;
};

export function Alternancia({ ligado, onMudar, rotulo }: Props) {
  const { cores } = useTema();
  const [v] = useState(() => new Animated.Value(ligado ? 1 : 0));

  useEffect(() => {
    Animated.timing(v, {
      toValue: ligado ? 1 : 0,
      duration: duration.base,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: nativo,
    }).start();
  }, [ligado, v]);

  return (
    <Pressable
      onPress={() => onMudar(!ligado)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: ligado }}
      accessibilityLabel={rotulo}
      style={[styles.trilho, { backgroundColor: ligado ? cores.action.primary.pressed : cores.bg.base }]}
    >
      <Animated.View
        style={[
          styles.indicador,
          {
            backgroundColor: cores.bg.disabled,
            transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trilho: { width: 40, height: 24, borderRadius: radius.full, justifyContent: 'center' },
  indicador: { position: 'absolute', left: 2, width: 18, height: 18, borderRadius: 9 },
});
