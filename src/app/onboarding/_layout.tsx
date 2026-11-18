import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/data/onboarding';
import { ModoDeCor, useTema } from '@/theme';

/**
 * Fluxo de onboarding (Figma: seção "// ONBOARDING").
 *   A  index (logo) → splash
 *   B  nome → boas-vindas                         (etapa 1)
 *   C  objetivo → respiracao                      (etapa 2)
 *   D  hobbies → hobbies-resumo                   (etapa 3)
 *   E  aplicativos                                (etapa 4)
 *   F  permissoes → compromisso → Home            (etapa 5)
 */
export default function LayoutOnboarding() {
  return (
    <ModoDeCor modo="dark">
      <OnboardingProvider>
        <Pilha />
      </OnboardingProvider>
    </ModoDeCor>
  );
}

function Pilha() {
  const { cores } = useTema();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: cores.bg['info-subtle'] },
      }}
    />
  );
}
