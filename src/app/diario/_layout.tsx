import { Stack } from 'expo-router';

import { useTema } from '@/theme';

/**
 * Telas do Diário fora da aba, iguais para a lista e para a linha do tempo:
 * novo momento, dia aberto, entrada aberta, edição e busca.
 */
export default function LayoutDiario() {
  const { cores } = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg.sunken } }}>
      <Stack.Screen name="novo" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="dia" />
      <Stack.Screen name="momento" />
      <Stack.Screen name="editar" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="busca" options={{ animation: 'fade', contentStyle: { backgroundColor: cores.bg.base } }} />
    </Stack>
  );
}
