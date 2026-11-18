import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoContinuar, IconeGrande, TelaOnboarding, useTransicao } from '@/components/onboarding';
import {
  Caixa1,
  Caixa2,
  Caixa3,
  CaixaPareIcone,
  CaixaSinoIcone,
  CaixaSorrisoIcone,
  IconeGrupoApoio,
} from '@/components/onboarding/assets';
import { useOnboarding, type CaixaDeApp } from '@/data/onboarding';
import { duration, easing, primitivas, radius, space, useTema } from '@/theme';

/**
 * E1 · Aplicativos — "Quais apps mais te incomodam?"
 * O usuário arrasta cada app até uma das três caixas. Com o dedo sobre a caixa,
 * ela cresce um pouco; ao soltar dentro, o app "cai" e some.
 * Combinado: com pelo menos 3 apps nas caixas, aparece o Continuar embaixo.
 *
 * Apps de exemplo (combinado): ícones genéricos até termos a lista real do aparelho.
 * Posições dos apps e das caixas seguem o Figma (frame de 412), escalados pela largura.
 */
type App = { id: string; nome: string; icone: string; x: number; y: number };

const MINIMO_APPS = 3;
const nativo = Platform.OS !== 'web';
const TITULO = 'Quais apps mais te incomodam?';
const SUB = 'Pegamos apenas os essenciais, arraste eles para as caixinhas de acordo com seu comportamento.';
const LEGENDA = 'Arraste pelo menos 3 aplicativos. Você pode editar isso depois.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_LEGENDA = fimDoTexto(SUB, T_SUB);
const T_APPS = T_LEGENDA + 200;

const APPS: App[] = [
  { id: 'instagram', nome: 'Instagram', icone: 'instagram', x: 56, y: 14 },
  { id: 'tiktok', nome: 'TikTok', icone: 'tiktok', x: 128, y: 36 },
  { id: 'youtube', nome: 'YouTube', icone: 'youtube', x: 197, y: 80 },
  { id: 'spotify', nome: 'Spotify', icone: 'spotify', x: 278, y: 0 },
  { id: 'whatsapp', nome: 'WhatsApp', icone: 'whatsapp', x: 291, y: 80 },
  { id: 'x', nome: 'X', icone: 'x-twitter', x: 105, y: 119 },
  { id: 'facebook', nome: 'Facebook', icone: 'facebook', x: 268, y: 150 },
  { id: 'pinterest', nome: 'Pinterest', icone: 'pinterest', x: 189, y: 160 },
  { id: 'reddit', nome: 'Reddit', icone: 'reddit', x: 197, y: 0 },
];
const LADO_APP = 62;
const ALTURA_APPS = 222;

type Caixa = {
  id: CaixaDeApp;
  rotulo: string;
  Caixa: FC<SvgProps>;
  Icone: FC<SvgProps>;
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

type Retangulo = { x: number; y: number; w: number; h: number };
type Medivel = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

export default function E1Aplicativos() {
  const { cores } = useTema();
  const transicao = useTransicao();
  const { width } = useWindowDimensions();
  const s = Math.min(width / 412, 1.15);
  const { atualizar } = useOnboarding();

  const [restantes, setRestantes] = useState(APPS.map((a) => a.id));
  const [sobre, setSobre] = useState<CaixaDeApp | null>(null);
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
    setRestantes((atual) => atual.filter((id) => id !== appId));
  };

  // Em telas mais baixas, as posições verticais dos apps se comprimem para caber
  const [alturaLivre, setAlturaLivre] = useState(ALTURA_APPS * s + space[16]);
  const sy = Math.max(0.5, Math.min(s, (alturaLivre - space[16] - LADO_APP * s) / (ALTURA_APPS - LADO_APP)));

  // Combinado: o Continuar aparece depois que pelo menos 3 apps foram para as caixas
  const arrastados = APPS.length - restantes.length;
  const liberado = arrastados >= MINIMO_APPS;
  const botao = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(botao, {
      toValue: liberado ? 1 : 0,
      duration: 600,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: nativo,
    }).start();
  }, [liberado, botao]);

  const seguir = () => {
    atualizar({ apps: { ...classificacao.current } });
    transicao.sair(() => router.push('/onboarding/permissoes'));
  };

  return (
    <TelaOnboarding
      transicao={transicao}
      etapa={4}
      atrasoRodape={0}
      rodape={
        <Animated.View
          pointerEvents={liberado ? 'auto' : 'none'}
          style={{
            opacity: botao,
            transform: [{ translateY: botao.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <BotaoContinuar onPress={seguir} disabled={!liberado} />
        </Animated.View>
      }
    >
      <Aparecer escalaInicial={0.9}>
        <IconeGrande Icone={IconeGrupoApoio} />
      </Aparecer>
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.link} atraso={T_SUB} />
        <Aparecer atraso={T_LEGENDA}>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {LEGENDA}
          </Texto>
        </Aparecer>
      </View>

      <View style={styles.flex} onLayout={(e) => setAlturaLivre(e.nativeEvent.layout.height)}>
        <View style={[styles.areaApps, { width: 412 * s, height: ALTURA_APPS * sy + LADO_APP * s - LADO_APP * sy }]}>
          {APPS.filter((a) => restantes.includes(a.id)).map((a) => (
            <AppArrastavel
              key={a.id}
              app={a}
              s={s}
              sy={sy}
              atraso={T_APPS + APPS.indexOf(a) * 60}
              aoComecar={medirCaixas}
              caixaNoPonto={caixaNoPonto}
              aoPassarSobre={setSobre}
              aoSoltar={(caixa) => soltarNaCaixa(a.id, caixa)}
            />
          ))}
        </View>
      </View>

      <Aparecer
        atraso={T_APPS}
        deslocamento={24}
        style={[styles.areaCaixas, { width: 412 * s, height: ALTURA_CAIXAS * s }]}
      >
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
    </TelaOnboarding>
  );
}

function AppArrastavel({
  app,
  s,
  sy,
  atraso,
  aoComecar,
  caixaNoPonto,
  aoPassarSobre,
  aoSoltar,
}: {
  app: App;
  s: number;
  /** escala vertical das posições (comprime em telas baixas) */
  sy: number;
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
    const a = Animated.spring(entrada, { toValue: 1, delay: atraso, friction: 6, useNativeDriver: false });
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
              Animated.timing(pos, {
                toValue: { x: g.dx, y: g.dy + 24 },
                duration: 380,
                useNativeDriver: false,
              }),
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
          left: app.x * s,
          top: app.y * sy,
          width: LADO_APP * s,
          height: LADO_APP * s,
          zIndex: arrastando ? 10 : 1,
          opacity: entrada.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [...pos.getTranslateTransform(), { scale: Animated.multiply(escala, entrada) }],
        },
      ]}
    >
      <FontAwesome6 name={app.icone as 'instagram'} brand size={30 * s} color={primitivas.neutral[950]} />
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
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(escala, { toValue: destacada ? 1.12 : 1, useNativeDriver: false, speed: 20 }).start();
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
        <c.Caixa />
        <View style={[StyleSheet.absoluteFill, styles.centro, { transform: [{ translateX: c.icone.dx }, { translateY: c.icone.dy }] }]}>
          <c.Icone />
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  cabecalho: { marginTop: space[64], gap: space[12] },
  flex: { flex: 1, justifyContent: 'center' },
  areaApps: { marginHorizontal: -space[32] },
  app: {
    position: 'absolute',
    backgroundColor: primitivas.neutral[100],
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaCaixas: { marginHorizontal: -space[32] },
  centro: { alignItems: 'center', justifyContent: 'center' },
});
