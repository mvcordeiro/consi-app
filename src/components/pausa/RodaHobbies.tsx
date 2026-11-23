import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { vibrar } from '@/components/hobbies/Arraste';
import { hobbyInfo, type HobbyId } from '@/data/catalogo';
import { borderWidth, radius, size, spaceFixo as space, useTema } from '@/theme';

const nativo = Platform.OS !== 'web';

/**
 * Medidas do Figma (seção "02 · ALTERNATIVA", 162:255; tela de 412 × 917).
 * O círculo (772 px, traço de 2 px) e o marcador ficam parados; os hobbies giram pela borda
 * dele. O círculo começa 103 px antes da borda direita e é centralizado na altura da tela.
 */
const CIRCULO = 772;
const DENTRO_DA_TELA = 103;
/** Distância vertical entre os hobbies. */
const PASSO = 112;
/** Arco por onde passa a borda direita dos ícones: concêntrico ao círculo, raio 424. */
const RAIO_ARCO = 424;
/** Caixa do hobby escolhido: ícone 44 + 16 px de cada lado e 20 em cima e embaixo (78 × 86). */
const CAIXA = { largura: 78, altura: 86 };
const ICONE = 44;
/** A borda direita da caixa escolhida fica 38 px antes do círculo (x 271 no Figma). */
const ANTES_DO_CIRCULO = 38;
/** Título: Títulos/Pequeno (18 px) nos outros, Títulos/Médio (22 px) no escolhido. */
const ESCALA_TITULO = 22 / 18;

/** Quanto a borda do ícone entra para a direita a `dy` px do centro, seguindo o arco. */
const arco = (dy: number) => RAIO_ARCO - Math.sqrt(Math.max(0, RAIO_ARCO ** 2 - dy ** 2));
/**
 * Deslocamento horizontal de um hobby a `d` posições do centro, em relação ao escolhido.
 * Fora do centro, o ícone (sem caixa) fica 17 px mais à direita e segue o arco.
 */
const deslocamentoX = (d: number) => (d === 0 ? 0 : (CAIXA.largura - ICONE) / 2 + arco(d * PASSO));
const DISTANCIAS = [-3, -2, -1, 0, 1, 2, 3];

/**
 * Roda de hobbies da pausa (Figma 162:255): arrastar para cima e para baixo troca o hobby
 * do centro; o círculo e o marcador não se mexem. Tocar num hobby também o traz para o centro.
 */
export function RodaHobbies({
  hobbies,
  inicial = 0,
  escolhido,
  onMudar,
}: {
  hobbies: HobbyId[];
  inicial?: number;
  /** O hobby no centro agora (o que `onMudar` avisou por último). */
  escolhido: HobbyId;
  onMudar: (hobby: HobbyId) => void;
}) {
  const { cores } = useTema();
  const [area, setArea] = useState({ largura: 0, altura: 0 });
  const [pos] = useState(() => new Animated.Value(inicial));
  const vivo = useRef({ atual: inicial, inicio: inicial, n: hobbies.length, hobbies, onMudar });
  useEffect(() => {
    vivo.current.n = hobbies.length;
    vivo.current.hobbies = hobbies;
    vivo.current.onMudar = onMudar;
  });

  // O hobby do centro muda quando a roda passa da metade entre dois: vibra e avisa.
  useEffect(() => {
    const id = pos.addListener(({ value }) => {
      const v = vivo.current;
      const i = Math.min(v.n - 1, Math.max(0, Math.round(value)));
      if (i === v.atual) return;
      v.atual = i;
      vibrar();
      v.onMudar(v.hobbies[i]);
    });
    return () => pos.removeListener(id);
  }, [pos]);

  const irPara = (i: number) =>
    Animated.spring(pos, { toValue: i, useNativeDriver: nativo, speed: 14, bounciness: 4 }).start();

  // eslint-disable-next-line react-hooks/refs -- os handlers só leem o ref nos eventos
  const [gesto] = useState(() => {
    const v = vivo.current;
    const vertical = (dx: number, dy: number) => Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx);
    // Além da primeira e da última, a roda resiste (elástico).
    const limitar = (x: number) => {
      const max = v.n - 1;
      if (x < 0) return x * 0.35;
      if (x > max) return max + (x - max) * 0.35;
      return x;
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => vertical(g.dx, g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => vertical(g.dx, g.dy),
      onPanResponderGrant: () => pos.stopAnimation((x) => (v.inicio = x)),
      onPanResponderMove: (_, g) => pos.setValue(limitar(v.inicio - g.dy / PASSO)),
      onPanResponderRelease: (_, g) => {
        const solto = limitar(v.inicio - g.dy / PASSO);
        // um arremesso rápido anda mais de um hobby
        const alvo = Math.round(solto - (g.vy * 180) / PASSO);
        irPara(Math.min(v.n - 1, Math.max(0, alvo)));
      },
      onPanResponderTerminate: () => irPara(v.atual),
    });
  });

  const medir = (e: LayoutChangeEvent) =>
    setArea({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height });

  const centroY = area.altura / 2;
  const esquerdaCirculo = area.largura - DENTRO_DA_TELA;
  const direitaCaixa = area.largura - esquerdaCirculo + ANTES_DO_CIRCULO;

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={medir}
      {...gesto.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Hobbies"
      accessibilityValue={{ text: hobbyInfo(escolhido).nome }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const passo = e.nativeEvent.actionName === 'increment' ? 1 : -1;
        irPara(Math.min(hobbies.length - 1, Math.max(0, hobbies.indexOf(escolhido) + passo)));
      }}
    >
      {area.altura ? (
        <>
          {/* Fixos: o círculo e o marcador na borda esquerda dele */}
          <View
            pointerEvents="none"
            style={[
              styles.circulo,
              { left: esquerdaCirculo, top: centroY - CIRCULO / 2, borderColor: cores.border.focus },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.marcador,
              {
                left: esquerdaCirculo - size['touch-target'] / 2,
                top: centroY - size['icon-sm'] / 2,
                backgroundColor: cores.decor.accent,
              },
            ]}
          />

          {hobbies.map((id, i) => {
            const perto = (fora: number, centro: number, longe = fora) =>
              pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [longe, centro, fora], extrapolate: 'clamp' });
            const info = hobbyInfo(id);
            return (
              <Animated.View
                key={id}
                style={[
                  styles.hobby,
                  {
                    top: centroY - CAIXA.altura / 2,
                    right: direitaCaixa,
                    opacity: pos.interpolate({
                      inputRange: [i - 3, i - 2, i + 2, i + 3],
                      outputRange: [0, 1, 1, 0],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        translateY: pos.interpolate({
                          inputRange: [i - 1, i + 1],
                          outputRange: [PASSO, -PASSO],
                          extrapolate: 'extend',
                        }),
                      },
                      {
                        translateX: pos.interpolate({
                          inputRange: DISTANCIAS.map((d) => i + d),
                          outputRange: DISTANCIAS.map(deslocamentoX),
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  style={styles.linha}
                  onPress={() => irPara(i)}
                  accessibilityRole="button"
                  accessibilityLabel={info.nome}
                >
                  {/* fora do centro, o título fica a 12 px do ícone; no centro, a 16 px da caixa */}
                  <Animated.View
                    style={{
                      opacity: perto(0.5, 1),
                      transform: [{ translateX: perto(21, 0) }, { scale: perto(1, ESCALA_TITULO) }],
                      transformOrigin: 'right center',
                    }}
                  >
                    <Texto estilo="Títulos/Pequeno" numberOfLines={1}>
                      {info.nome}
                    </Texto>
                  </Animated.View>
                  <View style={styles.caixa}>
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFill,
                        styles.anel,
                        { borderColor: cores.border.focus, opacity: perto(0, 1) },
                      ]}
                    />
                    <Animated.View style={{ opacity: perto(0.25, 1) }}>
                      <Icone nome={info.icone} tamanho={ICONE} />
                    </Animated.View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    position: 'absolute',
    width: CIRCULO,
    height: CIRCULO,
    borderRadius: CIRCULO / 2,
    borderWidth: 2,
  },
  marcador: {
    position: 'absolute',
    width: size['touch-target'],
    height: size['icon-sm'],
    borderRadius: radius.pill,
  },
  hobby: { position: 'absolute' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  caixa: { width: CAIXA.largura, height: CAIXA.altura, alignItems: 'center', justifyContent: 'center' },
  anel: { borderRadius: radius.full, borderWidth: borderWidth.thin },
});
