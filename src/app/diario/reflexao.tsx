import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, CabecalhoVoltar, Texto } from '@/components';
import { ItemIndice } from '@/components/diario/Indice';
import { OrigemReflexao } from '@/components/diario/OrigemReflexao';
import { plural, useMomentos } from '@/data/momentos';
import { useDesfechos } from '@/data/pausa';
import { momentosDoFiltro, type FiltroReflexao } from '@/data/reflexoes';
import { space, useTema } from '@/theme';

function lerFiltro(bruto?: string): FiltroReflexao {
  try {
    const f = JSON.parse(bruto ?? '{}') as Partial<FiltroReflexao>;
    return { ...f, dias: typeof f.dias === 'number' && f.dias > 0 ? f.dias : 7 };
  } catch {
    return { dias: 7 };
  }
}

/**
 * Diário a partir de uma Reflexão (issue #15): o componente de origem no topo e os momentos que a
 * reflexão olhou (mesmo item do Índice). Sem momentos no recorte, convida a escrever.
 */
export default function DiarioDaReflexao() {
  const { cores } = useTema();
  const { titulo, filtro } = useLocalSearchParams<{ titulo?: string; filtro?: string }>();
  const f = useMemo(() => lerFiltro(filtro), [filtro]);
  const todos = useMomentos();
  const desfechos = useDesfechos();
  const lista = useMemo(() => momentosDoFiltro(todos, f, desfechos ?? []), [todos, f, desfechos]);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topo}>
        <CabecalhoVoltar rotulo="Início" />
      </View>
      <FlatList
        data={lista}
        keyExtractor={(m) => String(m.em)}
        contentContainerStyle={styles.conteudo}
        ListHeaderComponent={
          <View style={styles.cabecalho}>
            {titulo ? <OrigemReflexao titulo={titulo} /> : null}
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              {lista.length
                ? `${plural(lista.length, 'momento', 'momentos')} nos últimos ${f.dias} dias`
                : `Nenhum momento nos últimos ${f.dias} dias`}
            </Texto>
          </View>
        }
        renderItem={({ item, index }) => (
          <ItemIndice momento={item} recente={index === 0} onPress={() => router.push({ pathname: '/diario/momento', params: { em: String(item.em) } })} />
        )}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
              Os check-ins e textos desse recorte aparecem aqui. Que tal escrever sobre isso agora?
            </Texto>
            <Botao rotulo="Escrever agora" onPress={() => router.push(titulo ? { pathname: '/diario/novo', params: { pergunta: titulo } } : '/diario/novo')} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  topo: { paddingHorizontal: space[8] },
  conteudo: { paddingHorizontal: space[24], paddingBottom: space[48], gap: space[16] },
  cabecalho: { gap: space[16], paddingTop: space[8], paddingBottom: space[8] },
  vazio: { gap: space[16], paddingTop: space[16] },
});
