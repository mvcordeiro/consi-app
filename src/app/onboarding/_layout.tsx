import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/data/onboarding';
import { useTema } from '@/theme';

/**
 * Fluxo de onboarding (Figma: seção "// ONBOARDING").
 *   index (logo) → splash → nome → boas-vindas → objetivo → respiracao
 *   → hobbies → hobbies-resumo → aplicativos → permissoes → compromisso → Home
 * O modo de cor vem do celular (definido no layout raiz).
 */
export default function LayoutOnboarding() {
  const { cores } = useTema();
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: cores.bg.brand },
        }}
      />
    </OnboardingProvider>
  );
}
