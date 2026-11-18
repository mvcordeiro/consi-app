import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { borderWidth, duration, easing, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { CabecalhoSecao } from '../CabecalhoSecao';
import { Texto } from '../Texto';
import { AnelPausa, IconeCumplicidade, IconeHobbies, SetaArrastar } from './assets';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);
const SEGURAR_MS = 2000;

/**
 * Drops para você — o card "Puxe para revelar". Arrastar a aba até o fim troca para
 * "Um instante antes de começar", em que é preciso segurar por 2 s para abrir o drop.
 */
export function Drops({ onAbrirDrop }: { onAbrirDrop: () => void }) {
  const [etapa, setEtapa] = useState<'escondido' | 'pausa'>('escondido');

  const abrir = () => {
    onAbrirDrop();
    setEtapa('escondido');
  };

  return (
    <View style={styles.secao}>
      <CabecalhoSecao titulo="Drops para você" subtitulo="Convites para fazer espaço para o que importa." espacado />
      {etapa === 'escondido' ? (
        <Aparecer key="escondido" deslocamento={0} escalaInicial={0.97} duracao={400}>
          <CardEscondido onRevelar={() => setEtapa('pausa')} />
        </Aparecer>
      ) : (
        <Aparecer key="pausa" deslocamento={0} escalaInicial={0.97} duracao={400}>
          <CardPausa onConcluir={abrir} />
        </Aparecer>
      )}
    </View>
  );
}

/** Card D · Puxe para revelar. */
function CardEscondido({ onRevelar }: { onRevelar: () => void }) {
  const { cores } = useTema();
  return (
    <View style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
      <View style={[styles.iconeDrop, { backgroundColor: cores.action.primary.default }]}>
        <IconeHobbies width={24.01} height={23.66} corTraco={cores.text.primary} />
      </View>
      <Texto estilo="Títulos/Médio" style={styles.centro}>
        Seu próximo drop está escondido.
      </Texto>
      <Texto estilo="Texto/Pequeno" style={styles.centro}>
        Puxe a aba e descubra uma atividade feita para o seu momento.
      </Texto>
      <ArrastarParaRevelar onRevelar={onRevelar} />
    </View>
  );
}

const ALCA = 38;
const RECUO_ESQUERDA = 8;
const RECUO_DIREITA = 14;

/** Drag affordance / reveal — a alça só abre o drop se for arrastada até perto do fim. */
function ArrastarParaRevelar({ onRevelar }: { onRevelar: () => void }) {
  const { cores } = useTema();
  const [x] = useState(() => new Animated.Value(0));
  const [percurso, setPercurso] = useState(0);

  const medir = (e: LayoutChangeEvent) => {
    const p = Math.max(0, e.nativeEvent.layout.width - RECUO_ESQUERDA * 2 - ALCA);
    setPercurso(p);
  };

  const pan = useMemo(() => {
    const voltar = () =>
      Animated.spring(x, { toValue: 0, useNativeDriver: nativo, bounciness: 6 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(g.dx, 0), percurso)),
      onPanResponderRelease: (_, g) => {
        if (percurso > 0 && g.dx >= percurso * 0.85) {
          Animated.timing(x, {
            toValue: percurso,
            duration: duration.fast,
            easing: curva,
            useNativeDriver: nativo,
          }).start(() => onRevelar());
        } else {
          voltar();
        }
      },
      onPanResponderTerminate: voltar,
    });
  }, [x, percurso, onRevelar]);

  const opacidadeRotulo = percurso
    ? x.interpolate({ inputRange: [0, percurso * 0.6], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;

  return (
    <View
      onLayout={medir}
      style={[styles.trilho, { backgroundColor: cores.action.primary.default }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Arraste para revelar"
      accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
      onAccessibilityAction={onRevelar}
    >
      <Animated.View style={[styles.rotuloArrastar, { opacity: opacidadeRotulo }]}>
        <Texto estilo="Texto/Botões e rótulos">Arraste para revelar</Texto>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        hitSlop={12}
        style={[
          styles.alca,
          { backgroundColor: cores.action.primary.pressed, transform: [{ translateX: x }] },
        ]}
      >
        <SetaArrastar width={20} height={20} corTraco={cores.text.primary} />
      </Animated.View>
    </View>
  );
}

/** Card F · "Um instante antes de começar" — segurar por 2 s; soltar cancela. */
function CardPausa({ onConcluir }: { onConcluir: () => void }) {
  const { cores } = useTema();
  const [restante, setRestante] = useState(SEGURAR_MS / 1000);
  const [segurando, setSegurando] = useState(false);
  const [respiro] = useState(() => new Animated.Value(0));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const limpar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => limpar, []);

  const comecar = () => {
    limpar();
    setSegurando(true);
    Animated.timing(respiro, { toValue: 1, duration: SEGURAR_MS, easing: curva, useNativeDriver: nativo }).start();
    for (let s = 1; s < SEGURAR_MS / 1000; s++) {
      timers.current.push(setTimeout(() => setRestante(SEGURAR_MS / 1000 - s), s * 1000));
    }
    timers.current.push(
      setTimeout(() => {
        setRestante(0);
        onConcluir();
      }, SEGURAR_MS),
    );
  };

  const cancelar = () => {
    limpar();
    setSegurando(false);
    setRestante(SEGURAR_MS / 1000);
    Animated.timing(respiro, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }).start();
  };

  return (
    <View style={[styles.cardPausa, { backgroundColor: cores.action.secondary.default }]}>
      <View style={styles.visualPausa}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ scale: respiro.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] },
          ]}
        >
          <AnelPausa width={88} height={88} corTraco={cores.text.primary} />
        </Animated.View>
        <View style={[styles.fundoIconePausa, { backgroundColor: cores.action.secondary.pressed }]}>
          <IconeCumplicidade width={28.02} height={27.58} corTraco={cores.text.primary} />
        </View>
      </View>
      <Texto estilo="Títulos/Médio" style={styles.centro}>
        Um instante antes de começar.
      </Texto>
      <Texto estilo="Legenda/Pequena" style={styles.centro}>
        Solte os ombros. Perceba como você chegou até aqui.
      </Texto>
      <Pressable
        onPressIn={comecar}
        onPressOut={() => segurando && cancelar()}
        accessibilityRole="button"
        accessibilityLabel="Segure por 2 segundos para começar"
        style={[styles.segurar, { backgroundColor: cores.bg['info-subtle'], borderColor: cores.border.subtle }]}
      >
        <View style={[styles.cronometro, { backgroundColor: cores.action.secondary.default }]}>
          <Texto estilo="Legenda/Pequena">{restante}s</Texto>
        </View>
        <Texto estilo="Texto/Botões e rótulos" style={styles.flex}>
          Segure para começar
        </Texto>
      </Pressable>
      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.centro}>
        Solte para cancelar.
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  flex: { flex: 1 },
  card: {
    alignItems: 'center',
    gap: space[16],
    // borda interna no Figma: desconta 1 px do padding
    paddingHorizontal: space[24] - borderWidth.thin,
    paddingVertical: 22 - borderWidth.thin,
    borderRadius: radius.xl,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  iconeDrop: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trilho: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    paddingLeft: RECUO_ESQUERDA,
    paddingRight: RECUO_DIREITA,
    overflow: 'hidden',
  },
  rotuloArrastar: {
    position: 'absolute',
    left: RECUO_ESQUERDA + ALCA + 11,
    right: RECUO_DIREITA,
  },
  alca: {
    width: ALCA,
    height: ALCA,
    borderRadius: ALCA / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPausa: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space[24],
    paddingVertical: 22,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  visualPausa: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  fundoIconePausa: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segurar: {
    alignSelf: 'stretch',
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10 - borderWidth.thin,
    paddingRight: space[12] - borderWidth.thin,
    borderRadius: 27,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  cronometro: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
