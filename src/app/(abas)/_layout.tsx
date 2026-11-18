import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

import { BarraNavegacao, ModoImersivoProvider } from '@/components';
import { onboardingConcluido } from '@/data/onboarding';
import { useTema } from '@/theme';

/** Abre em Início, mesmo com Hobbies e Diário antes dele na barra. */
export const unstable_settings = { initialRouteName: 'index' };

/**
 * Abas do app — barra flutuante do componente "Top bar" do Figma, fixa no rodapé:
 * Hobbies, Diário, Início, Social, Ajustes. Abre em Início.
 * Quem ainda não fez o onboarding é levado para ele.
 */
export default function LayoutAbas() {
  const { cores } = useTema();
  const [estado, setEstado] = useState<'carregando' | 'pendente' | 'feito'>('carregando');

  useEffect(() => {
    onboardingConcluido().then((ok) => setEstado(ok ? 'feito' : 'pendente'));
  }, []);

  if (estado === 'carregando') return null;
  if (estado === 'pendente') return <Redirect href="/onboarding" />;

  return (
    <ModoImersivoProvider>
    <Tabs
      tabBar={(props) => <BarraNavegacao {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: cores.bg.base },
      }}
    >
      <Tabs.Screen name="hobbies" options={{ title: 'Hobbies' }} />
      <Tabs.Screen name="diario" options={{ title: 'Diário' }} />
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="social" options={{ title: 'Social' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
    </ModoImersivoProvider>
  );
}
