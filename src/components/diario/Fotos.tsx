import * as ImagePicker from 'expo-image-picker';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ImagemLocal } from '../ImagemLocal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { guardarArquivo } from '@/data/arquivos';
import { radius, space, useTema } from '@/theme';

import { Botao } from '../Botao';
import { Fechar } from './assets';

/** Abre a câmera ou a galeria e devolve o endereço da foto (ou null se a pessoa desistir). */
export async function escolherFoto(deOnde: 'camera' | 'galeria'): Promise<string | null> {
  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  let r: ImagePicker.ImagePickerResult;
  if (deOnde === 'camera') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) return null;
    r = await ImagePicker.launchCameraAsync(opcoes);
  } else {
    r = await ImagePicker.launchImageLibraryAsync(opcoes);
  }
  return !r.canceled && r.assets[0] ? guardarArquivo(r.assets[0].uri) : null;
}

/** Foto anexada (Figma 760:6249): quadrado de 52 px, bg/raised, cantos de 12 px. */
export function FotoAnexada({ uri, tamanho = 52, onPress }: { uri: string; tamanho?: number; onPress?: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel="Ver foto"
      style={[styles.foto, { width: tamanho, height: tamanho, backgroundColor: cores.bg.raised }]}
    >
      <ImagemLocal source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </Pressable>
  );
}

/** Foto em tela cheia, sobre o véu bg/scrim; com `onRemover`, mostra "Remover foto". */
export function VisualizarFoto({ uri, onFechar, onRemover }: { uri: string | null; onFechar: () => void; onRemover?: () => void }) {
  const { cores } = useTema();
  const { top, bottom } = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onFechar} statusBarTranslucent>
      <View style={[styles.cheia, { backgroundColor: cores.bg.sunken, paddingTop: top + space[8], paddingBottom: bottom + space[24] }]}>
        <Pressable onPress={onFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.fechar}>
          <Fechar width={24} height={24} corTraco={cores.icon.primary} />
        </Pressable>
        {uri ? <ImagemLocal source={{ uri }} style={styles.imagem} resizeMode="contain" /> : null}
        {onRemover ? (
          <View style={styles.rodape}>
            <Botao rotulo="Remover foto" estilo="secundario" estado="erro" onPress={onRemover} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  foto: { borderRadius: 12, overflow: 'hidden' },
  cheia: { flex: 1, gap: space[16] },
  fechar: { marginLeft: 20, width: 44, height: 44, justifyContent: 'center' },
  imagem: { flex: 1, borderRadius: radius.lg, marginHorizontal: space[24] },
  rodape: { paddingHorizontal: space[24] },
});
