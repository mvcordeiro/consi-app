import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { radius, spaceFixo as space, useTema } from '@/theme';

import { Texto } from '../Texto';

/**
 * Botão "Continuar" do onboarding: pílula de largura total com a ação primária
 * do modo (azul no Dark, laranja no Light) e rótulo text/on-primary.
 * Pressionado: action/primary/pressed. Desabilitado: bg/disabled + text/disabled.
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
              ? cores.action.primary.pressed
              : cores.action.primary.default,
        },
      ]}
      {...rest}
    >
      <Texto
        estilo="Texto/Botões e rótulos"
        cor={disabled ? cores.text.disabled : cores.text['on-primary']}
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
