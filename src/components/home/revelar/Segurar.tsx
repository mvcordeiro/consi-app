import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTema } from '@/theme';

import { Texto } from '../../Texto';
import { IconeHobbies } from '../assets';
import { Cabeca, Casca, vibrar, type PropsMecanica } from './comum';

const CirculoAnimado = Animated.createAnimatedComponent(Circle);

/** Tempo segurando até revelar: curto o bastante para não cansar. */
const TEMPO = 1500;
const TAM = 88;
const TRACO = 5;
const RAIO = (TAM - TRACO) / 2;
const VOLTA = 2 * Math.PI * RAIO;

/**
 * 3 · Pressionar e segurar — segurar o botão redondo enche o anel em 1,5 s, com um tique
 * a cada quarto; soltar antes esvazia o anel devagar (o progresso não some de uma vez).
 */
export function Segurar({ onRevelar }: PropsMecanica) {
  const { cores } = useTema();
  const [p] = useState(() => new Animated.Value(0));
  const [segurando, setSegurando] = useState(false);
  const animacao = useRef<Animated.CompositeAnimation | null>(null);
  const valor = useRef(0);
  const quarto = useRef(0);
  const fim = useRef(false);

  useEffect(() => {
    const id = p.addListener(({ value }) => {
      valor.current = value;
      const q = Math.floor(value * 4);
      if (q > quarto.current && q < 4) vibrar();
      quarto.current = q;
    });
    return () => p.removeListener(id);
  }, [p]);

  const comecar = () => {
    if (fim.current) return;
    setSegurando(true);
    vibrar();
    animacao.current?.stop();
    animacao.current = Animated.timing(p, {
      toValue: 1,
      duration: TEMPO * (1 - valor.current),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animacao.current.start(({ finished }) => {
      if (!finished) return;
      fim.current = true;
      setSegurando(false);
      vibrar('sucesso');
      setTimeout(onRevelar, 250);
    });
  };

  const soltar = () => {
    if (fim.current) return;
    setSegurando(false);
    animacao.current?.stop();
    animacao.current = Animated.timing(p, {
      toValue: 0,
      duration: 500 * valor.current,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    animacao.current.start();
  };

  const escala = p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Casca>
      <Cabeca instrucao="Segure o botão até o anel completar para descobrir seu drop." />
      <View style={styles.area}>
        <Pressable
          onPressIn={comecar}
          onPressOut={soltar}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Segure para revelar o drop"
          accessibilityHint="Ou toque duas vezes com o leitor de tela para revelar direto"
          accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
          onAccessibilityAction={onRevelar}
        >
          <Animated.View style={[styles.botao, { transform: [{ scale: escala }] }]}>
            <Svg width={TAM} height={TAM} style={StyleSheet.absoluteFill}>
              <Circle cx={TAM / 2} cy={TAM / 2} r={RAIO} stroke={cores.action.primary.pressed} strokeWidth={TRACO} fill={cores.action.primary.default} />
              <CirculoAnimado
                cx={TAM / 2}
                cy={TAM / 2}
                r={RAIO}
                stroke={cores.text.primary}
                strokeWidth={TRACO}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${VOLTA} ${VOLTA}`}
                strokeDashoffset={p.interpolate({ inputRange: [0, 1], outputRange: [VOLTA, 0] })}
                transform={`rotate(-90 ${TAM / 2} ${TAM / 2})`}
              />
            </Svg>
            <IconeHobbies width={28} height={28} corTraco={cores.text.primary} />
          </Animated.View>
        </Pressable>
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.secondary}>
          {segurando ? 'Continue segurando…' : 'Segure para revelar'}
        </Texto>
      </View>
    </Casca>
  );
}

const styles = StyleSheet.create({
  area: { alignItems: 'center', gap: 12 },
  botao: { width: TAM, height: TAM, alignItems: 'center', justifyContent: 'center' },
});

