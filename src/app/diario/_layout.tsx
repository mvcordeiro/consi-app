import { Stack } from 'expo-router';

import { useTema } from '@/theme';

/** Telas do Diário fora da aba: novo momento, dia aberto e busca. */
export default function LayoutDiario() {
  const { cores } = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg.sunken } }}>
      <Stack.Screen name="novo" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="dia" />
      <Stack.Screen name="busca" options={{ animation: 'fade', contentStyle: { backgroundColor: cores.bg.base } }} />
    </Stack>
  );
}
