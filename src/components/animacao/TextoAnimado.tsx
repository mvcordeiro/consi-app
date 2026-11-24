import { useEffect, useRef, useState } from 'react';
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

/** Quebra as palavras (pelas larguras) em linhas de no máximo `limite`. */
function quebrar(larguras: number[], espaco: number, limite: number) {
  const linhas: number[][] = [];
  let atual = 0;
  larguras.forEach((w, i) => {
    const ultima = linhas[linhas.length - 1];
    if (ultima && atual + espaco + w <= limite + 0.5) {
      ultima.push(i);
      atual += espaco + w;
    } else {
      linhas.push([i]);
      atual = w;
    }
  });
  return linhas;
}

/**
 * Quebra equilibrada (como `text-wrap: balance`): o mesmo número de linhas que caberia na
 * largura toda, mas com a menor largura possível, para as linhas ficarem parecidas.
 */
export function equilibrar(larguras: number[], espaco: number, maxima: number): number[][] {
  const base = quebrar(larguras, espaco, maxima);
  if (base.length < 2) return base;
  let lo = Math.max(...larguras);
  let hi = maxima;
  for (let k = 0; k < 20; k++) {
    const meio = (lo + hi) / 2;
    if (quebrar(larguras, espaco, meio).length <= base.length) hi = meio;
    else lo = meio;
  }
  return quebrar(larguras, espaco, hi);
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
  /**
   * Quebra equilibrada (como `text-wrap: balance`): mantém o número de linhas, mas evita uma
   * linha cheia e uma palavra sozinha embaixo. A primeira passada só mede as palavras.
   */
  equilibrado?: boolean;
};

export function TextoAnimado({
  texto,
  estilo = 'Texto/Médio',
  cor,
  atraso = 0,
  centralizado = true,
  style,
  equilibrado = false,
}: Props) {
  const { cores } = useTema();
  const [largura, setLargura] = useState(0);
  const [medidas, setMedidas] = useState<Record<string, number>>({});
  const tipo = tipografia[estilo];
  const tamanho = tipo.fontSize ?? 16;
  const tracking = tipo.letterSpacing ?? 0;
  const espaco = tamanho * (ESPACO_EM[tipo.fontFamily ?? ''] ?? 0.27) + tracking;
  const corte = tracking < 0 ? -tracking : 0;
  const linhas = texto.split('\n').map((linha) => linha.split(' ').filter(Boolean));
  // Índice da primeira palavra de cada linha (a ordem do aparecimento atravessa as linhas).
  const inicios = linhas.map((_, l) => linhas.slice(0, l).reduce((n, p) => n + p.length, 0));

  const medir = (chave: string, w: number) =>
    setMedidas((m) => (Math.abs((m[chave] ?? -1) - w) < 0.5 ? m : { ...m, [chave]: w }));

  return (
    <View
      style={style}
      accessible
      accessibilityRole="text"
      accessibilityLabel={texto}
      onLayout={equilibrado ? (e) => setLargura(e.nativeEvent.layout.width) : undefined}
    >
      {linhas.map((palavras, l) => {
        const primeira = inicios[l];
        const chave = (i: number) => `${l}-${i}-${palavras[i]}`;
        const larguras = palavras.map((_, i) => medidas[chave(i)]);
        const grupos =
          equilibrado && largura && larguras.every((w) => w !== undefined)
            ? equilibrar(larguras as number[], espaco, largura)
            : [palavras.map((_, i) => i)];
        const fixo = grupos.length > 1 || (equilibrado && !!largura);
        return grupos.map((grupo, g) => (
          <View key={`${l}-${g}`} style={[fixo ? styles.linhaFixa : styles.linha, centralizado && styles.centro]}>
            {grupo.map((i, k) => (
              <Palavra
                key={`${l}-${i}`}
                texto={palavras[i]}
                atraso={atraso + (primeira + i) * PASSO_PALAVRA_MS}
                onLargura={equilibrado ? (w) => medir(chave(i), w) : undefined}
                estilo={[
                  tipo,
                  {
                    color: cor ?? cores.text.primary,
                    // tracking negativo encolhe a caixa medida e o Android corta a última
                    // letra; devolvemos esse pedaço como padding e tiramos da margem
                    paddingRight: corte,
                    marginRight: k === grupo.length - 1 ? 0 : espaco - corte,
                  },
                ]}
              />
            ))}
          </View>
        ));
      })}
    </View>
  );
}

function Palavra({
  texto,
  atraso,
  estilo,
  onLargura,
}: {
  texto: string;
  atraso: number;
  estilo: object;
  /** Largura da palavra (sem a margem), para a quebra equilibrada. */
  onLargura?: (w: number) => void;
}) {
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
      onLayout={onLargura ? (e) => onLargura(e.nativeEvent.layout.width) : undefined}
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
  // Linha já equilibrada: sem quebra automática.
  linhaFixa: { flexDirection: 'row' },
  centro: { justifyContent: 'center' },
});
