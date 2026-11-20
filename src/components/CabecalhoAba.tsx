import { StyleSheet, View } from 'react-native';

import { borderWidth, space, useTema } from '@/theme';

import { Aparecer } from './animacao';
import { LogoConsi } from './hobbies/assets';

/** Altura do frame "Header" do Figma (82 px, com 20 px em cima e embaixo). */
export const ALTURA_CABECALHO_ABA = 82;

/**
 * Header das abas (Figma 671:5295, Hobbies): logo "consi" (68 × 25) à esquerda e
 * círculo de perfil de 42 px à direita, vazio enquanto não existe foto de perfil.
 */
export function CabecalhoAba() {
  const { cores } = useTema();
  return (
    <Aparecer deslocamento={0} duracao={600} style={styles.cabecalho}>
      <LogoConsi width={68} height={25} corTraco={cores.icon.primary} accessibilityLabel="Consi" />
      <View
        style={[styles.perfil, { backgroundColor: cores.bg.raised, borderColor: cores.border.subtle }]}
        accessibilityLabel="Seu perfil"
      />
    </Aparecer>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    height: ALTURA_CABECALHO_ABA,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[20],
  },
  perfil: { width: 42, height: 42, borderRadius: 21, borderWidth: borderWidth.thin },
});
