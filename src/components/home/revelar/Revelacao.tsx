import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import type { HobbyId } from '@/data/catalogo';
import { radius, tempo, useTema } from '@/theme';

import { IconeHobby } from '../../hobbies/IconeHobby';
import { Texto } from '../../Texto';
import { IconeHobbies } from '../assets';
import { Casca, ICONE_DROP, vibrar } from './comum';

const nativo = Platform.OS !== 'web';

/** Duração da animação de revelação, entre o fim da interação e o card da atividade. */
export const DURACAO_REVELACAO = tempo.revelacaoDrop;

const FAISCAS = 10;

/**
 * Revelação — a mesma para todas as mecânicas: o ícone do hobby do drop "estoura" para
 * fora do card, com duas ondas e faíscas, e então o card da atividade entra.
 * Com "reduzir movimento", só um fade curto.
 */
export function Revelacao({
  hobby,
  movimentoReduzido,
  onFim,
}: {
  hobby: HobbyId | null;
  movimentoReduzido: boolean;
  onFim: () => void;
}) {
  const { cores } = useTema();
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    vibrar('limite');
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: movimentoReduzido ? 300 : DURACAO_REVELACAO,
      easing: Easing.linear,
      useNativeDriver: nativo,
    });
    anim.start(({ finished }) => finished && onFim());
    return () => anim.stop();
    // onFim muda a cada render do Drops; a animação só começa uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, movimentoReduzido]);

  const icone = {
    transform: [
      // Começa no tamanho do convite das coberturas (Convite): sem pulo na troca.
      { scale: t.interpolate({ inputRange: [0, 0.25, 0.45, 0.85, 1], outputRange: [1, 1.25, 1, 1, 0.92] }) },
      { rotate: t.interpolate({ inputRange: [0, 0.12, 0.25, 0.45], outputRange: ['0deg', '-10deg', '8deg', '0deg'], extrapolate: 'clamp' }) },
    ],
  };
  const onda = (atraso: number) => ({
    opacity: t.interpolate({ inputRange: [atraso, atraso + 0.05, atraso + 0.5], outputRange: [0, 0.7, 0], extrapolate: 'clamp' }),
    transform: [
      { scale: t.interpolate({ inputRange: [atraso, atraso + 0.5], outputRange: [0.4, 2.6], extrapolate: 'clamp' }) },
    ],
  });
  // O card inteiro cresce um pouco e some no fim, abrindo espaço para o card da atividade.
  const card = {
    opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
    transform: [{ scale: t.interpolate({ inputRange: [0, 0.25, 0.8, 1], outputRange: [1, 1.02, 1, 0.97] }) }],
  };

  return (
    <Animated.View style={card} accessibilityLiveRegion="polite" accessibilityLabel="Revelando seu drop">
      <Casca style={styles.casca}>
        {/* Ondas e faíscas saem do ícone. */}
        <View style={styles.areaIcone}>
        {movimentoReduzido ? null : (
          <View style={styles.centro} pointerEvents="none">
            {[0.1, 0.28].map((a) => (
              <Animated.View key={a} style={[styles.onda, { borderColor: cores.action.primary.default }, onda(a)]} />
            ))}
            {Array.from({ length: FAISCAS }, (_, i) => {
              const ang = (i / FAISCAS) * Math.PI * 2;
              const d = 70 + (i % 3) * 18;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.faisca,
                    {
                      backgroundColor: i % 2 ? cores.action.primary.default : cores.border.focus,
                      opacity: t.interpolate({ inputRange: [0.12, 0.2, 0.7], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                      transform: [
                        { translateX: t.interpolate({ inputRange: [0.12, 0.7], outputRange: [0, Math.cos(ang) * d], extrapolate: 'clamp' }) },
                        { translateY: t.interpolate({ inputRange: [0.12, 0.7], outputRange: [0, Math.sin(ang) * d], extrapolate: 'clamp' }) },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
        <Animated.View style={[styles.icone, { backgroundColor: cores.action.primary.default }, icone]}>
          {hobby ? (
            <IconeHobby hobby={hobby} caixa={28} cor={cores.text.primary} />
          ) : (
            <IconeHobbies width={28} height={28} corTraco={cores.text.primary} />
          )}
        </Animated.View>
        </View>
        <Texto estilo="Títulos/Médio" style={styles.texto}>
          Seu drop chegou!
        </Texto>
      </Casca>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  casca: { minHeight: 236, justifyContent: 'center' },
  areaIcone: { alignItems: 'center', justifyContent: 'center' },
  centro: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  onda: { position: 'absolute', width: ICONE_DROP + 12, height: ICONE_DROP + 12, borderRadius: radius.xl, borderWidth: 3 },
  faisca: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  icone: {
    width: ICONE_DROP + 12,
    height: ICONE_DROP + 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { textAlign: 'center', alignSelf: 'stretch' },
});
