import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Botao, Etiqueta, Filtro, Texto, useAviso } from '@/components';
import {
  Carregando,
  CardSugestao,
  dataLonga,
  estilosLista,
  FalhaNuvem,
  TelaComunidade,
  TituloLista,
  useCarregar,
  Vazio,
} from '@/components/comunidade';
import { contarFila, fila, listarVersoes, sairAdmin, souAdmin } from '@/data/nuvem/moderacao';
import type { Moderacao, SugestaoModeracao, Versao } from '@/data/nuvem/tipos';
import { radius, space, useTema } from '@/theme';

type Aba = Moderacao | 'versoes';

const ABAS: [Aba, string][] = [
  ['pendente', 'Pendentes'],
  ['publicada', 'Publicadas'],
  ['rejeitada', 'Rejeitadas'],
  ['escondida', 'Escondidas'],
  ['versoes', 'Versões'],
];

type Item = { tipo: 'sugestao'; s: SugestaoModeracao } | { tipo: 'versao'; v: Versao };

/**
 * Painel de moderação (só admin). Fila por estado: Pendentes (mais antigas primeiro), Publicadas,
 * Rejeitadas e Escondidas (inclui as que caíram por denúncia), com contadores; e Versões, para
 * escrever o changelog. Sem sessão de admin, manda para o login.
 */
export default function PainelModeracao() {
  const { cores } = useTema();
  const [aba, setAba] = useState<Aba>('pendente');
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });

  const { dados, setDados, erro, carregando, atualizando, recarregar, tentarDeNovo } = useCarregar(async () => {
    if (!(await souAdmin())) {
      router.replace('/ajustes/admin-entrar');
      return null;
    }
    const [contagem, itens] = await Promise.all([
      contarFila(),
      aba === 'versoes'
        ? listarVersoes().then((l) => l.map((v): Item => ({ tipo: 'versao', v })))
        : fila(aba).then((l) => l.map((s): Item => ({ tipo: 'sugestao', s }))),
    ]);
    return { contagem, itens };
  }, [aba]);

  // Volta do detalhe ou do editor de versão com a fila atualizada.
  const primeira = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeira.current) {
        primeira.current = false;
        return;
      }
      void recarregar();
    }, [recarregar]),
  );

  const sair = async () => {
    await sairAdmin().catch(() => {});
    router.back();
  };

  const rotulo = (id: Aba, nome: string) => {
    const n = id === 'pendente' ? dados?.contagem.pendentes : id === 'escondida' ? dados?.contagem.escondidas : 0;
    return n ? `${nome} (${n})` : nome;
  };

  const cabecalho = (
    <TituloLista titulo="Moderação">
      <View style={styles.abas} accessibilityRole="tablist">
        {ABAS.map(([id, nome]) => (
          <Filtro key={id} rotulo={rotulo(id, nome)} ativo={aba === id} onPress={() => setAba(id)} />
        ))}
      </View>
    </TituloLista>
  );

  return (
    <TelaComunidade
      titulo="Moderação"
      aviso={aviso}
      direita={
        <Pressable onPress={sair} accessibilityRole="button" accessibilityLabel="Sair da moderação" hitSlop={8}>
          <Texto estilo="Texto/Botões e rótulos" cor={cores.text.link}>
            Sair
          </Texto>
        </Pressable>
      }
      rodape={aba === 'versoes' ? <Botao rotulo="Nova versão" onPress={() => router.push('/ajustes/moderacao/versao')} /> : undefined}
      lista={
        <FlatList
          data={carregando || erro ? [] : (dados?.itens ?? [])}
          keyExtractor={(i) => (i.tipo === 'sugestao' ? i.s.id : i.v.id)}
          contentContainerStyle={estilosLista.conteudo}
          ListHeaderComponent={cabecalho}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={recarregar} tintColor={cores.action.primary.default} />}
          renderItem={({ item }) =>
            item.tipo === 'sugestao' ? (
              <CardSugestao
                sugestao={item.s}
                extra={item.s.denuncias ? `${item.s.denuncias} ${item.s.denuncias === 1 ? 'denúncia' : 'denúncias'}` : undefined}
                onAbrir={() => router.push({ pathname: '/ajustes/moderacao/[id]', params: { id: item.s.id } })}
                onMudar={(m) =>
                  setDados((d) =>
                    d && { ...d, itens: d.itens.map((i) => (i.tipo === 'sugestao' && i.s.id === item.s.id ? { ...i, s: { ...i.s, ...m } } : i)) },
                  )
                }
                onErro={mostrarAviso}
              />
            ) : (
              <LinhaVersao versao={item.v} />
            )
          }
          ListEmptyComponent={
            carregando ? (
              <Carregando rotulo="Carregando fila" />
            ) : erro ? (
              <FalhaNuvem erro={erro} onTentar={tentarDeNovo} />
            ) : aba === 'versoes' ? (
              <Vazio titulo="Nenhuma versão" descricao="Escreva a primeira nota de versão para aparecer em Novidades." />
            ) : (
              <Vazio titulo={aba === 'pendente' ? 'Fila vazia' : 'Nada por aqui'} descricao={aba === 'pendente' ? 'Nenhuma sugestão aguardando revisão.' : undefined} />
            )
          }
        />
      }
    />
  );
}

function LinhaVersao({ versao }: { versao: Versao }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/ajustes/moderacao/versao', params: { id: versao.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Versão ${versao.versao}, ${versao.publicada ? 'publicada' : 'rascunho'}`}
      style={({ pressed }) => [styles.versao, { backgroundColor: cores.bg.raised }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.flex}>
        <Texto estilo="Títulos/Pequeno">{`Versão ${versao.versao}`}</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {`${dataLonga(versao.data)} · ${versao.itens.length} ${versao.itens.length === 1 ? 'item' : 'itens'}`}
        </Texto>
      </View>
      <Etiqueta rotulo={versao.publicada ? 'Publicada' : 'Rascunho'} tom={versao.publicada ? 'sucesso' : 'neutro'} linhaUnica />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  abas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  versao: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16], borderRadius: radius.card },
  flex: { flex: 1, gap: space[4] },
});
