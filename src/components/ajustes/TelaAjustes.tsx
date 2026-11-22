import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { inset, space, useTema } from '@/theme';

import { CabecalhoVoltar } from '../CabecalhoVoltar';
import { Texto } from '../Texto';

/**
 * Base das sub-páginas de Ajustes (fora das abas): área segura, "‹ Ajustes" no topo, título grande,
 * conteúdo rolável direto no fundo ou uma lista própria (`lista`), rodapé fixo opcional (botão
 * principal) e o aviso. Sobe com o teclado nos formulários.
 */
export function TelaAjustes({
  titulo,
  voltar = 'Ajustes',
  direita,
  children,
  lista,
  rodape,
  aviso,
  travarRolagem = false,
}: {
  /** Título grande da página. Sem ele, o conteúdo traz o próprio título (ex.: detalhe de sugestão). */
  titulo?: string;
  voltar?: string;
  direita?: ReactNode;
  children?: ReactNode;
  /** Uma FlatList que cuida da própria rolagem (o título vai no cabeçalho dela). */
  lista?: ReactNode;
  rodape?: ReactNode;
  /** O aviso de useAviso(), por cima de tudo. */
  aviso?: ReactNode;
  /** Trava a rolagem (ex.: enquanto arrasta uma seção do Início). */
  travarRolagem?: boolean;
}) {
  const { cores } = useTema();
  return (
    <SafeAreaView style={[styles.fundo, { backgroundColor: cores.bg.base }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topo}>
          <CabecalhoVoltar rotulo={voltar} direita={direita} />
        </View>
        {lista ?? (
          <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled" scrollEnabled={!travarRolagem}>
            {titulo ? (
              <Texto estilo="Títulos/Grande" accessibilityRole="header">
                {titulo}
              </Texto>
            ) : null}
            {children}
          </ScrollView>
        )}
        {rodape ? <View style={[styles.rodape, { borderTopColor: cores.border.subtle }]}>{rodape}</View> : null}
      </KeyboardAvoidingView>
      {aviso}
    </SafeAreaView>
  );
}

/** Título grande para usar no cabeçalho de uma FlatList dentro de `TelaAjustes lista`. */
export function TituloLista({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <View style={styles.cabecalhoLista}>
      <Texto estilo="Títulos/Grande" accessibilityRole="header">
        {titulo}
      </Texto>
      {children}
    </View>
  );
}

export const estilosLista = StyleSheet.create({
  conteudo: { paddingHorizontal: inset.screen, paddingBottom: space[24], gap: space[12] },
});

const styles = StyleSheet.create({
  fundo: { flex: 1 },
  topo: { paddingHorizontal: space[8] },
  conteudo: { padding: inset.screen, paddingTop: space[8], gap: space[16] },
  cabecalhoLista: { gap: space[16], paddingTop: space[8], paddingBottom: space[4] },
  rodape: { paddingHorizontal: inset.screen, paddingVertical: space[12], borderTopWidth: 1, gap: space[8] },
});
