import { StyleSheet, View } from 'react-native';

import { radius, space, useTema } from '@/theme';

/**
 * Indicador de 5 etapas do onboarding ("Pill" no Figma).
 * Etapa atual: 32 × 16, icon/primary. Demais: 16 × 16, action/secondary/pressed.
 */
export function ProgressoOnboarding({ etapa }: { etapa: 1 | 2 | 3 | 4 | 5 }) {
  const { cores } = useTema();
  return (
    <View
      style={styles.linha}
      accessibilityRole="progressbar"
      accessibilityLabel={`Etapa ${etapa} de 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={[
            styles.pilula,
            n === etapa
              ? { width: 32, backgroundColor: cores.icon.primary }
              : { backgroundColor: cores.action.secondary.pressed },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  pilula: { width: 16, height: 16, borderRadius: radius.full },
});
