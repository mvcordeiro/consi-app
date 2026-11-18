import { Pressable, StyleSheet } from 'react-native';

import { borderWidth, radius, space, useTema } from '@/theme';

import { Texto } from './Texto';

type Props = {
  /** Abreviação do dia da semana (ex.: "SEG"). */
  semana: string;
  dia: number;
  selecionado?: boolean;
  onPress?: () => void;
};

/**
 * Calendário / Dia — célula do seletor de dias. A selecionada usa
 * action/primary/pressed com borda border/focus.
 */
export function DiaCalendario({ semana, dia, selecionado, onPress }: Props) {
  const { cores, modo } = useTema();
  // No Figma o texto do dia selecionado é text/on-primary no Dark e text/on-secondary no Light
  // (os dois brancos); o text/on-primary do Light é escuro.
  const corSelecionado = modo === 'dark' ? cores.text['on-primary'] : cores.text['on-secondary'];
  const cor = selecionado ? corSelecionado : cores.text.accent;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      accessibilityLabel={`${semana} ${dia}`}
      style={[
        styles.base,
        selecionado
          ? {
              backgroundColor: cores.action.primary.pressed,
              borderColor: cores.border.focus,
              borderWidth: borderWidth.thin,
            }
          : { backgroundColor: cores.bg.raised },
      ]}
    >
      <Texto estilo="Legenda/Pequena" cor={cor}>
        {semana}
      </Texto>
      <Texto estilo="Texto/Botões e rótulos" cor={cor}>
        {dia}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    // a borda (transparente quando não selecionado) é interna no Figma
    paddingHorizontal: space[2] - borderWidth.thin,
    paddingVertical: space[8] - borderWidth.thin,
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
    borderColor: 'transparent',
  },
});
