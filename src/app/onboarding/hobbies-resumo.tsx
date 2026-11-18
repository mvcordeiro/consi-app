import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { Bolha, BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { hobbies } from '@/data/hobbies';
import { useOnboarding } from '@/data/onboarding';
import { borderWidth, gap, space, useTema } from '@/theme';

/**
 * D5 · Resumo dos hobbies — "Leitura, música e escrita. Boas ideias para o tempo que sobrar."
 * Figma desenhado para 3 escolhas (triângulo). Com 2: lado a lado; com 1: no centro.
 *
 * Os dois anéis "respiram" (crescem e encolhem, um defasado do outro) e têm
 * tamanho proporcional ao grupo de bolhas do centro: mantêm a mesma folga do
 * Figma (anel 1 a 28 px do grupo, anel 2 a 82 px) e nunca passam da largura da tela.
 */
const TAMANHO = 103;
const FOLGA_ANEL_1 = 28;
const FOLGA_ANEL_2 = 82;
const SUB = 'É aqui que a gente vai abrir espaço.';

// deslocamento do centro de cada bolha em relação ao centro dos anéis (Figma)
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

/** Raio do grupo: do centro até a borda da bolha mais distante. */
function raioDoGrupo(n: number) {
  const pos = POSICOES[n] ?? POSICOES[1];
  return Math.max(...pos.map((p) => Math.hypot(p.dx, p.dy))) + TAMANHO / 2;
}

export default function D5HobbiesResumo() {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const { respostas } = useOnboarding();
  const transicao = useTransicao();
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

  const grupo = raioDoGrupo(Math.max(1, escolhidos.length));
  const limite = width / 2 - space[8];
  const raio2 = Math.min(grupo + FOLGA_ANEL_2, limite);
  const raio1 = Math.min(grupo + FOLGA_ANEL_1, raio2 - space[24]);
  const lado = raio2 * 2;
  const centro = lado / 2;

  return (
    <TelaOnboarding
      transicao={transicao}
      atrasoRodape={tCirculos + 600}
      rodape={<BotaoContinuar onPress={() => transicao.sair(() => router.push('/onboarding/aplicativos'))} />}
    >
      <View style={styles.cabecalho}>
        <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={100} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.secondary} atraso={tSub} />
      </View>

      <View style={styles.area}>
        <Aparecer atraso={tCirculos} escalaInicial={0.85} deslocamento={0} style={{ width: lado, height: lado }}>
          <Anel raio={raio2} centro={centro} cor={cores.border.focus} atraso={0} />
          <Anel raio={raio1} centro={centro} cor={cores.border.focus} atraso={700} />
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
                  left: centro + p.dx - TAMANHO / 2,
                  top: centro + p.dy - TAMANHO / 2,
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
function Anel({ raio, centro, cor, atraso }: { raio: number; centro: number; cor: string; atraso: number }) {
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
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: centro - raio,
        top: centro - raio,
        width: raio * 2,
        height: raio * 2,
        borderRadius: raio,
        borderWidth: borderWidth.thin,
        borderColor: cor,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: gap.default },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space[16] },
});
