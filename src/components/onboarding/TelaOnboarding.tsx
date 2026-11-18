import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { textura } from './assets';
import { ProgressoOnboarding } from './ProgressoOnboarding';

/** Distância do topo do frame até o indicador de progresso no Figma. */
const TOPO_FIGMA = 46;
/** Duração da saída suave antes de ir para a próxima tela. */
const SAIDA_MS = 650;
const nativo = Platform.OS !== 'web';

export type Transicao = { opacidade: Animated.Value; sair: (depois: () => void) => void };

/**
 * Saída suave entre telas: o conteúdo some devagar (e sobe um pouco)
 * antes de navegar. Ao voltar para a tela, ela reaparece.
 *   const transicao = useTransicao();
 *   <TelaOnboarding transicao={transicao} …>
 *   onPress={() => transicao.sair(() => router.push('/proxima'))}
 */
export function useTransicao(): Transicao {
  const opacidade = useRef(new Animated.Value(1)).current;
  const saindo = useRef(false);

  useFocusEffect(
    useCallback(() => {
      saindo.current = false;
      opacidade.setValue(1);
    }, [opacidade]),
  );

  const sair = useCallback(
    (depois: () => void) => {
      if (saindo.current) return;
      saindo.current = true;
      Animated.timing(opacidade, {
        toValue: 0,
        duration: SAIDA_MS,
        // curva simétrica: começa e termina devagar, para a saída não parecer um corte
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: nativo,
      }).start(() => depois());
    },
    [opacidade],
  );

  return { opacidade, sair };
}

/**
 * Esqueleto das telas do onboarding (frames de 412 × 917 no Figma):
 *  - fundo bg/info-subtle com a textura por cima (soft-light, 20%)
 *  - indicador de progresso no topo
 *  - conteúdo com margem lateral de 32 (space/32)
 *  - rodapé (botão Continuar) fixo embaixo
 */
type Props = {
  children: ReactNode;
  /** Etapa atual (1 a 5). Sem etapa, o indicador não aparece. */
  etapa?: 1 | 2 | 3 | 4 | 5;
  /** Alinhamento do indicador de progresso. Padrão: esquerda */
  progressoCentralizado?: boolean;
  /** Algo à direita do indicador (ex.: contador "3 de 3"). */
  aoLadoDoProgresso?: ReactNode;
  /** Rodapé fixo, normalmente o BotaoContinuar. */
  rodape?: ReactNode;
  /** Mostra a textura de fundo. Padrão: true (a tela de Permissões não tem). */
  comTextura?: boolean;
  /** Conteúdo rolável (Permissões). Padrão: false */
  rolavel?: boolean;
  /** Sobe o rodapé junto com o teclado (tela do nome). */
  evitarTeclado?: boolean;
  /** Quando o rodapé aparece (fade + subida), em ms. Padrão: 900 */
  atrasoRodape?: number;
  /** Saída suave (ver useTransicao). */
  transicao?: Transicao;
};

export function TelaOnboarding({
  children,
  etapa,
  progressoCentralizado,
  aoLadoDoProgresso,
  rodape,
  comTextura = true,
  rolavel = false,
  evitarTeclado = false,
  atrasoRodape = 900,
  transicao,
}: Props) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();

  const topo = etapa ? (
    <View style={[styles.topo, progressoCentralizado && styles.topoCentro]}>
      <ProgressoOnboarding etapa={etapa} />
      {aoLadoDoProgresso}
    </View>
  ) : null;

  const conteudo = rolavel ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.conteudo, { paddingTop: Math.max(insets.top + space[12], TOPO_FIGMA) }]}
      showsVerticalScrollIndicator={false}
    >
      {topo}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.conteudo, { paddingTop: Math.max(insets.top + space[12], TOPO_FIGMA) }]}>
      {topo}
      {children}
    </View>
  );

  const saida = transicao
    ? {
        opacity: transicao.opacidade,
        transform: [
          { translateY: transicao.opacidade.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
        ],
      }
    : null;

  const corpo = (
    <Animated.View style={[styles.flex, saida]}>
      {conteudo}
      {rodape ? (
        <Aparecer
          atraso={atrasoRodape}
          style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, space[16]) + space[24] }]}
        >
          {rodape}
        </Aparecer>
      ) : null}
    </Animated.View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: cores.bg['info-subtle'] }]}>
      {comTextura ? (
        <Image source={textura} resizeMode="cover" style={styles.textura} pointerEvents="none" />
      ) : null}
      {evitarTeclado ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {corpo}
        </KeyboardAvoidingView>
      ) : (
        corpo
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  textura: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.2,
    mixBlendMode: 'soft-light',
  },
  conteudo: { paddingHorizontal: space[32], paddingBottom: space[24] },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[64],
  },
  topoCentro: { justifyContent: 'center' },
  rodape: { paddingHorizontal: space[32], paddingTop: space[16] },
});
