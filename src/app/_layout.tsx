import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';

import { AvisoNovaVersao } from '@/components/AvisoNovaVersao';
import { AvisoPiloto } from '@/components/AvisoPiloto';
import { AvisoLembreteDiario } from '@/components/diario/LembreteDiario';
import { iniciarPiloto, registrar } from '@/data/piloto';
import { useAparencia } from '@/data/aparencia';
import { HobbiesProvider } from '@/data/hobbiesEstado';
import { carregarHobbiesPersonalizados } from '@/data/hobbiesPersonalizados';
import { useVigia } from '@/data/vigia';
import { useIconeEmocao } from '@/data/iconeEmocao';
import { useWidgets } from '@/data/widgets';
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

  // Hobbies criados pela pessoa entram no catálogo antes das telas de hobbies usarem.
  useEffect(() => {
    void carregarHobbiesPersonalizados();
  }, []);

  if (!carregou && !erro) return null;

  return (
    <ComAparencia>
      <HobbiesProvider>
        <Pilha />
      </HobbiesProvider>
    </ComAparencia>
  );
}

/** O modo de cor: o do celular, ou o escolhido em Ajustes (Claro / Escuro, provisório). */
function ComAparencia({ children }: { children: ReactNode }) {
  const aparencia = useAparencia();
  return <ModoDeCor modo={aparencia === 'sistema' ? undefined : aparencia}>{children}</ModoDeCor>;
}

function Pilha() {
  const { cores, modo } = useTema();
  // APK Android: regras dos grupos para o vigia nativo, que abre a pausa antes dos apps.
  useVigia();
  // APK Android: as emoções de hoje para os widgets da tela inicial.
  useWidgets();
  // APK Android, se a pessoa ligou em Ajustes: o ícone do app mostra a última emoção.
  useIconeEmocao();
  // Piloto: eventos de uso anônimos (qual tela abriu, sem conteúdo) e o convite do dia 7.
  useEffect(() => {
    iniciarPiloto();
  }, []);
  const segmentos = useSegments().join('/');
  useEffect(() => {
    if (segmentos) registrar('tela', { rota: segmentos });
  }, [segmentos]);
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
        {/* Entrada dos widgets (consi://registrar): grava a emoção e segue para a Home */}
        <Stack.Screen name="registrar" options={{ animation: 'none' }} />
        {/* Telas secundárias da aba Hobbies */}
        <Stack.Screen name="hobby" />
        {/* Grupos de apps da Home: criar e abrir/editar */}
        <Stack.Screen name="grupo" />
        {/* Diário: novo momento, dia aberto e busca */}
        <Stack.Screen name="diario" />
        {/* Ajustes → Sugestões, Novidades e Moderação */}
        <Stack.Screen name="ajustes" />
      </Stack>
      {/* APK fora da loja: avisa quando há um build nativo mais novo (o JS chega pelo expo-updates). */}
      <AvisoNovaVersao />
      <AvisoPiloto />
      <AvisoLembreteDiario />
    </>
  );
}
