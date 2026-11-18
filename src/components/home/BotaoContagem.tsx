import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { borderWidth, radius, space, useTema } from '@/theme';

import IconeEscrever from '../../../assets/home/icone-escrever.svg';
import { Texto } from '../Texto';

/** "HOME - BOTÃO DURA 2.5 SEGUNDOS" no Figma. */
export const DURACAO_CONTAGEM = 2500;

/**
 * Ação / Botão com contagem ("Quero explorar essa emoção"): começa cheio (action/primary) e vai
 * esvaziando até a borda (border/focus); o que resta fica em bg/raised, como nos frames do Figma.
 * Tocar chama `onPress`; se o tempo acabar, `onFim`.
 */
export function BotaoContagem({
  inicio,
  duracao = DURACAO_CONTAGEM,
  onPress,
  onFim,
}: {
  /** Atraso (ms) antes de começar a esvaziar. */
  inicio: number;
  duracao?: number;
  onPress: () => void;
  onFim: () => void;
}) {
  const { cores } = useTema();
  const [restante] = useState(() => new Animated.Value(1));
  const [cor] = useState(() => new Animated.Value(0));
  const acabou = useRef(false);

  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(inicio),
      Animated.parallel([
        Animated.timing(cor, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(restante, {
          toValue: 0,
          duration: duracao,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    ]);
    a.start(({ finished }) => {
      if (finished && !acabou.current) {
        acabou.current = true;
        onFim();
      }
    });
    return () => a.stop();
  }, [inicio, duracao, cor, restante, onFim]);

  const tocar = () => {
    if (acabou.current) return;
    acabou.current = true;
    onPress();
  };

  return (
    <Pressable
      onPress={tocar}
      accessibilityRole="button"
      accessibilityLabel="Quero explorar essa emoção"
      accessibilityHint="Disponível por alguns segundos"
      style={[styles.botao, { borderColor: cores.border.focus }]}
    >
      <Animated.View
        style={[
          styles.preenchimento,
          {
            width: restante.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: cor.interpolate({
              inputRange: [0, 1],
              outputRange: [cores.action.primary.default, cores.bg.raised],
            }),
          },
        ]}
      />
      {/* Num View: na web, o preenchimento absoluto seria pintado por cima do SVG. */}
      <View style={styles.conteudo}>
        <IconeEscrever width={23.91} height={23.22} corTraco={cores.icon.primary} />
        <Texto estilo="Texto/Botões e rótulos" cor={cores.icon.primary}>
          Quero explorar essa emoção
        </Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    height: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    paddingHorizontal: space[20],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  preenchimento: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.full },
});
