import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

import { onboardingConcluido } from '@/data/onboarding';
import { tipografia, useTema } from '@/theme';

/**
 * Barra de abas — espelha o componente "Top bar" do Figma:
 * Início, Hobbies, Diário, Social, Ajustes.
 * Quem ainda não fez o onboarding é levado para ele.
 *
 * A FAZER: visual do Figma (ícones e fundo ativo) quando implementarmos a Home.
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
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: cores.bg.base },
        tabBarStyle: { backgroundColor: cores.bg.sunken, borderTopColor: cores.border.subtle },
        tabBarActiveTintColor: cores.text.primary,
        tabBarInactiveTintColor: cores.text.tertiary,
        tabBarLabelStyle: tipografia['Legenda/Pequena'],
        tabBarIcon: () => null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="hobbies" options={{ title: 'Hobbies' }} />
      <Tabs.Screen name="diario" options={{ title: 'Diário' }} />
      <Tabs.Screen name="social" options={{ title: 'Social' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
