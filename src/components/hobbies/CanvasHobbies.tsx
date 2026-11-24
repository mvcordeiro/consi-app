import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { categorias, catalogoHobbies, type HobbyId, type HobbyInfo } from '@/data/catalogo';
import { hobbies as paraBolha } from '@/data/hobbies';
import { useHobbiesPersonalizados } from '@/data/hobbiesPersonalizados';
import { icones } from '@/components/icones';
import { easing, useTema } from '@/theme';

import { Bolha } from '../onboarding/Bolha';
import { Texto } from '../Texto';
import { vibrar } from './Arraste';

const nativo = Platform.OS !== 'web';

const TAMANHO = 92;
/**
 * Espaçamento da espiral (filotaxia) dentro de cada grupo. Mais apertado que antes (pedido da
 * pessoa, 2026-11-21 e issue #5): bolhas vizinhas ficam a ~100 px, só um respiro entre as de 92 px.
 */
const PASSO_ESPIRAL = 58;
const ANGULO_DOURADO = (137.508 * Math.PI) / 180;
/** Respiro entre dois grupos vizinhos, além das bolhas (issue #5: itens mais agrupados). */
const RESPIRO_GRUPOS = 40;
/** Resistência ao passar do limite arrastando (0 = parede, 1 = sem limite). */
const ELASTICO = 0.3;
/** Quanto a inércia do arraste "anda" (ms de velocidade) antes de parar dentro dos limites. */
const INERCIA_MS = 260;

/** Raio da espiral para `n` bolhas. */
const raioEspiral = (n: number) => (n <= 1 ? 0 : PASSO_ESPIRAL * Math.sqrt(n - 1 + 1.2));

/** Puxa `v` para dentro de [min, max]; com `elastico`, deixa passar só um pouco (efeito borracha). */
function limitar(v: number, min: number, max: number, elastico = 0) {
  if (v < min) return min - (min - v) * elastico;
  if (v > max) return max + (v - max) * elastico;
  return v;
}
/** Zoom com dois dedos: de 45 % (ver tudo) a 180 %. */
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 1.8;

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

  // Distância entre centros: o diâmetro do maior grupo, a bolha e um respiro (antes 520 fixos).
  const ENTRE_GRUPOS = 2 * Math.max(...grupos.map((g) => raioEspiral(g.itens.length))) + TAMANHO + RESPIRO_GRUPOS;
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
      const r = i === 0 ? 0 : PASSO_ESPIRAL * Math.sqrt(i + 1.2);
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
 * Canvas de hobbies (com limites, issue #5): bolhas (as mesmas do onboarding) agrupadas por categoria,
 * que a pessoa explora como um mapa: arrastando com um dedo (com inércia) e aproximando ou
 * afastando com dois (pinça, ancorada entre os dedos). As bolhas perto do centro da tela ficam
 * maiores e as das bordas encolhem e somem um pouco, como um mapa que respira.
 */
export function CanvasHobbies({ selecionados, onAlternar, jaTem = [], destaques = [], busca }: Props) {
  const { cores } = useTema();
  const [tela, setTela] = useState<{ w: number; h: number } | null>(null);
  const [desloc] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [escala] = useState(() => new Animated.Value(1));
  const area = useRef<{ measureInWindow: (cb: (x: number, y: number) => void) => void } | null>(null);
  const chaveDestaques = destaques.join(',');
  // Hobbies criados pela pessoa entram no canvas (grupo "Criados por você").
  const criados = useHobbiesPersonalizados().length;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula só quando a lista muda
  const layout = useMemo(() => montarLayout(destaques), [chaveDestaques, criados]);
  const vivo = useRef({ tela, layout, atual: { x: 0, y: 0 }, escala: 1, origem: { x: 0, y: 0 } });
  useEffect(() => {
    const id = desloc.addListener((v) => {
      vivo.current.atual = v;
    });
    const idE = escala.addListener(({ value }) => {
      vivo.current.escala = value;
    });
    return () => {
      desloc.removeListener(id);
      escala.removeListener(idE);
    };
  }, [desloc, escala]);
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
    // Onde a área está na janela: o ponto entre os dedos é medido em coordenadas da janela.
    area.current?.measureInWindow((x, y) => {
      vivo.current.origem = { x, y };
    });
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
    /** Limites do deslocamento: o centro da tela não sai da área das bolhas. */
    const faixa = () => {
      const t = vivo.current.tela ?? { w: 0, h: 0 };
      const { minX, maxX, minY, maxY } = vivo.current.layout.limites;
      return { x0: t.w / 2 - maxX, x1: t.w / 2 - minX, y0: t.h / 2 - maxY, y1: t.h / 2 - minY };
    };
    /** Deslocamento com a borracha nas bordas (durante o gesto). */
    const elastico = (x: number, y: number) => {
      const f = faixa();
      return { x: limitar(x, f.x0, f.x1, ELASTICO), y: limitar(y, f.y0, f.y1, ELASTICO) };
    };
    /** Volta (ou desliza) para `ate`, já dentro dos limites. */
    const prender = (ate = vivo.current.atual) => {
      if (!vivo.current.tela) return;
      const f = faixa();
      const atual = vivo.current.atual;
      const alvo = { x: limitar(ate.x, f.x0, f.x1), y: limitar(ate.y, f.y0, f.y1) };
      if (alvo.x !== atual.x || alvo.y !== atual.y) {
        Animated.spring(desloc, { toValue: alvo, useNativeDriver: nativo, speed: 10, bounciness: 2 }).start();
      }
    };
    /*
     * Gesto: o canvas (deslocado por `desloc`, em unidades do canvas) fica dentro de uma camada
     * que escala em volta do centro da área. Um ponto P do canvas aparece a s · (P + T − C) do
     * centro; para o ponto entre os dedos ficar parado durante a pinça: T = T0 + f/s − f0/s0.
     */
    const g0 = { modo: 'pan' as 'pan' | 'pinca', base: { x: 0, y: 0 }, s0: 1, d0: 1, f0: { x: 0, y: 0 }, p0: { x: 0, y: 0 } };
    const toques = (e: GestureResponderEvent) => e.nativeEvent.touches;
    const focal = (e: GestureResponderEvent) => {
      const [a, b] = toques(e);
      const t = vivo.current.tela ?? { w: 0, h: 0 };
      const o = vivo.current.origem;
      return { x: (a.pageX + b.pageX) / 2 - o.x - t.w / 2, y: (a.pageY + b.pageY) / 2 - o.y - t.h / 2 };
    };
    const distancia = (e: GestureResponderEvent) => {
      const [a, b] = toques(e);
      return Math.max(1, Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY));
    };
    const iniciar = (e: GestureResponderEvent) => {
      g0.base = { ...vivo.current.atual };
      g0.s0 = vivo.current.escala;
      if (toques(e).length >= 2) {
        g0.modo = 'pinca';
        g0.d0 = distancia(e);
        g0.f0 = focal(e);
      } else {
        g0.modo = 'pan';
        const [a] = toques(e);
        g0.p0 = a ? { x: a.pageX, y: a.pageY } : { x: 0, y: 0 };
      }
    };
    const pega = (e: GestureResponderEvent, dx: number, dy: number) => toques(e).length >= 2 || Math.hypot(dx, dy) > 6;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => pega(e, g.dx, g.dy),
      onMoveShouldSetPanResponderCapture: (e, g) => pega(e, g.dx, g.dy),
      onPanResponderGrant: (e) => {
        desloc.stopAnimation();
        escala.stopAnimation();
        iniciar(e);
      },
      onPanResponderMove: (e) => {
        const n = toques(e).length;
        // Um dedo entrou ou saiu: recomeça a conta do ponto onde está, sem pular.
        if ((n >= 2) !== (g0.modo === 'pinca')) iniciar(e);
        if (g0.modo === 'pinca' && n >= 2) {
          const s = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (g0.s0 * distancia(e)) / g0.d0));
          const f = focal(e);
          escala.setValue(s);
          desloc.setValue(elastico(g0.base.x + f.x / s - g0.f0.x / g0.s0, g0.base.y + f.y / s - g0.f0.y / g0.s0));
        } else if (n >= 1) {
          const [a] = toques(e);
          desloc.setValue(elastico(g0.base.x + (a.pageX - g0.p0.x) / g0.s0, g0.base.y + (a.pageY - g0.p0.y) / g0.s0));
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (g0.modo === 'pinca') return prender();
        // Inércia que nunca sai dos limites: projeta onde o arraste pararia e desliza até lá.
        const s = vivo.current.escala;
        const a = vivo.current.atual;
        prender({ x: a.x + (g.vx / s) * INERCIA_MS, y: a.y + (g.vy / s) * INERCIA_MS });
      },
      onPanResponderTerminate: () => prender(),
    });
  });

  const encontrados = busca ? new Set(busca) : null;

  return (
    <View ref={area as never} style={styles.area} onLayout={aoMedir} {...gesto.panHandlers}>
      {tela ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: escala }] }]}>
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
                    Icone={paraBolha[b.h.id]?.Icone ?? icones[b.h.icone][0]}
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
  const rx = tela.w * 1.0;
  const ry = tela.h * 1.0;
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
