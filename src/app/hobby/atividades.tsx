import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar, Filtro, Texto, useAviso } from '@/components';
import { Aparecer } from '@/components/animacao';
import { CardAtividade, IconeHobby, irPara, useAcoesAtividade } from '@/components/hobbies';
import { hobbyInfo } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import type { Hobby } from '@/data/onboarding';
import { inset, space, useTema } from '@/theme';

/**
 * "Ver tudo" de Suas atividades (sem design no Figma): todas as atividades do hobby,
 * separadas em "Em andamento" e "Concluídas", com os mesmos filtros de hobby de Para você.
 */
export default function TodasAtividades() {
  const { cores } = useTema();
  const params = useLocalSearchParams<{ hobby?: Hobby }>();
  const h = useHobbies();
  const [hobby, setHobby] = useState<Hobby>(params.hobby ?? h.hobbies[0]);
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const [arrastando, setArrastando] = useState(false);
  const acoes = useAcoesAtividade({ aoApagar: () => mostrarAviso('Atividade apagada') });

  const doHobby = h.atividades.filter((a) => a.hobby === hobby);
  const andamento = doHobby.filter((a) => a.status === 'andamento');
  const concluidas = doHobby
    .filter((a) => a.status === 'concluida')
    .sort((a, b) => (b.concluidaEm ?? 0) - (a.concluidaEm ?? 0));

  const secao = (titulo: string, lista: typeof doHobby, vazio: string) => (
    <View style={styles.secao}>
      <Texto estilo="Títulos/Médio">{`${titulo} · ${lista.length}`}</Texto>
      {lista.length ? (
        lista.map((a, i) => (
          <Aparecer key={a.id} atraso={i * 60}>
            <CardAtividade
              atividade={a}
              margem={MARGEM}
              onAbrir={() => irPara.detalhe(a.id)}
              onMenu={() => acoes.abrirMenu(a)}
              onApagar={() => acoes.confirmarApagar(a)}
              onArrastando={setArrastando}
              onArrastarApagar={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                h.apagar(a.id);
                mostrarAviso('Atividade apagada', { rotulo: 'Desfazer', onPress: h.desfazerApagar });
              }}
              onAtualizacoes={() => irPara.atualizacoes(a.id)}
              onFinalizar={() => irPara.finalizar(a.id)}
            />
          </Aparecer>
        ))
      ) : (
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          {vazio}
        </Texto>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'left', 'right']}>
      <View style={styles.margemTopo}>
        <CabecalhoVoltar rotulo="Suas atividades" />
      </View>
      <ScrollView scrollEnabled={!arrastando} contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sangria}
          contentContainerStyle={styles.filtros}
        >
          {h.hobbies.map((hb) => (
            <Filtro
              key={hb}
              rotulo={hobbyInfo(hb).nome}
              ativo={hb === hobby}
              onPress={() => setHobby(hb)}
              icone={(cor) => <IconeHobby hobby={hb} caixa={16} cor={cor} />}
            />
          ))}
        </ScrollView>
        <View key={hobby} style={styles.secoes}>
          {secao('Em andamento', andamento, 'Nada em andamento. Aceite uma sugestão em Para você.')}
          {secao('Concluídas', concluidas, 'Quando você finalizar uma atividade, ela aparece aqui.')}
        </View>
      </ScrollView>
      {acoes.folhas}
      {aviso}
    </SafeAreaView>
  );
}

const MARGEM = inset.lg;

const styles = StyleSheet.create({
  tela: { flex: 1 },
  margemTopo: { paddingHorizontal: inset.md },
  conteudo: { paddingHorizontal: MARGEM, paddingTop: space[16], paddingBottom: space[48], gap: space[32] },
  sangria: { marginHorizontal: -MARGEM },
  filtros: { paddingHorizontal: MARGEM, gap: space[12] },
  secoes: { gap: space[48] },
  secao: { gap: space[24] },
});
