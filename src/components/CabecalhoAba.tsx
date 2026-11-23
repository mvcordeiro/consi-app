import { StyleSheet } from 'react-native';

import { space, useTema } from '@/theme';

import { Aparecer } from './animacao';
import { FotoPerfil } from './FotoPerfil';
import { LogoConsi } from './hobbies/assets';

/** Altura do frame "Header" do Figma (82 px, com 20 px em cima e embaixo). */
export const ALTURA_CABECALHO_ABA = 82;

/**
 * Header das abas (Figma 671:5295, Hobbies): logo "consi" (68 × 25) à esquerda e
 * círculo de perfil de 42 px à direita (tocar abre a folha da foto de perfil).
 */
export function CabecalhoAba() {
  const { cores } = useTema();
  return (
    <Aparecer deslocamento={0} duracao={600} style={styles.cabecalho}>
      <LogoConsi width={68} height={25} corTraco={cores.icon.primary} accessibilityLabel="Consi" />
      <FotoPerfil tamanho={42} />
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
});
