import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { size, space, useTema } from '@/theme';

import { SetaVoltar } from './onboarding/assets';
import { Texto } from './Texto';

/**
 * Topo das telas secundárias: seta de voltar (a mesma do onboarding), um rótulo central
 * opcional (Texto/Botões e rótulos) e uma ação à direita.
 */
export function CabecalhoVoltar({
  rotulo,
  direita,
  onVoltar = () => router.back(),
}: {
  rotulo?: string;
  direita?: ReactNode;
  onVoltar?: () => void;
}) {
  const { cores } = useTema();
  return (
    <View style={styles.linha}>
      <Pressable
        onPress={onVoltar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={styles.botao}
      >
        <SetaVoltar width={7.06} height={12.71} corTraco={cores.icon.primary} />
      </Pressable>
      <Texto estilo="Texto/Botões e rótulos" cor={cores.text.secondary} style={styles.rotulo} numberOfLines={1}>
        {rotulo ?? ''}
      </Texto>
      <View style={styles.botao}>{direita}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { height: size['touch-target'], flexDirection: 'row', alignItems: 'center', gap: space[8] },
  botao: { width: size['touch-target'], height: size['touch-target'], alignItems: 'center', justifyContent: 'center' },
  rotulo: { flex: 1, textAlign: 'center' },
});
