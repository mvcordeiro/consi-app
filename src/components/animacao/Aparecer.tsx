import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

import { useMovimentoReduzido } from '@/data/preferencias';
import { easing } from '@/theme';

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
  const [v] = useState(() => new Animated.Value(0));
  // "Reduzir movimento": só um fade curto, sem subir nem crescer.
  const reduzido = useMovimentoReduzido();
  const subida = reduzido ? 0 : deslocamento;
  const escala = reduzido ? 1 : escalaInicial;

  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1,
      duration: reduzido ? Math.min(duracao, 150) : duracao,
      delay: reduzido ? 0 : atraso,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: nativo,
    });
    a.start();
    return () => a.stop();
  }, [atraso, duracao, reduzido, v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [subida, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [escala, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
