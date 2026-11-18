import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { inset, gap, useTema } from '@/theme';

type Props = {
  children: ReactNode;
  /** Permite rolar o conteúdo. Padrão: true */
  rolavel?: boolean;
  /** Bordas que respeitam a área segura. Em telas com abas, a aba já cuida da parte de baixo. */
  bordas?: Edge[];
};

/** Base das telas do app: fundo bg/base, margem inset/screen e área segura. */
export function Tela({ children, rolavel = true, bordas = ['top', 'left', 'right'] }: Props) {
  const { cores } = useTema();
  return (
    <SafeAreaView style={[styles.fundo, { backgroundColor: cores.bg.base }]} edges={bordas}>
      {rolavel ? (
        <ScrollView contentContainerStyle={styles.conteudo}>{children}</ScrollView>
      ) : (
        <View style={[styles.conteudo, styles.fixo]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1 },
  conteudo: { padding: inset.screen, gap: gap.default },
  fixo: { flex: 1 },
});
