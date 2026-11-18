import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { arquivosDeFonte, ModoDeCor, useTema } from '@/theme';

// Mantém a splash na tela até as fontes carregarem.
SplashScreen.preventAutoHideAsync();

/**
 * Layout raiz: carrega as fontes, aplica o modo de cor do celular
 * (claro → Light/laranja, escuro → Dark/azul) e define a pilha principal.
 */
export default function RootLayout() {
  const [carregou, erro] = useFonts(arquivosDeFonte);

  useEffect(() => {
    if (carregou || erro) SplashScreen.hideAsync();
  }, [carregou, erro]);

  if (!carregou && !erro) return null;

  return (
    <ModoDeCor>
      <Pilha />
    </ModoDeCor>
  );
}

function Pilha() {
  const { cores, modo } = useTema();
  return (
    <>
      <StatusBar style={modo === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg.base } }}>
        <Stack.Screen name="(abas)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="pausa" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}
