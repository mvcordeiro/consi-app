import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { Bolha, BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { D5Onda1, D5Onda2 } from '@/components/onboarding/assets';
import { hobbies } from '@/data/hobbies';
import { useOnboarding } from '@/data/onboarding';
import { space, useTema } from '@/theme';

/**
 * D5 · Respiração (resumo dos hobbies) — "Leitura, música e escrita. Boas ideias para o tempo que sobrar."
 * Figma desenhado para 3 escolhas (triângulo). Com 2: lado a lado; com 1: no centro.
 * Os dois anéis externos "respiram" (crescem e encolhem), um defasado do outro.
 */
const TAMANHO = 103;
const SUB = 'É aqui que a gente vai abrir espaço.';
// deslocamento do centro de cada bolha em relação ao centro das ondas (Figma)
const POSICOES: Record<number, { dx: number; dy: number }[]> = {
  1: [{ dx: 0, dy: 0 }],
  2: [
    { dx: -52.5, dy: 0 },
    { dx: 52.5, dy: 0 },
  ],
  3: [
    { dx: -51.5, dy: 26.5 },
    { dx: 53.5, dy: 26.5 },
    { dx: 0, dy: -63 },
  ],
};

export default function D5HobbiesResumo() {
  const { cores } = useTema();
  const transicao = useTransicao();
  const { respostas } = useOnboarding();
  const escolhidos = respostas.hobbies;
  const nomes = escolhidos.map((h, i) => (i === 0 ? hobbies[h].nome : hobbies[h].nome.toLowerCase()));
  const lista =
    nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : (nomes[0] ?? '');
  const titulo =
    nomes.length > 1
      ? `${lista}. Boas ideias para o tempo que sobrar.`
      : `${lista}. Uma boa ideia para o tempo que sobrar.`;
  const tSub = fimDoTexto(titulo, 100);
  const tCirculos = fimDoTexto(SUB, tSub);

  return (
    <TelaOnboarding
      transicao={transicao}
      etapa={3}
      atrasoRodape={tCirculos + 600}
      rodape={<BotaoContinuar onPress={() => transicao.sair(() => router.push('/onboarding/aplicativos'))} />}
    >
      <View style={styles.cabecalho}>
        <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={100} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.secondary} atraso={tSub} />
      </View>

      <View style={styles.area}>
        <Aparecer atraso={tCirculos} escalaInicial={0.85} deslocamento={0} style={styles.ondas}>
          <Respirando atraso={0}>
            <D5Onda2 />
          </Respirando>
          <Respirando atraso={700}>
            <D5Onda1 />
          </Respirando>
          {escolhidos.map((h, i) => {
            const p = POSICOES[escolhidos.length][i];
            return (
              <Aparecer
                key={h}
                atraso={tCirculos + 200 + i * 120}
                escalaInicial={0.6}
                deslocamento={0}
                style={{
                  position: 'absolute',
                  left: 196 + p.dx - TAMANHO / 2,
                  top: 196 + p.dy - TAMANHO / 2,
                }}
              >
                <Bolha
                  Icone={hobbies[h].IconeResumo}
                  rotulo={hobbies[h].nome}
                  tamanho={TAMANHO}
                  larguraRotulo={88}
                  selecionada
                />
              </Aparecer>
            );
          })}
        </Aparecer>
      </View>
    </TelaOnboarding>
  );
}

/** Anel que cresce e encolhe devagar, como uma respiração. */
function Respirando({ children, atraso }: { children: ReactNode; atraso: number }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ida = { duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, ...ida }),
        Animated.timing(v, { toValue: 0, ...ida }),
      ]),
    );
    const t = setTimeout(() => loop.start(), atraso);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [atraso, v]);

  return (
    <Animated.View
      style={[
        styles.centro,
        { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: space[16] },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: -space[32] },
  ondas: { width: 392, height: 392 },
  centro: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
