import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duration, easing, inset, radius, size, space, useTema } from '@/theme';

import IconeAjustes from '../../assets/home/icone-ajustes.svg';
import IconeDiario from '../../assets/home/icone-diario.svg';
import IconeHobbies from '../../assets/home/icone-hobbies.svg';
import IconeInicio from '../../assets/home/icone-inicio.svg';
import IconeSocial from '../../assets/home/icone-social.svg';
import { ordemDasAbas, usePreferencias } from '@/data/preferencias';

import { useModoImersivo } from './ModoImersivo';
import type { IconeSvg } from './onboarding/assets';

/** Altura da barra (componente "Top bar" do Figma). */
export const ALTURA_BARRA = 64;
/** Distância entre a barra e a borda de baixo da área segura. */
export const MARGEM_BARRA = space[8];
const PARADA = new Animated.Value(0);

export const iconesDasAbas: Record<string, IconeSvg> = {
  hobbies: IconeHobbies,
  diario: IconeDiario,
  index: IconeInicio,
  social: IconeSocial,
  ajustes: IconeAjustes,
};

/** Espaço que o conteúdo das abas precisa deixar livre embaixo para não ficar atrás da barra. */
export function useEspacoBarra() {
  const { bottom } = useSafeAreaInsets();
  return bottom + MARGEM_BARRA + ALTURA_BARRA;
}

/**
 * Barra de navegação flutuante — componente "Top bar" do Figma, fixa no rodapé.
 * Cinco itens mutuamente exclusivos; o ativo ganha o círculo action/primary/pressed
 * e o ícone em action/primary.
 */
export function BarraNavegacao({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { cores } = useTema();
  const { bottom } = useSafeAreaInsets();
  const { imersivo: imersivoHome, saida: saidaHome } = useModoImersivo();
  // o modo imersivo é da Início: em qualquer outra aba a barra fica sempre no lugar
  const naInicio = state.routes[state.index]?.name === 'index';
  const imersivo = imersivoHome && naInicio;
  const saida = naInicio ? saidaHome : PARADA;
  // A aba em que o app abre fica no meio da barra (Ajustes → Personalizar → Abrir o app em).
  const ordem = ordemDasAbas(usePreferencias().abaInicial);
  const rotas = state.routes
    .map((rota, i) => ({ rota, i }))
    .sort((a, b) => ordem.indexOf(a.rota.name as never) - ordem.indexOf(b.rota.name as never));

  return (
    <Animated.View
      pointerEvents={imersivo ? 'none' : 'box-none'}
      style={[
        styles.posicao,
        {
          bottom: bottom + MARGEM_BARRA,
          // no modo imersivo desce para fora da tela pela parte de baixo, e volta subindo
          transform: [
            {
              translateY: saida.interpolate({
                inputRange: [0, 1],
                outputRange: [0, ALTURA_BARRA + MARGEM_BARRA + bottom + space[16]],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.barra, { backgroundColor: cores.bg.raised }]}>
        {rotas.map(({ rota, i }) => {
          const ativo = state.index === i;
          const { options } = descriptors[rota.key];
          const Icone = iconesDasAbas[rota.name];
          const aoTocar = () => {
            const evento = emitter.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });
            if (!ativo && !evento.defaultPrevented) navigateToTab(rota.key);
          };
          return (
            <Item
              key={rota.key}
              ativo={ativo}
              rotulo={options.title ?? rota.name}
              onPress={aoTocar}
              icone={Icone ? <Icone width={24} height={24} corTraco={ativo ? cores.action.primary.default : cores.action.neutral.default} /> : null}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function Item({
  ativo,
  rotulo,
  icone,
  onPress,
}: {
  ativo: boolean;
  rotulo: string;
  icone: ReactNode;
  onPress: () => void;
}) {
  const { cores } = useTema();
  const [v] = useState(() => new Animated.Value(ativo ? 1 : 0));

  useEffect(() => {
    Animated.timing(v, {
      toValue: ativo ? 1 : 0,
      duration: duration.base,
      easing: Easing.bezier(...easing.standard),
      useNativeDriver: true,
    }).start();
  }, [ativo, v]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={rotulo}
      style={styles.item}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.fundoAtivo,
          {
            backgroundColor: cores.action.primary.pressed,
            opacity: v,
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      />
      {/* Um View por cima do círculo: na web, o fundo posicionado seria pintado sobre o SVG. */}
      <View>{icone}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  posicao: { position: 'absolute', left: space[24], right: space[24] },
  barra: {
    height: ALTURA_BARRA,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: inset.screen,
    paddingVertical: space[8],
    borderRadius: radius.xl,
  },
  item: {
    width: size['touch-target'],
    height: size['touch-target'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundoAtivo: { borderRadius: radius.full },
});
