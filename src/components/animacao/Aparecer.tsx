import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

import { duration, easing } from '@/theme';

const nativo = Platform.OS !== 'web';

/**
 * Faz um elemento surgir com fade e uma leve subida (ou escala),
 * usando as variáveis de motion do Design System.
 */
type Props = {
  children: ReactNode;
  atraso?: number;
  /** Quanto o elemento sobe ao aparecer, em px. */
  deslocamento?: number;
  /** Escala inicial (ex.: 0.9 para um leve "zoom"). */
  escalaInicial?: number;
  duracao?: number;
  style?: StyleProp<ViewStyle>;
};

export function Aparecer({
  children,
  atraso = 0,
  deslocamento = 12,
  escalaInicial = 1,
  duracao = 900,
  style,
}: Props) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1,
      duration: duracao,
      delay: atraso,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: nativo,
    });
    a.start();
    return () => a.stop();
  }, [atraso, duracao, v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [deslocamento, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [escalaInicial, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
