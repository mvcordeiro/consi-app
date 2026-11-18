import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

import { TelaOnboarding } from '@/components/onboarding';
import { Logo } from '@/components/onboarding/assets';
import { easing, useCoresSvg } from '@/theme';

/**
 * A1 · Logo — o logo surge (fade + leve zoom), fica cerca de 2 s e
 * desaparece antes de dar lugar ao Splash.
 */
const ENTRADA_MS = 900;
const PARADO_MS = 1100;
const SAIDA_MS = 600;

export default function A1Logo() {
  const v = useRef(new Animated.Value(0)).current;
  const coresSvg = useCoresSvg();

  useEffect(() => {
    const curva = Easing.bezier(...easing.standard);
    const nativo = Platform.OS !== 'web';
    const seq = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ENTRADA_MS, easing: curva, useNativeDriver: nativo }),
      Animated.delay(PARADO_MS),
      Animated.timing(v, { toValue: 2, duration: SAIDA_MS, easing: curva, useNativeDriver: nativo }),
    ]);
    seq.start(({ finished }) => finished && router.replace('/onboarding/splash'));
    return () => seq.stop();
  }, [v]);

  return (
    <TelaOnboarding>
      <Animated.View
        style={[
          styles.centro,
          {
            opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.92, 1, 1.04] }) }],
          },
        ]}
      >
        <Logo width={180} height={67} accessibilityLabel="Consi" {...coresSvg} />
      </Animated.View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  // centro da tela inteira (ignora o respiro do topo do TelaOnboarding)
  centro: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
