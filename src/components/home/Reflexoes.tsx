import { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { INSIGHT_INICIAL, insights } from '@/data/home';
import { space, useTema } from '@/theme';

import { CabecalhoSecao } from '../CabecalhoSecao';
import { Texto } from '../Texto';
import { CardInsight } from './CardInsight';

type Rolavel = { scrollTo: (o: { x: number; animated: boolean }) => void };

const ESPACO = space[16];
const MARGEM = space[24];
/** Inclinação das prévias laterais no Figma. */
const GIRO_ESQUERDA = '-5.78deg';
const GIRO_DIREITA = '7.74deg';

/**
 * Reflexões — carrossel de insights. O card do centro fica reto; os vizinhos aparecem
 * inclinados nas bordas da tela, como as prévias do Figma.
 */
export function Reflexoes({ onExplorar }: { onExplorar: (id: string) => void }) {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const largura = width - MARGEM * 2;
  const passo = largura + ESPACO;
  const [x] = useState(() => new Animated.Value(INSIGHT_INICIAL * passo));
  const rolagem = useRef<Rolavel | null>(null);
  // Começa no card do meio (contentOffset só funciona no iOS).
  const posicionar = () => rolagem.current?.scrollTo({ x: INSIGHT_INICIAL * passo, animated: false });

  return (
    <View style={styles.secao}>
      <CabecalhoSecao
        titulo="Reflexões"
        subtitulo="Padrões que ajudam você a se conhecer melhor."
        espacado
      />
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={passo}
        disableIntervalMomentum
        ref={(r: unknown) => {
          rolagem.current = r as Rolavel | null;
        }}
        onLayout={posicionar}
        contentContainerStyle={styles.trilho}
        style={styles.sangria}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
          useNativeDriver: Platform.OS !== 'web',
        })}
      >
        {insights.map((insight, i) => {
          const entrada = [(i - 1) * passo, i * passo, (i + 1) * passo];
          return (
            <Animated.View
              key={insight.id}
              style={{
                width: largura,
                transform: [
                  {
                    rotate: x.interpolate({
                      inputRange: entrada,
                      outputRange: [GIRO_DIREITA, '0deg', GIRO_ESQUERDA],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              }}
            >
              <CardInsight insight={insight} onExplorar={() => onExplorar(insight.id)} />
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      <View style={styles.dica}>
        <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.centro}>
          Arraste para o lado para ver mais →
        </Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  // A folga vertical evita cortar as pontas dos cards inclinados; a margem negativa a compensa.
  sangria: { marginHorizontal: -MARGEM, marginVertical: -space[24] },
  trilho: { paddingHorizontal: MARGEM, gap: ESPACO, paddingVertical: space[24] },
  dica: { minHeight: 24, justifyContent: 'center' },
  centro: { textAlign: 'center' },
});
