import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { easing, tipografia, useTema, type EstiloDeTexto } from '@/theme';

/**
 * Texto que aparece palavra por palavra (fade + leve subida), no estilo das
 * apresentações da Apple. Quebras de linha com "\n" são respeitadas.
 * Por padrão é centralizado (combinado para o onboarding).
 */
export const PASSO_PALAVRA_MS = 70;
export const DURACAO_PALAVRA_MS = 700;

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

/** Largura do espaço (em "em") de cada arquivo de fonte, medida no próprio arquivo. */
const ESPACO_EM: Record<string, number> = {
  'ConsiSans-Book': 0.273,
  'ConsiSans-Medium': 0.27,
  'ConsiFlare-SemiBold': 0.265,
};

/** Momento (ms) em que o último trecho do texto termina de começar a aparecer. */
export function fimDoTexto(texto: string, inicioMs: number) {
  const palavras = texto.split(/\s+/).filter(Boolean).length;
  return inicioMs + palavras * PASSO_PALAVRA_MS + DURACAO_PALAVRA_MS / 2;
}

type Props = {
  texto: string;
  estilo?: EstiloDeTexto;
  cor?: string;
  /** Atraso antes da primeira palavra, em ms. */
  atraso?: number;
  /** Padrão: true. Use false para alinhar à esquerda. */
  centralizado?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TextoAnimado({
  texto,
  estilo = 'Texto/Médio',
  cor,
  atraso = 0,
  centralizado = true,
  style,
}: Props) {
  const { cores } = useTema();
  const tipo = tipografia[estilo];
  const tamanho = tipo.fontSize ?? 16;
  const tracking = tipo.letterSpacing ?? 0;
  const espaco = tamanho * (ESPACO_EM[tipo.fontFamily ?? ''] ?? 0.27) + tracking;
  const linhas = texto.split('\n');
  let indice = 0;

  return (
    <View style={style} accessible accessibilityRole="text" accessibilityLabel={texto}>
      {linhas.map((linha, l) => (
        <View key={l} style={[styles.linha, centralizado && styles.centro]}>
          {linha
            .split(' ')
            .filter(Boolean)
            .map((palavra, i, todas) => {
              const ordem = indice++;
              const ultima = i === todas.length - 1;
              return (
                <Palavra
                  key={`${l}-${i}`}
                  texto={palavra}
                  atraso={atraso + ordem * PASSO_PALAVRA_MS}
                  estilo={[
                    tipo,
                    {
                      color: cor ?? cores.text.primary,
                      // tracking negativo encolhe a caixa medida e o Android corta a última
                      // letra; devolvemos esse pedaço como padding e tiramos da margem
                      paddingRight: tracking < 0 ? -tracking : 0,
                      marginRight: ultima ? 0 : espaco - (tracking < 0 ? -tracking : 0),
                    },
                  ]}
                />
              );
            })}
        </View>
      ))}
    </View>
  );
}

function Palavra({ texto, atraso, estilo }: { texto: string; atraso: number; estilo: object }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1,
      duration: DURACAO_PALAVRA_MS,
      delay: atraso,
      easing: curva,
      useNativeDriver: nativo,
    });
    a.start();
    return () => a.stop();
  }, [atraso, v]);

  return (
    <Animated.Text
      importantForAccessibility="no"
      style={[
        estilo,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      {texto}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', flexWrap: 'wrap' },
  centro: { justifyContent: 'center' },
});
