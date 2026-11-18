import { Stack } from 'expo-router';

import { useTema } from '@/theme';

/** Telas secundárias da aba Hobbies: detalhe, conversa, criar/editar, finalizar, compartilhar, novo hobby, editar hobbies e "Ver tudo". */
export default function LayoutHobby() {
  const { cores } = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg.base } }}>
      <Stack.Screen name="conversa" options={{ presentation: 'modal' }} />
      <Stack.Screen name="finalizar" options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="editar" options={{ presentation: 'modal' }} />
      <Stack.Screen name="compartilhar" options={{ presentation: 'modal' }} />
      <Stack.Screen name="novo" options={{ animation: 'fade_from_bottom' }} />
    </Stack>
  );
}
