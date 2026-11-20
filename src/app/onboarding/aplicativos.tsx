import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import {
  Caixa1,
  Caixa2,
  Caixa3,
  CaixaPareIcone,
  CaixaSinoIcone,
  CaixaSorrisoIcone,
  type IconeSvg,
} from '@/components/onboarding/assets';
import { IconeApp } from '@/components/IconeApp';
import { appsParaOnboarding, comAppsDoAparelho, useApps, type AppInfo } from '@/data/apps';
import { appsQueIncomodam, definirAcompanhados } from '@/data/gruposHome';
import { useOnboarding, type CaixaDeApp } from '@/data/onboarding';
import { easing, gap, primitivas, radius, space, useCoresSvg, useTema } from '@/theme';

/**
 * E1 · Aplicativos — "Quais apps mais te incomodam?"
 * O usuário arrasta cada app até uma das três caixas. Com o dedo sobre a caixa,
 * ela cresce um pouco; ao soltar dentro, o app "cai" e some.
 * Combinado:
 *  - os apps ficam espalhados pela área livre (não amontoados);
 *  - as caixas começam lá embaixo e sobem quando o Continuar aparece (≥ 3 apps).
 * Apps de exemplo até termos a lista real do aparelho.
 */
const MINIMO_APPS = 3;
const nativo = Platform.OS !== 'web';
const TITULO = 'Quais apps mais te incomodam?';
// combinado: a antiga legenda entra no subtítulo (só título + subtítulo)
const SUB =
  'Pegamos apenas os essenciais, arraste eles para as caixinhas de acordo com seu comportamento. ' +
  'Arraste pelo menos 3 aplicativos. Você pode editar isso depois.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_APPS = fimDoTexto(SUB, T_SUB) + 200;

/**
 * Posição de cada app como fração da área livre (0 = topo/esquerda, 1 = base/direita),
 * numa grade 3 × 3 "bagunçada" e com um leve giro, para parecerem soltos.
 * Os apps vêm do aparelho no APK Android (os que costumam prender, ver appsParaOnboarding)
 * e são os de exemplo no navegador.
 */
const POSICOES = [
  { fx: 0.04, fy: 0.06, giro: -6 },
  { fx: 0.5, fy: 0.0, giro: 4 },
  { fx: 0.96, fy: 0.1, giro: -3 },
  { fx: 0.2, fy: 0.5, giro: 5 },
  { fx: 0.58, fy: 0.44, giro: -5 },
  { fx: 0.92, fy: 0.58, giro: 3 },
  { fx: 0.02, fy: 0.96, giro: 4 },
  { fx: 0.4, fy: 1.0, giro: -4 },
  { fx: 0.78, fy: 0.94, giro: 6 },
];
type App = AppInfo & (typeof POSICOES)[number];
const LADO_APP = 62;

type Caixa = {
  id: CaixaDeApp;
  rotulo: string;
  Caixa: IconeSvg;
  Icone: IconeSvg;
  /** centro da caixa no frame do Figma (y relativo ao topo da área das caixas, 770) */
  cx: number;
  cy: number;
  giro: number;
  /** centro do ícone relativo ao centro da caixa */
  icone: { dx: number; dy: number };
  rotuloPos: { x: number; y: number; giro: number };
};

const TOPO_CAIXAS = 770;
const CAIXAS: Caixa[] = [
  {
    id: 'me-perco',
    rotulo: 'Me perco no tempo',
    Caixa: Caixa1,
    Icone: CaixaSinoIcone,
    cx: 68.85,
    cy: 851.45 - TOPO_CAIXAS,
    giro: -8.34,
    icone: { dx: -3.2, dy: 8.3 },
    rotuloPos: { x: 5.73, y: 770.5 - TOPO_CAIXAS, giro: -10.52 },
  },
  {
    id: 'automatico',
    rotulo: 'Abro no automático',
    Caixa: Caixa2,
    Icone: CaixaPareIcone,
    cx: 205.84,
    cy: 839.63 - TOPO_CAIXAS,
    giro: 4.01,
    icone: { dx: -1.9, dy: 9.2 },
    rotuloPos: { x: 151, y: 0, giro: 0 },
  },
  {
    id: 'nao-incomoda',
    rotulo: 'Não me incomoda',
    Caixa: Caixa3,
    Icone: CaixaSorrisoIcone,
    cx: 340.79,
    cy: 855.25 - TOPO_CAIXAS,
    giro: 13.1,
    icone: { dx: -1.5, dy: 7.6 },
    rotuloPos: { x: 302.05, y: 779.6 - TOPO_CAIXAS, giro: 8.59 },
  },
];
const ALTURA_CAIXAS = 147;
/** Altura do botão Continuar (padding 16 + rótulo 20 + padding 16). */
const ALTURA_BOTAO = 52;

type Retangulo = { x: number; y: number; w: number; h: number };
type Medivel = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

export default function E1Aplicativos() {
  const { cores } = useTema();
  const transicao = useTransicao();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = Math.min(width / 412, 1.15);
  const { atualizar } = useOnboarding();

  const todos = useApps();
  const APPS = useMemo<App[]>(
    () => appsParaOnboarding(todos, POSICOES.length).map((a, i) => ({ ...a, ...POSICOES[i] })),
    [todos],
  );
  const carregou = !comAppsDoAparelho || todos.length > 0;
  const [soltos, setSoltos] = useState<string[]>([]);
  const [sobre, setSobre] = useState<CaixaDeApp | null>(null);
  const [areaApps, setAreaApps] = useState({ w: 0, h: 0 });
  const classificacao = useRef<Record<string, CaixaDeApp>>({});
  const retangulos = useRef<Partial<Record<CaixaDeApp, Retangulo>>>({});
  const refsCaixas = useRef<Partial<Record<CaixaDeApp, Medivel | null>>>({});

  const medirCaixas = () => {
    CAIXAS.forEach((c) =>
      refsCaixas.current[c.id]?.measureInWindow((x, y, w, h) => {
        retangulos.current[c.id] = { x, y, w, h };
      }),
    );
  };

  const caixaNoPonto = (px: number, py: number): CaixaDeApp | null => {
    const folga = 16;
    for (const c of CAIXAS) {
      const r = retangulos.current[c.id];
      if (r && px >= r.x - folga && px <= r.x + r.w + folga && py >= r.y - folga && py <= r.y + r.h + folga) {
        return c.id;
      }
    }
    return null;
  };

  const soltarNaCaixa = (appId: string, caixa: CaixaDeApp) => {
    classificacao.current[appId] = caixa;
    setSoltos((atual) => [...atual, appId]);
  };

  // Continuar aparece com ≥ 3 apps; as caixas sobem para dar lugar a ele
  // (com menos de 3 apps no aparelho, vale o que houver)
  const liberado = carregou && soltos.length >= Math.min(MINIMO_APPS, APPS.length);
  const botao = useRef(new Animated.Value(0)).current;
  const fundo = Math.max(insets.bottom, space[16]);
  // quanto as caixas ficam abaixo da posição final enquanto não há botão
  const descida = ALTURA_BOTAO + gap.default + fundo;

  useEffect(() => {
    Animated.timing(botao, {
      toValue: liberado ? 1 : 0,
      duration: 700,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: nativo,
    }).start();
  }, [liberado, botao]);

  const seguir = () => {
    atualizar({ apps: { ...classificacao.current } });
    // Os apps que incomodam passam a ser acompanhados (entram no Livre, que pausa).
    definirAcompanhados(appsQueIncomodam(classificacao.current));
    transicao.sair(() => router.push('/onboarding/permissoes'));
  };

  const lado = Math.min(LADO_APP * s, areaApps.h / 3.2 || LADO_APP);

  return (
    <TelaOnboarding transicao={transicao}>
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.link} atraso={T_SUB} />
      </View>

      <View
        style={styles.areaApps}
        onLayout={(e) => setAreaApps({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {areaApps.h > 0
          ? APPS.filter((a) => !soltos.includes(a.id)).map((a) => (
              <AppArrastavel
                key={a.id}
                app={a}
                lado={lado}
                left={a.fx * (areaApps.w - lado)}
                top={a.fy * (areaApps.h - lado)}
                atraso={T_APPS + APPS.indexOf(a) * 70}
                aoComecar={medirCaixas}
                caixaNoPonto={caixaNoPonto}
                aoPassarSobre={setSobre}
                aoSoltar={(caixa) => soltarNaCaixa(a.id, caixa)}
              />
            ))
          : null}
      </View>

      <View style={{ height: ALTURA_CAIXAS * s + gap.default + ALTURA_BOTAO + fundo }}>
        <Animated.View
          style={{
            transform: [{ translateY: botao.interpolate({ inputRange: [0, 1], outputRange: [descida, 0] }) }],
          }}
        >
          <Aparecer atraso={T_APPS} deslocamento={24} style={[styles.areaCaixas, { width: 412 * s, height: ALTURA_CAIXAS * s }]}>
            {CAIXAS.map((c) => (
              <CaixaAlvo
                key={c.id}
                caixa={c}
                s={s}
                destacada={sobre === c.id}
                corRotulo={cores.text.link}
                refCaixa={(v) => {
                  refsCaixas.current[c.id] = v;
                }}
              />
            ))}
          </Aparecer>
        </Animated.View>
        <Animated.View
          pointerEvents={liberado ? 'auto' : 'none'}
          style={{
            marginTop: gap.default,
            opacity: botao,
            transform: [{ translateY: botao.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <BotaoContinuar onPress={seguir} disabled={!liberado} />
        </Animated.View>
      </View>
    </TelaOnboarding>
  );
}

function AppArrastavel({
  app,
  lado,
  left,
  top,
  atraso,
  aoComecar,
  caixaNoPonto,
  aoPassarSobre,
  aoSoltar,
}: {
  app: App;
  lado: number;
  left: number;
  top: number;
  atraso: number;
  aoComecar: () => void;
  caixaNoPonto: (x: number, y: number) => CaixaDeApp | null;
  aoPassarSobre: (c: CaixaDeApp | null) => void;
  aoSoltar: (c: CaixaDeApp) => void;
}) {
  const pos = useRef(new Animated.ValueXY()).current;
  const escala = useRef(new Animated.Value(1)).current;
  const entrada = useRef(new Animated.Value(0)).current;
  const [arrastando, setArrastando] = useState(false);

  // entra com um pequeno "pop"
  useEffect(() => {
    const a = Animated.spring(entrada, { toValue: 1, delay: atraso, friction: 7, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [atraso, entrada]);

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          aoComecar();
          setArrastando(true);
          Animated.spring(escala, { toValue: 1.1, useNativeDriver: false }).start();
        },
        onPanResponderMove: (_, g) => {
          pos.setValue({ x: g.dx, y: g.dy });
          aoPassarSobre(caixaNoPonto(g.moveX, g.moveY));
        },
        onPanResponderRelease: (_, g) => {
          const caixa = caixaNoPonto(g.moveX, g.moveY);
          aoPassarSobre(null);
          if (caixa) {
            // cai dentro da caixa: encolhe e some
            Animated.parallel([
              Animated.timing(escala, { toValue: 0, duration: 380, useNativeDriver: false }),
              Animated.timing(pos, { toValue: { x: g.dx, y: g.dy + 24 }, duration: 380, useNativeDriver: false }),
            ]).start(() => aoSoltar(caixa));
          } else {
            setArrastando(false);
            Animated.parallel([
              Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
              Animated.spring(escala, { toValue: 1, useNativeDriver: false }),
            ]).start();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Animated.View
      {...gesto.panHandlers}
      accessibilityLabel={`${app.nome}, arraste até uma caixa`}
      style={[
        styles.app,
        {
          left,
          top,
          width: lado,
          height: lado,
          zIndex: arrastando ? 10 : 1,
          opacity: entrada.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [
            ...pos.getTranslateTransform(),
            { rotate: arrastando ? '0deg' : `${app.giro}deg` },
            { scale: Animated.multiply(escala, entrada) },
          ],
        },
      ]}
    >
      <IconeApp app={app} lado={lado} proporcaoMarca={0.48} style={styles.iconeApp} />
    </Animated.View>
  );
}

function CaixaAlvo({
  caixa: c,
  s,
  destacada,
  corRotulo,
  refCaixa,
}: {
  caixa: Caixa;
  s: number;
  destacada: boolean;
  corRotulo: string;
  refCaixa: (v: Medivel | null) => void;
}) {
  const coresSvg = useCoresSvg();
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(escala, { toValue: destacada ? 1.12 : 1, useNativeDriver: false, speed: 14 }).start();
  }, [destacada, escala]);

  const L = 114.47;
  const A = 99.49;

  return (
    <>
      <Texto
        estilo="Legenda/Pequena"
        cor={corRotulo}
        style={{
          position: 'absolute',
          left: c.rotuloPos.x * s,
          top: c.rotuloPos.y * s,
          transform: [{ rotate: `${c.rotuloPos.giro}deg` }],
        }}
      >
        {c.rotulo}
      </Texto>
      <Animated.View
        ref={refCaixa as never}
        collapsable={false}
        style={{
          position: 'absolute',
          left: c.cx * s - L / 2,
          top: c.cy * s - A / 2,
          width: L,
          height: A,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: Animated.multiply(escala, s) }, { rotate: `${c.giro}deg` }],
        }}
      >
        <c.Caixa {...coresSvg} />
        <View
          style={[
            styles.icone,
            { transform: [{ translateX: c.icone.dx }, { translateY: c.icone.dy }] },
          ]}
        >
          <c.Icone {...coresSvg} />
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  cabecalho: { gap: gap.default },
  centro: { textAlign: 'center' },
  // área livre entre o texto e as caixas, com respiro em cima e embaixo
  areaApps: { flex: 1, marginTop: space[32], marginBottom: gap.section + space[8] },
  app: {
    position: 'absolute',
    backgroundColor: primitivas.neutral[100],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeApp: { backgroundColor: primitivas.neutral[100], borderRadius: radius.md },
  areaCaixas: { alignSelf: 'center' },
  icone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
