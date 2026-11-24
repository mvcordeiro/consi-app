import { Stack, usePathname } from 'expo-router';

import { ProtegerDiario } from '@/components/diario/ProtegerDiario';
import { useTema } from '@/theme';

/**
 * Telas do Diário fora da aba, iguais para a lista e para a linha do tempo:
 * novo momento, dia aberto, entrada aberta, edição e busca.
 * Com a trava do Diário (issue #12), só o momento novo abre sem PIN: ele não mostra nada antigo.
 */
export default function LayoutDiario() {
  const { cores } = useTema();
  const caminho = usePathname();
  const pilha = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg.sunken } }}>
      <Stack.Screen name="novo" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="dia" />
      <Stack.Screen name="momento" />
      <Stack.Screen name="editar" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="busca" options={{ animation: 'fade', contentStyle: { backgroundColor: cores.bg.base } }} />
    </Stack>
  );
  return caminho === '/diario/novo' ? pilha : <ProtegerDiario>{pilha}</ProtegerDiario>;
}
