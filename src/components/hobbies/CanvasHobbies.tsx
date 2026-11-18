import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { categorias, catalogoHobbies, type HobbyId, type HobbyInfo } from '@/data/catalogo';
import { hobbies as paraBolha } from '@/data/hobbies';
import { easing, useTema } from '@/theme';

import { Bolha } from '../onboarding/Bolha';
import { Texto } from '../Texto';
import { vibrar } from './Arraste';

const nativo = Platform.OS !== 'web';

const TAMANHO = 92;
/** Espaçamento da espiral (filotaxia) dentro de cada grupo. */
const PASSO_ESPIRAL = 60;
const ANGULO_DOURADO = (137.508 * Math.PI) / 180;
/**
 * Distância entre os centros dos grupos (grade hexagonal). O maior grupo (9 bolhas) tem raio
 * de ~265 px na espiral; com a bolha e o rótulo, 660 evita que grupos vizinhos se misturem.
 */
const ENTRE_GRUPOS = 660;

type Posicionada = { h: HobbyInfo; x: number; y: number; ordem: number };
type Rotulo = { id: string; nome: string; x: number; y: number };

/** Grupos: o central (destaques, se houver) e um por categoria em volta, numa grade hexagonal. */
function montarLayout(destaques: HobbyId[]) {
  const grupos: { id: string; nome: string; itens: HobbyInfo[] }[] = [];
  const usados = new Set<HobbyId>();
  if (destaques.length) {
    grupos.push({
      id: 'destaques',
      nome: 'Para começar',
      itens: destaques.map((d) => catalogoHobbies.find((h) => h.id === d)).filter((h): h is HobbyInfo => !!h),
    });
    destaques.forEach((d) => usados.add(d));
  }
  for (const c of categorias) {
    const itens = catalogoHobbies.filter((h) => h.categoria === c.id && !usados.has(h.id));
    if (itens.length) grupos.push({ id: c.id, nome: c.nome, itens });
  }

  // Centros: o primeiro no meio; os outros em anéis hexagonais.
  const centros: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (let anel = 1; centros.length < grupos.length; anel++) {
    for (let lado = 0; lado < 6 && centros.length < grupos.length; lado++) {
      for (let passo = 0; passo < anel && centros.length < grupos.length; passo++) {
        const a1 = (Math.PI / 3) * lado;
        const a2 = (Math.PI / 3) * (lado + 1);
        const t = passo / anel;
        centros.push({
          x: ENTRE_GRUPOS * anel * ((1 - t) * Math.cos(a1) + t * Math.cos(a2)),
          y: ENTRE_GRUPOS * anel * 0.92 * ((1 - t) * Math.sin(a1) + t * Math.sin(a2)),
        });
      }
    }
  }

  const bolhas: Posicionada[] = [];
  const rotulos: Rotulo[] = [];
  let ordem = 0;
  grupos.forEach((g, gi) => {
    const c = centros[gi];
    let raio = 0;
    g.itens.forEach((h, i) => {
      // espiral de girassol: espalha sem sobrepor e fica orgânica
      const r = i === 0 ? 0 : PASSO_ESPIRAL * Math.sqrt(i + 0.6) * 1.5;
      const a = i * ANGULO_DOURADO + gi;
      const x = c.x + r * Math.cos(a);
      const y = c.y + r * Math.sin(a);
      raio = Math.max(raio, r);
      bolhas.push({ h, x, y, ordem: ordem++ });
    });
    rotulos.push({ id: g.id, nome: g.nome, x: c.x, y: c.y - raio - TAMANHO / 2 - 28 });
  });

  const xs = bolhas.map((b) => b.x);
  const ys = bolhas.map((b) => b.y);
  const limites = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys) - 60, maxY: Math.max(...ys) };
  // Caixa do canvas com folga: no Android, toques fora da caixa do pai não chegam aos filhos.
  const folga = TAMANHO + 160;
  const caixa = {
    x: limites.minX - folga,
    y: limites.minY - folga,
    w: limites.maxX - limites.minX + folga * 2,
    h: limites.maxY - limites.minY + folga * 2,
  };
  return { bolhas, rotulos, limites, caixa };
}

type Props = {
  selecionados: HobbyId[];
  onAlternar: (id: HobbyId) => void;
  /** Hobbies que a pessoa já tem: aparecem marcados e não mudam. */
  jaTem?: HobbyId[];
  /** Ficam no grupo do meio (no onboarding, os seis do Figma). */
  destaques?: HobbyId[];
  /** Ids que combinam com a busca: os outros ficam apagados e o canvas vai até o primeiro. */
  busca?: HobbyId[] | null;
};

/**
 * Canvas infinito de hobbies: bolhas (as mesmas do onboarding) agrupadas por categoria,
 * que a pessoa explora arrastando em qualquer direção, com inércia. As bolhas perto do centro
 * da tela ficam maiores e as das bordas encolhem e somem um pouco, como um mapa que respira.
 */
export function CanvasHobbies({ selecionados, onAlternar, jaTem = [], destaques = [], busca }: Props) {
  const { cores } = useTema();
  const [tela, setTela] = useState<{ w: number; h: number } | null>(null);
  const [desloc] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const chaveDestaques = destaques.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula só quando a lista muda
  const layout = useMemo(() => montarLayout(destaques), [chaveDestaques]);
  const vivo = useRef({ tela, layout, atual: { x: 0, y: 0 } });
  useEffect(() => {
    const id = desloc.addListener((v) => {
      vivo.current.atual = v;
    });
    return () => desloc.removeListener(id);
  }, [desloc]);
  useLayoutEffect(() => {
    vivo.current.tela = tela;
    vivo.current.layout = layout;
  });

  /** Deslocamento que põe o ponto (x, y) do canvas no centro da tela. */
  const centrar = (x: number, y: number, t: { w: number; h: number }) => ({ x: t.w / 2 - x, y: t.h / 2 - y });

  const aoMedir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!tela) desloc.setValue(centrar(0, 0, { w: width, h: height }));
    setTela({ w: width, h: height });
  };

  // Busca: leva o canvas até o primeiro resultado.
  const primeiro = busca?.[0];
  useEffect(() => {
    if (!tela || !primeiro) return;
    const b = layout.bolhas.find((x) => x.h.id === primeiro);
    if (!b) return;
    Animated.spring(desloc, { toValue: centrar(b.x, b.y, tela), useNativeDriver: nativo, speed: 8, bounciness: 4 }).start();
  }, [primeiro, tela, layout, desloc]);

  // eslint-disable-next-line react-hooks/refs -- os handlers só leem o ref nos eventos
  const [gesto] = useState(() => {
    const prender = () => {
      const t = vivo.current.tela;
      if (!t) return;
      const { minX, maxX, minY, maxY } = vivo.current.layout.limites;
      const atual = vivo.current.atual;
      // o centro da tela não pode sair da área das bolhas
      const alvo = {
        x: Math.min(Math.max(atual.x, t.w / 2 - maxX), t.w / 2 - minX),
        y: Math.min(Math.max(atual.y, t.h / 2 - maxY), t.h / 2 - minY),
      };
      if (alvo.x !== atual.x || alvo.y !== atual.y) {
        Animated.spring(desloc, { toValue: alvo, useNativeDriver: nativo, speed: 10, bounciness: 4 }).start();
      }
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.hypot(g.dx, g.dy) > 6,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.hypot(g.dx, g.dy) > 6,
      onPanResponderGrant: () => {
        desloc.stopAnimation();
        desloc.extractOffset();
      },
      onPanResponderMove: (_, g) => desloc.setValue({ x: g.dx, y: g.dy }),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        desloc.flattenOffset();
        Animated.decay(desloc, { velocity: { x: g.vx, y: g.vy }, deceleration: 0.994, useNativeDriver: nativo }).start(prender);
      },
      onPanResponderTerminate: () => {
        desloc.flattenOffset();
        prender();
      },
    });
  });

  const encontrados = busca ? new Set(busca) : null;

  return (
    <View style={styles.area} onLayout={aoMedir} {...gesto.panHandlers}>
      {tela ? (
        <Animated.View
          style={[
            styles.canvas,
            {
              left: layout.caixa.x,
              top: layout.caixa.y,
              width: layout.caixa.w,
              height: layout.caixa.h,
              transform: [{ translateX: desloc.x }, { translateY: desloc.y }],
            },
          ]}
        >
          {layout.rotulos.map((r) => (
            <Animated.View
              key={r.id}
              pointerEvents="none"
              style={[
                styles.rotulo,
                { left: r.x - 120 - layout.caixa.x, top: r.y - layout.caixa.y, opacity: lente(desloc, r.x, r.y, tela, 0.15) },
              ]}
            >
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.rotuloTexto}>
                {r.nome.toUpperCase()}
              </Texto>
            </Animated.View>
          ))}
          {layout.bolhas.map((b) => {
            const meu = jaTem.includes(b.h.id);
            const marcado = meu || selecionados.includes(b.h.id);
            const apagado = encontrados && !encontrados.has(b.h.id);
            const escala = lente(desloc, b.x, b.y, tela, 0.5);
            return (
              <Animated.View
                key={b.h.id}
                style={[
                  styles.bolha,
                  {
                    left: b.x - TAMANHO / 2 - layout.caixa.x,
                    top: b.y - TAMANHO / 2 - layout.caixa.y,
                    opacity: apagado ? 0.25 : lente(desloc, b.x, b.y, tela, 0.35),
                    transform: [{ scale: escala }],
                  },
                ]}
              >
                <Entrada atraso={Math.min(b.ordem, 24) * 30}>
                  <Bolha
                    Icone={paraBolha[b.h.id].Icone}
                    rotulo={meu ? `${b.h.nome} · seu` : b.h.nome}
                    tamanho={TAMANHO}
                    larguraRotulo={TAMANHO - 16}
                    selecionada={marcado}
                    flutuar={b.ordem + 1}
                    onPress={
                      meu
                        ? undefined
                        : () => {
                            vibrar('toque');
                            onAlternar(b.h.id);
                          }
                    }
                  />
                </Entrada>
              </Animated.View>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Lente "olho de peixe": 1 no centro da tela, caindo até `minimo` nas bordas.
 * Feita com duas interpolações (x e y) multiplicadas, para rodar no driver nativo.
 */
function lente(desloc: Animated.ValueXY, x: number, y: number, tela: { w: number; h: number }, minimo: number) {
  const cx = tela.w / 2 - x;
  const cy = tela.h / 2 - y;
  const rx = tela.w * 0.75;
  const ry = tela.h * 0.75;
  const sx = desloc.x.interpolate({
    inputRange: [cx - rx, cx - rx * 0.35, cx, cx + rx * 0.35, cx + rx],
    outputRange: [minimo, 0.92, 1, 0.92, minimo],
    extrapolate: 'clamp',
  });
  const sy = desloc.y.interpolate({
    inputRange: [cy - ry, cy - ry * 0.35, cy, cy + ry * 0.35, cy + ry],
    outputRange: [minimo, 0.92, 1, 0.92, minimo],
    extrapolate: 'clamp',
  });
  return Animated.multiply(sx, sy);
}

/** Cada bolha entra com um "pop", em sequência. */
function Entrada({ atraso, children }: { atraso: number; children: ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 600,
      delay: atraso,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: nativo,
    }).start();
  }, [atraso, v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // no web, arrastar não deve selecionar os textos das bolhas
  area: { flex: 1, overflow: 'hidden', userSelect: 'none' } as object,
  canvas: { position: 'absolute' },
  bolha: { position: 'absolute', width: TAMANHO, height: TAMANHO },
  rotulo: { position: 'absolute', width: 240 },
  rotuloTexto: { textAlign: 'center', letterSpacing: 1 },
});
