import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { radius, space, useTema } from '@/theme';

import { Texto } from '../Texto';

/**
 * Botão "Continuar" das telas do onboarding: pílula de largura total,
 * fundo action/secondary/hover e rótulo text/primary ("Texto/Botões e rótulos").
 * Desabilitado: bg/disabled + text/disabled (regra do Design System).
 */
type Props = Omit<PressableProps, 'children' | 'style'> & { rotulo?: string };

export function BotaoContinuar({ rotulo = 'Continuar', disabled, ...rest }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled
            ? cores.bg.disabled
            : pressed
              ? cores.action.secondary.pressed
              : cores.action.secondary.hover,
        },
      ]}
      {...rest}
    >
      <Texto
        estilo="Texto/Botões e rótulos"
        cor={disabled ? cores.text.disabled : cores.text.primary}
        style={styles.rotulo}
      >
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    paddingHorizontal: space[8],
    paddingVertical: space[16],
    borderRadius: radius.full,
  },
  rotulo: { textAlign: 'center' },
});
