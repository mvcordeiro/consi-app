import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AvisoNovaVersao } from '@/components/AvisoNovaVersao';
import { HobbiesProvider } from '@/data/hobbiesEstado';
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
      <HobbiesProvider>
        <Pilha />
      </HobbiesProvider>
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
        <Stack.Screen name="em-construcao" />
        <Stack.Screen name="grupos-home" options={{ presentation: 'modal' }} />
        <Stack.Screen name="emocao" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* Telas secundárias da aba Hobbies */}
        <Stack.Screen name="hobby" />
        {/* Grupos de apps da Home: criar e abrir/editar */}
        <Stack.Screen name="grupo" />
        {/* Diário: novo momento, dia aberto e busca */}
        <Stack.Screen name="diario" />
      </Stack>
      {/* APK fora da loja: avisa quando há um build nativo mais novo (o JS chega pelo expo-updates). */}
      <AvisoNovaVersao />
    </>
  );
}
