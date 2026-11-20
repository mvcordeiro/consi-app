import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, type ScrollViewInstance } from 'react-native';

import { emocoes } from '@/data/emocoes';

import { vibrar } from '../hobbies/Arraste';
import { Premo } from './Premo';

const nativo = Platform.OS !== 'web';

/** Figma 760:6169: o balão do centro tem 102 px e os vizinhos 80 px a 50%, a ~122 px de distância. */
const PASSO = 122;
const LADO_CENTRO = 102;
const LADO_VIZINHO = 80;

/** O "?" fica no meio da lista: deslizando para os dois lados aparecem emoções. */
const ITENS: (string | null)[] = [...emocoes.slice(0, 7).map((e) => e.id), null, ...emocoes.slice(7).map((e) => e.id)];

/**
 * Carrossel "Como você está?" do Novo momento. Deslize para trocar o balão do centro e toque
 * numa emoção para levá-la ao centro. O "?" (Premo · Vazio) é a ausência de emoção.
 */
export function CarrosselEmocoes({
  largura,
  valor,
  onMudar,
}: {
  largura: number;
  valor: string | null;
  onMudar: (id: string | null) => void;
}) {
  const rolagem = useRef<ScrollViewInstance | null>(null);
  const [x] = useState(() => new Animated.Value(ITENS.indexOf(valor) * PASSO));
  const atual = useRef(ITENS.indexOf(valor));
  const margem = (largura - PASSO) / 2;

  // começa já centralizado na emoção atual (ou no "?")
  useEffect(() => {
    const i = Math.max(0, ITENS.indexOf(valor));
    if (i !== atual.current) {
      atual.current = i;
      rolagem.current?.scrollTo({ x: i * PASSO, animated: true });
    }
  }, [valor]);

  const assentar = (posX: number) => {
    const i = Math.max(0, Math.min(ITENS.length - 1, Math.round(posX / PASSO)));
    if (i !== atual.current) {
      atual.current = i;
      vibrar('toque');
      onMudar(ITENS[i]);
    }
  };

  return (
    <Animated.ScrollView
      ref={(r: unknown) => {
        rolagem.current = r as ScrollViewInstance | null;
      }}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={PASSO}
      decelerationRate="fast"
      contentOffset={{ x: Math.max(0, ITENS.indexOf(valor)) * PASSO, y: 0 }}
      // na web o contentOffset inicial é ignorado: centraliza quando o carrossel mede
      onLayout={() => rolagem.current?.scrollTo({ x: Math.max(0, atual.current) * PASSO, animated: false })}
      contentContainerStyle={{ paddingHorizontal: margem }}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: nativo })}
      onMomentumScrollEnd={(e) => assentar(e.nativeEvent.contentOffset.x)}
      onScrollEndDrag={(e) => {
        // sem impulso (soltou parado), o momentum não chega
        if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) assentar(e.nativeEvent.contentOffset.x);
      }}
      style={styles.carrossel}
    >
      {ITENS.map((id, i) => {
        const faixa = [(i - 1) * PASSO, i * PASSO, (i + 1) * PASSO];
        const escala = x.interpolate({ inputRange: faixa, outputRange: [LADO_VIZINHO / LADO_CENTRO, 1, LADO_VIZINHO / LADO_CENTRO], extrapolate: 'clamp' });
        const opacidade = x.interpolate({ inputRange: faixa, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
        // os vizinhos descem um pouco (Figma: 22 px abaixo do topo do balão central)
        const desce = x.interpolate({ inputRange: faixa, outputRange: [11, 0, 11], extrapolate: 'clamp' });
        return (
          <Pressable
            key={id ?? 'vazio'}
            onPress={() => {
              rolagem.current?.scrollTo({ x: i * PASSO, animated: true });
              assentar(i * PASSO);
            }}
            accessibilityRole="button"
            accessibilityLabel={id ? (emocoes.find((e) => e.id === id)?.nome ?? id) : 'Sem emoção'}
            accessibilityState={{ selected: valor === id }}
            style={styles.item}
          >
            <Animated.View style={{ opacity: opacidade, transform: [{ translateY: desce }, { scale: escala }] }}>
              <Premo id={id} tamanho={LADO_CENTRO} />
            </Animated.View>
          </Pressable>
        );
      })}
    </Animated.ScrollView>
  );
}

export const ALTURA_CARROSSEL = 124;

const styles = StyleSheet.create({
  carrossel: { height: ALTURA_CARROSSEL, flexGrow: 0 },
  item: { width: PASSO, height: ALTURA_CARROSSEL, alignItems: 'center', justifyContent: 'center' },
});
