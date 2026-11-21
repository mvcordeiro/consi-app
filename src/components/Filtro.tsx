import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { borderWidth, radius, space, useTema } from '@/theme';

import { Texto } from './Texto';

/**
 * Filtro / Etiqueta — componente do Design System (Átomos, nó 173:198), na versão tocável.
 * Como nas instâncias dos Hobbies: inativo tem fundo bg/base e borda border/focus;
 * ativo tem fundo bg/selected e rótulo text/primary.
 */
type Props = {
  rotulo: string;
  ativo?: boolean;
  /** Ícone de 16 px à esquerda; recebe a cor do rótulo. */
  icone?: (cor: string) => ReactNode;
  /** Ícone de 16 px à direita ("Ícone direito" do componente). */
  iconeDireita?: (cor: string) => ReactNode;
  /** Contorno tracejado: etiqueta de ação (ex.: "Sugerir atividade"), não um filtro. */
  tracejado?: boolean;
  onPress?: () => void;
};

export function Filtro({ rotulo, ativo = false, icone, iconeDireita, tracejado = false, onPress }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={rotulo}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: ativo ? cores.bg.selected : cores.bg.base,
          borderColor: ativo ? 'transparent' : cores.border.focus,
          borderStyle: tracejado ? 'dashed' : 'solid',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {icone ? <View style={styles.icone}>{icone(cores.text.primary)}</View> : null}
      <Texto estilo="Texto/Botões e rótulos" style={styles.rotulo} numberOfLines={1}>
        {rotulo}
      </Texto>
      {iconeDireita ? <View style={styles.icone}>{iconeDireita(cores.text.primary)}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    paddingHorizontal: space[12] - borderWidth.thin,
    borderWidth: borderWidth.thin,
    borderRadius: radius.full,
  },
  icone: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  rotulo: { textAlign: 'center' },
});
