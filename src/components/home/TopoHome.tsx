import { Image, StyleSheet, View } from 'react-native';

import { borderWidth, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { LogoHome, fotoPerfil } from './assets';

/** Frame 74 — logo do Consi à esquerda e foto de perfil à direita. */
export function TopoHome() {
  const { cores } = useTema();
  return (
    <Aparecer deslocamento={0} duracao={600} style={styles.topo}>
      <LogoHome width={34.19} height={40} corTraco={cores.icon.primary} />
      <View style={[styles.perfil, { borderColor: cores.border.subtle }]} accessibilityLabel="Seu perfil">
        <Image source={fotoPerfil} style={styles.foto} resizeMode="cover" />
      </View>
    </Aparecer>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  perfil: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  foto: { width: 38.57, height: 51.43, marginLeft: -1, marginTop: -3.86 },
});
