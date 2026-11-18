import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { hobbies as catalogo } from '@/data/hobbies';
import type { Hobby } from '@/data/onboarding';
import { borderWidth, space, useTema } from '@/theme';

import { Texto } from '../Texto';

/**
 * Abas de "Suas atividades" (Figma 671:5350): rótulos em Texto/Médio, 40 px entre eles;
 * a aba ativa ganha o sublinhado border/focus de 2 px. Rola na horizontal até a borda da tela.
 */
export function AbasHobbies({
  hobbies,
  ativo,
  onEscolher,
  margem,
}: {
  hobbies: Hobby[];
  ativo: Hobby;
  onEscolher: (h: Hobby) => void;
  margem: number;
}) {
  const { cores } = useTema();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -margem }}
      contentContainerStyle={[styles.trilho, { paddingHorizontal: margem }]}
    >
      {hobbies.map((h) => {
        const sel = h === ativo;
        return (
          <Pressable
            key={h}
            onPress={() => onEscolher(h)}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
          >
            <View style={[styles.aba, { borderBottomColor: sel ? cores.border.focus : 'transparent' }]}>
              <Texto estilo="Texto/Médio" style={styles.rotulo}>
                {catalogo[h].nome}
              </Texto>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  trilho: { gap: space[40], alignItems: 'flex-start' },
  aba: { paddingVertical: space[2], borderBottomWidth: borderWidth.thick },
  rotulo: { textAlign: 'center' },
});
