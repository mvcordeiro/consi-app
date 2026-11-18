import { Stack } from 'expo-router';

import { useTema } from '@/theme';

/** Telas de grupo de apps da Home: criar e abrir/editar. */
export default function LayoutGrupo() {
  const { cores } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg.base } }} />;
}
