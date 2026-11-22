import { Stack } from 'expo-router';

import { useTema } from '@/theme';

/**
 * Telas abertas a partir da aba Ajustes: Sugestões (lista, nova, detalhe), Novidades,
 * login de admin e Moderação. Documentação: docs/ajustes.md → Comunidade.
 */
export default function LayoutAjustes() {
  const { cores } = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg.base } }}>
      <Stack.Screen name="sugestoes/nova" options={{ presentation: 'modal' }} />
      <Stack.Screen name="admin-entrar" options={{ presentation: 'modal' }} />
      <Stack.Screen name="moderacao/versao" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
