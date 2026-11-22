import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Botao, Filtro, Texto, useAviso } from '@/components';
import {
  Carregando,
  CardSugestao,
  estilosLista,
  FalhaNuvem,
  TelaComunidade,
  TituloLista,
  useCarregar,
  Vazio,
} from '@/components/comunidade';
import { listarSugestoes, type AbaSugestoes } from '@/data/nuvem/sugestoes';
import type { Sugestao } from '@/data/nuvem/tipos';
import { space, useTema } from '@/theme';

const ABAS: [AbaSugestoes, string][] = [
  ['alta', 'Em alta'],
  ['recentes', 'Recentes'],
  ['planejadas', 'Planejadas'],
  ['lancadas', 'Lançadas'],
  ['minhas', 'Minhas'],
];

const VAZIO: Record<AbaSugestoes, { titulo: string; descricao: string }> = {
  alta: { titulo: 'Nenhuma sugestão ainda', descricao: 'Seja a primeira pessoa a sugerir algo para o Consi.' },
  recentes: { titulo: 'Nenhuma sugestão ainda', descricao: 'Seja a primeira pessoa a sugerir algo para o Consi.' },
  planejadas: { titulo: 'Nada planejado ainda', descricao: 'Quando uma ideia entrar nos planos, ela aparece aqui.' },
  lancadas: { titulo: 'Nada lançado ainda', descricao: 'Ideias da comunidade que já estão no app aparecem aqui.' },
  minhas: { titulo: 'Você ainda não sugeriu nada', descricao: 'Suas ideias aparecem aqui, inclusive enquanto aguardam revisão.' },
};

/**
 * Ajustes → Sugerir uma ideia. Lista pública (só as publicadas; em "Minhas" também as suas que
 * aguardam revisão), com votos, puxar para atualizar e "Carregar mais".
 */
export default function Sugestoes() {
  const { cores } = useTema();
  const [aba, setAba] = useState<AbaSugestoes>('alta');
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const [extras, setExtras] = useState<{ itens: Sugestao[]; temMais: boolean; carregando: boolean }>({
    itens: [],
    temMais: false,
    carregando: false,
  });
  const pagina = useRef(0);

  const { dados, setDados, erro, carregando, atualizando, recarregar, tentarDeNovo } = useCarregar(async () => {
    pagina.current = 0;
    const r = await listarSugestoes(aba, 0);
    setExtras({ itens: [], temMais: r.temMais, carregando: false });
    return r.itens;
  }, [aba]);

  // Ao voltar de "Nova" ou do detalhe, a lista reflete votos e envios.
  const primeira = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeira.current) {
        primeira.current = false;
        return;
      }
      void recarregar();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aba]),
  );

  const itens = [...(dados ?? []), ...extras.itens];

  const carregarMais = async () => {
    if (extras.carregando || !extras.temMais) return;
    setExtras((e) => ({ ...e, carregando: true }));
    try {
      const r = await listarSugestoes(aba, pagina.current + 1);
      pagina.current += 1;
      setExtras((e) => ({ itens: [...e.itens, ...r.itens], temMais: r.temMais, carregando: false }));
    } catch {
      setExtras((e) => ({ ...e, carregando: false }));
      mostrarAviso('Sem conexão. Tente de novo.');
    }
  };

  const mudar = (id: string, mudanca: Partial<Sugestao>) => {
    setDados((l) => l?.map((s) => (s.id === id ? { ...s, ...mudanca } : s)) ?? l);
    setExtras((e) => ({ ...e, itens: e.itens.map((s) => (s.id === id ? { ...s, ...mudanca } : s)) }));
  };

  const cabecalho = (
    <TituloLista titulo="Sugestões">
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Vote nas ideias que você quer ver no Consi. Novas sugestões aparecem para todos depois de revisadas.
      </Texto>
      <View style={styles.abas} accessibilityRole="tablist">
        {ABAS.map(([id, rotulo]) => (
          <Filtro key={id} rotulo={rotulo} ativo={aba === id} onPress={() => setAba(id)} />
        ))}
      </View>
    </TituloLista>
  );

  return (
    <TelaComunidade
      titulo="Sugestões"
      lista={
        <FlatList
          data={carregando || erro ? [] : itens}
          keyExtractor={(s) => s.id}
          contentContainerStyle={estilosLista.conteudo}
          ListHeaderComponent={cabecalho}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={recarregar} tintColor={cores.action.primary.default} />}
          renderItem={({ item }) => (
            <CardSugestao
              sugestao={item}
              onAbrir={() => router.push({ pathname: '/ajustes/sugestoes/[id]', params: { id: item.id } })}
              onMudar={(m) => mudar(item.id, m)}
              onErro={mostrarAviso}
            />
          )}
          ListEmptyComponent={
            carregando ? (
              <Carregando rotulo="Carregando sugestões" />
            ) : erro ? (
              <FalhaNuvem erro={erro} onTentar={tentarDeNovo} />
            ) : (
              <Vazio {...VAZIO[aba]} />
            )
          }
          ListFooterComponent={
            extras.temMais && !carregando ? (
              <Botao
                rotulo={extras.carregando ? 'Carregando…' : 'Carregar mais'}
                estilo="secundario"
                onPress={carregarMais}
                estado={extras.carregando ? 'desabilitado' : 'normal'}
              />
            ) : undefined
          }
        />
      }
      rodape={<Botao rotulo="Sugerir uma ideia" onPress={() => router.push('/ajustes/sugestoes/nova')} />}
      aviso={aviso}
    />
  );
}

const styles = StyleSheet.create({
  abas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
