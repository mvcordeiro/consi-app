import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { ImagemLocal } from './ImagemLocal';

import { useFotoPerfil, useHandle } from '@/data/perfil';
import { borderWidth, radius, useTema } from '@/theme';

/**
 * Círculo de perfil do topo das abas. Sem foto, fica vazio (bg/raised); tocar abre "Seu perfil"
 * (src/app/perfil.tsx): a foto (selfie, galeria, remover) e o @handle (issue #3).
 */
export function FotoPerfil({ tamanho = 40 }: { tamanho?: number }) {
  const { cores } = useTema();
  const foto = useFotoPerfil();
  const handle = useHandle();

  return (
    <Pressable
      onPress={() => router.push('/perfil' as Href)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={handle ? `Seu perfil, @${handle}` : 'Seu perfil: foto e @'}
      style={({ pressed }) => [
        styles.circulo,
        {
          width: tamanho,
          height: tamanho,
          backgroundColor: cores.bg.raised,
          borderColor: cores.border.subtle,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {foto ? <ImagemLocal source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circulo: { borderRadius: radius.full, borderWidth: borderWidth.thin, overflow: 'hidden' },
});
