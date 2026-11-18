import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, useTema, type Cores } from '@/theme';

import type { IconeSvg } from './onboarding/assets';
import { Texto } from './Texto';

/**
 * Filtro / Etiqueta — pílula com rótulo e ícone opcional à esquerda.
 * O tom define o fundo: neutro (bg/sunken) ou um dos fundos de feedback (bg/*-subtle).
 */
export type TomEtiqueta = 'neutro' | 'sucesso' | 'info' | 'aviso' | 'erro';

type Props = {
  rotulo: string;
  tom?: TomEtiqueta;
  icone?: IconeSvg;
  /** Ícone já montado (ex.: um balão de emoção), no lugar de `icone`. */
  iconeNode?: ReactNode;
  /** Fundo fora dos tons (ex.: action/primary/pressed na etiqueta de emoção da Home). */
  fundo?: string;
  style?: StyleProp<ViewStyle>;
};

export function fundoDoTom(c: Cores, tom: TomEtiqueta) {
  switch (tom) {
    case 'sucesso':
      return c.bg['success-subtle'];
    case 'info':
      return c.bg['info-subtle'];
    case 'aviso':
      return c.bg['warning-subtle'];
    case 'erro':
      return c.bg['error-subtle'];
    default:
      return c.bg.sunken;
  }
}

export function Etiqueta({ rotulo, tom = 'neutro', icone: Icone, iconeNode, fundo, style }: Props) {
  const { cores } = useTema();
  return (
    <View style={[styles.base, { backgroundColor: fundo ?? fundoDoTom(cores, tom) }, style]}>
      {iconeNode ?? (Icone ? <Icone width={16} height={16} corTraco={cores.text.primary} /> : null)}
      <Texto estilo="Texto/Botões e rótulos" style={styles.rotulo}>
        {rotulo}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: space[8],
    paddingHorizontal: space[12],
    paddingVertical: space[4],
    borderRadius: radius.full,
  },
  rotulo: { textAlign: 'center' },
});
