import { useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ImpactoVibracao, vibrarImpacto } from '@/data/haptica';
import { radius, space, useTema } from '@/theme';

import { Texto } from '../../Texto';
import { IconeHobbies } from '../assets';
import { Casca, ICONE_DROP, vibrar, type PropsMecanica } from './comum';

const nativo = Platform.OS !== 'web';
const TOQUES = 5;
const ONDA = 120;

/** Batida cada vez mais forte: a pessoa sente que está chegando perto. */
function batida(n: number) {
  vibrarImpacto(n <= 2 ? ImpactoVibracao.Light : n <= 4 ? ImpactoVibracao.Medium : ImpactoVibracao.Heavy);
}

type Onda = { id: number; x: number; y: number; v: Animated.Value };

/**
 * 4 · Toques para revelar — 5 toques em qualquer lugar do card. Cada toque solta uma onda
 * no ponto tocado, faz o ícone pular e acende um dos pontos; o progresso não volta.
 */
export function Toques({ onRevelar }: PropsMecanica) {
  const { cores } = useTema();
  const [n, setN] = useState(0);
  const [ondas, setOndas] = useState<Onda[]>([]);
  const [pulo] = useState(() => new Animated.Value(0));
  const proxId = useRef(0);
  const fim = useRef(false);

  const tocar = (e: GestureResponderEvent) => {
    if (fim.current) return;
    const novo = n + 1;
    setN(novo);
    batida(novo);

    const onda: Onda = { id: proxId.current++, x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, v: new Animated.Value(0) };
    setOndas((o) => [...o.slice(-3), onda]);
    Animated.timing(onda.v, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: nativo }).start(() =>
      setOndas((o) => o.filter((x) => x.id !== onda.id)),
    );

    // O ícone pula mais alto a cada toque.
    pulo.setValue(0);
    Animated.sequence([
      Animated.timing(pulo, { toValue: novo / TOQUES, duration: 90, useNativeDriver: nativo }),
      Animated.spring(pulo, { toValue: 0, useNativeDriver: nativo, bounciness: 14, speed: 18 }),
    ]).start();

    if (novo >= TOQUES) {
      fim.current = true;
      vibrar('sucesso');
      setTimeout(onRevelar, 380);
    }
  };

  const restantes = TOQUES - n;
  const instrucao =
    n === 0
      ? `Toque ${TOQUES} vezes no card para abrir seu drop.`
      : restantes > 0
        ? `Mais ${restantes} ${restantes === 1 ? 'toque' : 'toques'}…`
        : 'Abrindo…';

  return (
    <Pressable
      onPress={tocar}
      accessibilityRole="button"
      accessibilityLabel={`Toque para revelar o drop. ${restantes} de ${TOQUES} toques restantes`}
      accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
      onAccessibilityAction={onRevelar}
    >
      {({ pressed }) => (
        // box-only: o toque sempre cai no card (e não no texto), para a onda sair do ponto certo.
        <Casca style={{ pointerEvents: 'box-only', transform: [{ scale: pressed ? 0.985 : 1 }] }}>
          {ondas.map((o) => (
            <Animated.View
              key={o.id}
              pointerEvents="none"
              style={[
                styles.onda,
                {
                  left: o.x - ONDA / 2,
                  top: o.y - ONDA / 2,
                  borderColor: cores.border.focus,
                  opacity: o.v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                  transform: [{ scale: o.v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.4] }) }],
                },
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.iconeDrop,
              {
                backgroundColor: cores.action.primary.default,
                transform: [
                  { translateY: pulo.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
                  { scale: pulo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
                  { rotate: pulo.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${n % 2 ? 10 : -10}deg`] }) },
                ],
              },
            ]}
          >
            <IconeHobbies width={24.01} height={23.66} corTraco={cores.text.primary} />
          </Animated.View>
          <Texto estilo="Títulos/Médio" style={styles.centro}>
            Seu próximo drop está escondido.
          </Texto>
          <Texto estilo="Texto/Pequeno" style={styles.centro}>
            {instrucao}
          </Texto>
          <View style={styles.pontos}>
            {Array.from({ length: TOQUES }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.ponto,
                  i < n
                    ? { backgroundColor: cores.action.primary.default, borderColor: cores.action.primary.default }
                    : { borderColor: cores.border.default },
                ]}
              />
            ))}
          </View>
        </Casca>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  iconeDrop: { width: ICONE_DROP, height: ICONE_DROP, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  pontos: { flexDirection: 'row', gap: space[8], paddingVertical: space[8] },
  ponto: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  onda: { position: 'absolute', width: ONDA, height: ONDA, borderRadius: ONDA / 2, borderWidth: 3 },
});
