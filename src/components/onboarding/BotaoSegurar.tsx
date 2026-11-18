import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { radius, space, useTema } from '@/theme';

import { AnelProgresso } from './AnelProgresso';
import { IconeGesto80 } from './assets';

/**
 * Botão de compromisso (tela F2 do Figma): círculo da ação primária do modo com o
 * ícone de gesto de toque. É preciso segurar pelo tempo indicado.
 * Retorno visual (combinado com o Miguel): um anel ao redor se completa enquanto segura.
 */
const DIAMETRO = 80 + space[16] * 2; // ícone 80 + padding space/16
const ANEL = DIAMETRO + space[16];

export function BotaoSegurar({ duracaoMs, onCompleto }: { duracaoMs: number; onCompleto: () => void }) {
  const { cores } = useTema();
  const progresso = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(1)).current;
  const completou = useRef(false);

  const iniciar = () => {
    completou.current = false;
    Animated.timing(escala, { toValue: 0.95, duration: 200, useNativeDriver: false }).start();
    Animated.timing(progresso, {
      toValue: 1,
      duration: duracaoMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        completou.current = true;
        onCompleto();
      }
    });
  };

  const soltar = () => {
    if (completou.current) return;
    progresso.stopAnimation();
    Animated.parallel([
      Animated.timing(progresso, { toValue: 0, duration: 500, useNativeDriver: false }),
      Animated.timing(escala, { toValue: 1, duration: 250, useNativeDriver: false }),
    ]).start();
  };

  return (
    <View style={styles.area}>
      <View style={styles.anel} pointerEvents="none">
        <AnelProgresso progresso={progresso} tamanho={ANEL} espessura={3} corTrilho="transparent" />
      </View>
      <Pressable
        onPressIn={iniciar}
        onPressOut={soltar}
        accessibilityRole="button"
        accessibilityLabel="Aperte e segure para confirmar"
      >
        <Animated.View
          style={[styles.botao, { backgroundColor: cores.action.primary.default, transform: [{ scale: escala }] }]}
        >
          <View style={styles.icone}>
            <IconeGesto80 corTraco={cores.text['on-primary']} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { width: ANEL, height: ANEL, alignItems: 'center', justifyContent: 'center' },
  anel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  botao: { padding: space[16], borderRadius: radius.full },
  icone: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
});
