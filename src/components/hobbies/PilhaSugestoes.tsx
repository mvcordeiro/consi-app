import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View } from 'react-native';

import type { Atividade as Sugestao } from '@/data/catalogo';
import { borderWidth, easing, radius, space, useTema } from '@/theme';

import { vibrar } from './Arraste';
import { naCaixa, RostoMalHumorado44, RostoPositivo44, tamanhos } from './assets';
import { ALTURA_CARD_SUGESTAO, CardSugestao } from './CardSugestao';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

const H = ALTURA_CARD_SUGESTAO;
/** Quanto arrastar (px) para decidir. No Figma, o card a -5° está ~91 px para o lado. */
const LIMIAR = 96;
const GIRO_MAX = 5;
/** Arrastar para cima (px) para mandar o card para o fundo da pilha. */
const LIMIAR_CIMA = 72;
const DURACAO_SAIDA = 460;
/** As cartas de trás: 366 e 348 px de largura (de 386), descendo 20 e 32 px abaixo da da frente. */
const S1 = 366 / 386;
const S2 = 348 / 386;
/** Aba lateral de feedback (Figma 574:3689): 16 + 44 + 16 de largura, 40 + 44 + 40 de altura. */
const ABA_L = 76;
const ABA_A = 124;
/** No Figma a aba fica 121 px abaixo do topo do card. */
const ABA_TOPO = 121;

export type Decisao = 'aceitar' | 'ignorar';

type Props = {
  sugestoes: Sugestao[];
  totalComentarios: (id: string) => number;
  onDecidir: (s: Sugestao, d: Decisao) => void;
  /** Arrastar para cima: o card vai para o fundo da pilha, como num baralho. */
  onPassar?: (s: Sugestao) => void;
  onConversa: (s: Sugestao) => void;
  onMais: (s: Sugestao) => void;
  /** Avisa enquanto um card está sendo arrastado (para travar a rolagem da página). */
  onArrastando?: (a: boolean) => void;
  /** Margem lateral da página: a pilha "sangra" até a borda para as abas de feedback. */
  margem: number;
  /** Mostrado quando não há mais sugestões. */
  vazio: ReactNode;
};

/**
 * Pilha de "Para você" com a interação da seção 671:5840 do Figma:
 * arrastar para a esquerda inclina o card -5°, acende a borda feedback/error e mostra a aba
 * do rosto mal-humorado; para a direita, +5°, feedback/success e o rosto positivo.
 * Ao soltar depois do limite, o card volta ao centro subindo para trás da pilha e some,
 * enquanto o de trás vem para a frente (5ª tela). Os botões do card fazem o mesmo gesto.
 * Arrastar para cima (sem design no Figma) manda o card para o fundo da pilha, como cartas:
 * ele sobe um pouco, passa para trás das outras e o de trás vem para a frente.
 */
export function PilhaSugestoes({
  sugestoes,
  totalComentarios,
  onDecidir,
  onPassar,
  onConversa,
  onMais,
  onArrastando,
  margem,
  vazio,
}: Props) {
  const { cores } = useTema();
  const [pan] = useState(() => new Animated.Value(0));
  const [panY] = useState(() => new Animated.Value(0));
  const [saindo, setSaindo] = useState<string | null>(null);
  const frente = sugestoes[0];

  // Valores atuais para o PanResponder (criado uma vez), atualizados depois de cada render.
  const vivoRef = useRef({
    frente: undefined as Sugestao | undefined,
    saindo: null as string | null,
    onDecidir,
    onArrastando,
    decidir: (_d: Decisao) => {},
    passar: () => {},
  });

  const decidir = (d: Decisao) => {
    const vivo = vivoRef.current;
    const s = vivo.frente;
    if (!s || vivo.saindo) return;
    vivo.saindo = s.id;
    setSaindo(s.id);
    vibrar(d === 'aceitar' ? 'sucesso' : 'toque');
    Animated.timing(pan, { toValue: 0, duration: DURACAO_SAIDA, easing: curva, useNativeDriver: nativo }).start(() => {
      // Remover o card e limpar "saindo" no mesmo render: as outras cartas já estão no lugar.
      vivo.onDecidir(s, d);
      setSaindo(null);
    });
  };

  /** Para cima: sobe mais um pouco e vai para o fundo da pilha (a Camada anima até lá). */
  const passar = () => {
    const vivo = vivoRef.current;
    const s = vivo.frente;
    if (!s || vivo.saindo || !onPassar || sugestoes.length < 2) {
      Animated.spring(panY, { toValue: 0, useNativeDriver: nativo, speed: 14, bounciness: 8 }).start();
      return;
    }
    vibrar('toque');
    Animated.timing(panY, { toValue: -H * 0.3, duration: 160, easing: curva, useNativeDriver: nativo }).start(() => {
      onPassar(s);
      Animated.timing(panY, { toValue: 0, duration: DURACAO_SAIDA, easing: curva, useNativeDriver: nativo }).start();
    });
  };

  useLayoutEffect(() => {
    const vivo = vivoRef.current;
    vivo.frente = frente;
    vivo.saindo = saindo;
    vivo.onDecidir = onDecidir;
    vivo.onArrastando = onArrastando;
    vivo.decidir = decidir;
    vivo.passar = passar;
  });

  /** Botões do card: primeiro inclina para o lado (mostra o feedback), depois decide. */
  const decidirPorBotao = (d: Decisao) => {
    const vivo = vivoRef.current;
    if (vivo.saindo) return;
    Animated.timing(pan, {
      toValue: d === 'aceitar' ? LIMIAR * 1.1 : -LIMIAR * 1.1,
      duration: 240,
      easing: curva,
      useNativeDriver: nativo,
    }).start(() => vivo.decidir(d));
  };

  // O PanResponder só lê vivoRef nos próprios eventos (fora do render).
  // eslint-disable-next-line react-hooks/refs
  const [gesto] = useState(() => {
    const vivo = vivoRef.current;
    const limite = { passou: false };
    const eixo = { atual: 'x' as 'x' | 'y' };
    const horizontal = (dx: number, dy: number) => Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2;
    const paraCima = (dx: number, dy: number) => dy < -10 && Math.abs(dy) > Math.abs(dx) * 1.4;
    const pega = (dx: number, dy: number) => !vivo.saindo && (horizontal(dx, dy) || paraCima(dx, dy));
    const soltarCima = (dy: number, vy: number) => {
      vivo.onArrastando?.(false);
      if (dy < -LIMIAR_CIMA || (vy < -0.6 && dy < -32)) vivo.passar();
      else Animated.spring(panY, { toValue: 0, useNativeDriver: nativo, speed: 14, bounciness: 8 }).start();
    };
    const soltar = (dx: number, vx: number) => {
      vivo.onArrastando?.(false);
      limite.passou = false;
      if (dx > LIMIAR || (vx > 0.6 && dx > 32)) vivo.decidir('aceitar');
      else if (dx < -LIMIAR || (vx < -0.6 && dx < -32)) vivo.decidir('ignorar');
      else Animated.spring(pan, { toValue: 0, useNativeDriver: nativo, speed: 14, bounciness: 8 }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => pega(g.dx, g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => pega(g.dx, g.dy),
      onPanResponderGrant: (_, g) => {
        eixo.atual = horizontal(g.dx, g.dy) ? 'x' : 'y';
        vivo.onArrastando?.(true);
      },
      onPanResponderMove: (_, g) => {
        if (eixo.atual === 'y') {
          panY.setValue(Math.min(0, g.dy));
          return;
        }
        pan.setValue(g.dx);
        const passou = Math.abs(g.dx) > LIMIAR;
        if (passou !== limite.passou) {
          limite.passou = passou;
          if (passou) vibrar('limite');
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => (eixo.atual === 'y' ? soltarCima(g.dy, g.vy) : soltar(g.dx, g.vx)),
      onPanResponderTerminate: () => (eixo.atual === 'y' ? soltarCima(0, 0) : soltar(0, 0)),
    });
  });

  if (!frente) {
    return (
      <View style={[styles.pilha, { marginHorizontal: -margem, paddingHorizontal: margem }]}>
        {vazio}
      </View>
    );
  }

  // Durante a saída, a quarta carta entra no fundo e as outras sobem uma posição.
  const visiveis = sugestoes.slice(0, saindo ? 4 : 3);

  const progressoEsq = pan.interpolate({ inputRange: [-LIMIAR, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const progressoDir = pan.interpolate({ inputRange: [0, LIMIAR], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={[styles.pilha, { marginHorizontal: -margem }]}>
      {visiveis
        .map((s, i) => {
          const eFrente = i === 0;
          const alvo = saindo ? (eFrente ? -1 : i - 1) : i;
          return (
            <Camada
              key={s.id}
              alvo={alvo}
              margem={margem}
              zIndex={eFrente && saindo ? 0 : 10 - i}
              pan={eFrente ? pan : null}
              panY={eFrente ? panY : null}
              handlers={eFrente && !saindo ? gesto.panHandlers : undefined}
              bordas={
                eFrente ? (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.borda, { borderColor: cores.feedback.error, opacity: progressoEsq }]}
                    />
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.borda, { borderColor: cores.feedback.success, opacity: progressoDir }]}
                    />
                  </>
                ) : null
              }
            >
              <CardSugestao
                sugestao={s}
                totalComentarios={totalComentarios(s.id)}
                onIgnorar={() => decidirPorBotao('ignorar')}
                onAceitar={() => decidirPorBotao('aceitar')}
                onConversa={() => onConversa(s)}
                onMais={() => onMais(s)}
              />
            </Camada>
          );
        })
        .reverse()}

      {/* Abas de feedback nas bordas da tela */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.aba,
          styles.abaEsq,
          {
            backgroundColor: cores.feedback.error,
            opacity: progressoEsq,
            transform: [{ translateX: progressoEsq.interpolate({ inputRange: [0, 1], outputRange: [-ABA_L, 0] }) }],
          },
        ]}
      >
        <RostoMalHumorado44 {...naCaixa(tamanhos.rostoMalHumorado44, 44)} corErroSuave={cores.bg['error-subtle']} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.aba,
          styles.abaDir,
          {
            backgroundColor: cores.feedback.success,
            opacity: progressoDir,
            transform: [{ translateX: progressoDir.interpolate({ inputRange: [0, 1], outputRange: [ABA_L, 0] }) }],
          },
        ]}
      >
        <RostoPositivo44 {...naCaixa(tamanhos.rostoPositivo44, 44)} corSucessoSuave={cores.bg['success-subtle']} />
      </Animated.View>
    </View>
  );
}

/**
 * Uma carta da pilha. A posição é um número animado: 0 = frente, 1 e 2 = cartas de trás
 * (só o fundo, a 50 % e 30 %), -1 = saindo (sobe 92 px atrás da pilha, em 348 px de largura, e some).
 */
function Camada({
  alvo,
  margem,
  zIndex,
  pan,
  panY,
  handlers,
  bordas,
  children,
}: {
  alvo: number;
  margem: number;
  zIndex: number;
  pan: Animated.Value | null;
  panY?: Animated.Value | null;
  handlers?: object;
  bordas: ReactNode;
  children: ReactNode;
}) {
  const { cores } = useTema();
  // Uma carta nova entra pelo fundo (posição 3, invisível) e sobe até o alvo.
  const [pos] = useState(() => new Animated.Value(alvo >= 2 ? 3 : alvo));

  useEffect(() => {
    Animated.timing(pos, { toValue: alvo, duration: DURACAO_SAIDA, easing: curva, useNativeDriver: nativo }).start();
  }, [alvo, pos]);

  // Deslocamento vertical para a base da carta escalada ficar 20 / 32 px abaixo da da frente,
  // e para o topo da que sai ficar 92 px acima.
  const desce = (s: number, base: number) => base + (H / 2) * (1 - s);
  const translateY = pos.interpolate({
    inputRange: [-1, 0, 1, 2, 3],
    outputRange: [-92 - (H / 2) * (1 - S2), 0, desce(S1, 20), desce(S2, 32), desce(S2, 32)],
  });
  const scale = pos.interpolate({ inputRange: [-1, 0, 1, 2, 3], outputRange: [S2, 1, S1, S2, S2] });
  const opacity = pos.interpolate({
    inputRange: [-1, -0.5, 0, 1, 2, 3],
    outputRange: [0, 0.5, 1, 0.5, 0.3, 0],
  });
  const conteudo = pos.interpolate({ inputRange: [-1, 0, 0.5, 1], outputRange: [1, 1, 0, 0], extrapolate: 'clamp' });

  const giro = pan
    ? pan.interpolate({
        inputRange: [-LIMIAR, 0, LIMIAR],
        outputRange: [`-${GIRO_MAX}deg`, '0deg', `${GIRO_MAX}deg`],
      })
    : '0deg';

  return (
    <Animated.View
      {...handlers}
      style={[
        styles.camada,
        {
          left: margem,
          right: margem,
          zIndex,
          backgroundColor: cores.bg.raised,
          opacity,
          transform: [
            { translateX: pan ?? 0 },
            { translateY: panY ? Animated.add(translateY, panY) : translateY },
            { rotate: giro },
            { scale },
          ],
        },
      ]}
    >
      <Animated.View style={{ opacity: conteudo }} pointerEvents={alvo === 0 ? 'auto' : 'none'}>
        {children}
      </Animated.View>
      {bordas}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // a altura reserva também os 32 px da última carta de trás
  pilha: { height: H + 32 },
  camada: { position: 'absolute', top: 0, height: H, borderRadius: radius.card },
  borda: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card, borderWidth: borderWidth.thin },
  aba: {
    position: 'absolute',
    top: ABA_TOPO,
    width: ABA_L,
    height: ABA_A,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[16],
  },
  abaEsq: { left: 0, borderTopRightRadius: radius.lg, borderBottomRightRadius: radius.lg },
  abaDir: { right: 0, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
});
