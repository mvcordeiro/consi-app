import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { textura } from './assets';

/** Distância mínima do topo até o título (sem ícone nem progresso, combinado). */
const TOPO_MINIMO = 96;
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
 * Esqueleto das telas do onboarding:
 *  - fundo bg/brand (azul no Dark, laranja no Light) com a textura por cima
 *  - conteúdo centralizado, margem lateral de 32 (space/32)
 *  - rodapé (botão Continuar) fixo embaixo
 */
type Props = {
  children: ReactNode;
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
  rodape,
  comTextura = true,
  rolavel = false,
  evitarTeclado = false,
  atrasoRodape = 900,
  transicao,
}: Props) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const topo = Math.max(insets.top + space[48], TOPO_MINIMO);

  const conteudo = rolavel ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.conteudo, { paddingTop: topo }]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.conteudo, { paddingTop: topo }]}>{children}</View>
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
    <View style={[styles.flex, { backgroundColor: cores.bg.brand }]}>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.2,
    mixBlendMode: 'soft-light',
  },
  conteudo: { paddingHorizontal: space[32], paddingBottom: space[24] },
  rodape: { paddingHorizontal: space[32], paddingTop: space[16] },
});
