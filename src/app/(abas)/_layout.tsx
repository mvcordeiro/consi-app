import { Redirect, router, Tabs, useSegments } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';

import { BarraNavegacao, ModoImersivoProvider, useModoImersivo } from '@/components';
import { GestoAbas } from '@/components/GestoAbas';
import { onboardingConcluido } from '@/data/onboarding';
import {
  ordemDasAbas,
  preferenciasCarregadas,
  useMovimentoReduzido,
  usePreferencias,
  type Aba,
  type AbaInicial,
} from '@/data/preferencias';
import { useTema } from '@/theme';

/** Abre em Início, mesmo com Hobbies e Diário antes dele na barra (ou na aba escolhida em Ajustes). */
export const unstable_settings = { initialRouteName: 'index' };

/**
 * Abas do app — barra flutuante do componente "Top bar" do Figma, fixa no rodapé:
 * Hobbies, Diário, Início, Social, Ajustes. Abre em Início ou na aba de Ajustes → "Abrir o app em".
 * Deslizar para os lados troca de aba (GestoAbas). Quem ainda não fez o onboarding é levado para ele.
 */
export default function LayoutAbas() {
  const { cores } = useTema();
  const [estado, setEstado] = useState<'carregando' | 'pendente' | 'feito'>('carregando');
  // Aba de abertura lida uma vez: mudar em Ajustes vale na próxima vez que o app abrir.
  const [abaInicial, setAbaInicial] = useState<AbaInicial>('index');
  const reduzido = useMovimentoReduzido();

  useEffect(() => {
    Promise.all([onboardingConcluido(), preferenciasCarregadas()]).then(([ok, prefs]) => {
      setAbaInicial(prefs.abaInicial);
      setEstado(ok ? 'feito' : 'pendente');
    });
  }, []);

  // Depois que as abas montam, vai para a aba escolhida (o Tabs não aceita rota inicial dinâmica).
  useEffect(() => {
    if (estado === 'feito' && abaInicial !== 'index') router.navigate(`/(abas)/${abaInicial}`);
  }, [estado, abaInicial]);

  if (estado === 'carregando') return null;
  if (estado === 'pendente') return <Redirect href="/onboarding" />;

  return (
    <ModoImersivoProvider>
      <ComGesto>
        <Tabs
          tabBar={(props) => <BarraNavegacao {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: cores.bg.base },
            // Troca de aba desliza para o lado (combina com o gesto); "Reduzir movimento" só corta.
            animation: reduzido ? 'none' : 'shift',
          }}
        >
          <Tabs.Screen name="hobbies" options={{ title: 'Hobbies' }} />
          <Tabs.Screen name="diario" options={{ title: 'Diário' }} />
          <Tabs.Screen name="index" options={{ title: 'Início' }} />
          <Tabs.Screen name="social" options={{ title: 'Social' }} />
          <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
        </Tabs>
      </ComGesto>
    </ModoImersivoProvider>
  );
}


/**
 * Deslizar troca de aba. Envolve o navegador inteiro (o `screenLayout` das Tabs não chega ao
 * navegador do expo-router) e descobre a aba atual pela rota. Desligado no modo imersivo da Home.
 */
function ComGesto({ children }: { children: ReactNode }) {
  const { imersivo } = useModoImersivo();
  // A mesma ordem da barra: a aba em que o app abre fica no meio.
  const ORDEM_ABAS = ordemDasAbas(usePreferencias().abaInicial);
  const segmentos = useSegments();
  // Em "/(abas)" o segmento da aba vem depois do grupo; o Início não tem segmento.
  const aba = (segmentos[1] ?? 'index') as Aba;
  const i = ORDEM_ABAS.indexOf(aba);
  return (
    <GestoAbas
      desligado={imersivo || i < 0}
      onTrocar={(direcao) => {
        const proxima = ORDEM_ABAS[i + direcao];
        if (proxima) router.navigate(proxima === 'index' ? '/' : `/${proxima}`);
      }}
    >
      {children}
    </GestoAbas>
  );
}
