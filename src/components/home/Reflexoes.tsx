import { router } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { alternarResposta, useReflexoes, type Reflexao } from '@/data/reflexoes';
import { space } from '@/theme';

import { CabecalhoSecao } from '../CabecalhoSecao';
import { CardReflexao } from './CardReflexao';

const ESPACO = space[12];
/** Quanto do próximo card aparece na borda, para mostrar que dá para arrastar. */
const ESPIA = space[32];

/** Para onde vai o botão do card: o Diário filtrado (com a origem), um momento, um dia ou escrever. */
export function abrirReflexao(r: Reflexao) {
  const d = r.acao.destino;
  switch (d.tipo) {
    case 'filtro':
      return router.push({ pathname: '/diario/reflexao', params: { titulo: r.titulo, filtro: JSON.stringify(d.filtro) } });
    case 'momento':
      return router.push({ pathname: '/diario/momento', params: { em: String(d.em), reflexao: r.titulo } });
    case 'dia':
      return router.push({ pathname: '/diario/dia', params: { data: d.data, reflexao: r.titulo } });
    case 'escrever':
      return router.push({ pathname: '/diario/novo', params: { pergunta: d.pergunta } });
  }
}

/**
 * Reflexões (issue #15): logo abaixo das emoções, um carrossel de Card / Reflexão com o que o
 * Consi percebeu nos dados do aparelho. Só aparece quando há o que mostrar (data/reflexoes.ts).
 */
export function Reflexoes({ margem }: { margem: number }) {
  const { width } = useWindowDimensions();
  const reflexoes = useReflexoes();
  if (!reflexoes.length) return null;

  const sozinho = reflexoes.length === 1;
  const largura = sozinho ? width - margem * 2 : width - margem * 2 - ESPIA;

  return (
    <View style={styles.secao}>
      <CabecalhoSecao titulo="Reflexões" subtitulo="O que o Consi percebeu nos seus dias." espacado />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={largura + ESPACO}
        decelerationRate="fast"
        disableIntervalMomentum
        style={{ marginHorizontal: -margem }}
        contentContainerStyle={[styles.trilho, { paddingHorizontal: margem }]}
      >
        {reflexoes.map((r) => (
          <CardReflexao key={r.id} reflexao={r} largura={largura} onAcao={abrirReflexao} onResponder={(o) => void alternarResposta(o)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[16] },
  trilho: { gap: ESPACO, alignItems: 'stretch' },
});
