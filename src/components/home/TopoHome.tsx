import { StyleSheet } from 'react-native';

import { useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { FotoPerfil } from '../FotoPerfil';
import { LogoHome } from './assets';

/** Frame 74 — logo do Consi à esquerda e foto de perfil à direita. */
export function TopoHome() {
  const { cores } = useTema();
  return (
    <Aparecer deslocamento={0} duracao={600} style={styles.topo}>
      <LogoHome width={34.19} height={40} corTraco={cores.icon.primary} />
      {/* Tocar abre a folha para tirar uma selfie ou escolher da galeria. */}
      <FotoPerfil tamanho={40} />
    </Aparecer>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
});
