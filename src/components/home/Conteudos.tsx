import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { secoesConteudo, type Conteudo } from '@/data/home';
import { borderWidth, radius, space, useTema } from '@/theme';

import { CabecalhoSecao } from '../CabecalhoSecao';
import { Texto } from '../Texto';

const MARGEM = space[24];

/** Conteúdos / scroll vertical — uma seção por tema, cada uma com um carrossel de leituras. */
export function Conteudos({
  onVerTudo,
  onAbrir,
}: {
  onVerTudo: (secao: string) => void;
  onAbrir: (conteudo: Conteudo) => void;
}) {
  return (
    <View style={styles.coluna}>
      {secoesConteudo.map((secao) => (
        <View key={secao.id} style={styles.secao}>
          <CabecalhoSecao titulo={secao.titulo} onVerTudo={() => onVerTudo(secao.titulo)} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={286 + space[12]}
            style={styles.sangria}
            contentContainerStyle={styles.trilho}
          >
            {secao.conteudos.map((c) => (
              <CardConteudo key={c.id} conteudo={c} onPress={() => onAbrir(c)} />
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

/** Card / Conteúdo da biblioteca — título, tempo de leitura e botão de abrir. */
function CardConteudo({ conteudo, onPress }: { conteudo: Conteudo; onPress: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${conteudo.titulo}, ${conteudo.minutos} minutos de leitura`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cores.bg.raised, borderColor: cores.border.focus, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Texto estilo="Títulos/Médio">{conteudo.titulo}</Texto>
      <View style={styles.rodape}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {conteudo.minutos} min de leitura
        </Texto>
        <View style={[styles.abrir, { backgroundColor: cores.action.primary.default }]}>
          <Texto estilo="Títulos/Grande" style={styles.seta}>
            ›
          </Texto>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[24] },
  secao: { gap: space[24] },
  sangria: { marginHorizontal: -MARGEM },
  trilho: { paddingHorizontal: MARGEM, gap: space[12] },
  card: {
    width: 286,
    height: 220,
    justifyContent: 'space-between',
    padding: space[20] - borderWidth.thin, // borda interna no Figma
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
  },
  rodape: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  abrir: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  seta: { textAlign: 'center', paddingRight: 1 },
});
