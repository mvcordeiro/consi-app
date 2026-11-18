import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEspacoBarra } from '@/components';
import { Aparecer } from '@/components/animacao';
import {
  ConfirmacaoPadroes,
  Conteudos,
  Drops,
  Grupos,
  Reflexoes,
  Saudacao,
  SuaSemana,
  TopoHome,
} from '@/components/home';
import { respostasSalvas } from '@/data/onboarding';
import { space } from '@/theme';

const ALTURA_TOPO = 40;
const ESPACO_SECAO = space[64];

/** Telas ainda sem design abrem o marcador "Em construção". */
function emConstrucao(titulo: string) {
  router.push({ pathname: '/em-construcao', params: { titulo } });
}

/**
 * Home (Figma: seção "// HOME", frames Dark 488:1726 e Light 574:3865).
 * A saudação ocupa a primeira tela; as seções seguem com 64 px entre elas.
 */
export default function Inicio() {
  const { top } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const espacoBarra = useEspacoBarra();
  const [nome, setNome] = useState('');

  useEffect(() => {
    respostasSalvas().then((r) => setNome(r.nome));
  }, []);

  const topo = top + space[8];
  const alturaSaudacao = height - topo - ALTURA_TOPO - ESPACO_SECAO - espacoBarra;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.conteudo, { paddingTop: topo, paddingBottom: espacoBarra + ESPACO_SECAO }]}
    >
      <View>
        <TopoHome />
        <View style={styles.saudacao}>
          <Saudacao nome={nome} altura={alturaSaudacao} />
        </View>
      </View>
      <Aparecer atraso={300}>
        <Reflexoes onExplorar={() => emConstrucao('Explorar essa relação')} />
      </Aparecer>
      <ConfirmacaoPadroes />
      <Conteudos onVerTudo={(secao) => emConstrucao(secao)} onAbrir={(c) => emConstrucao(c.titulo)} />
      <Drops onAbrirDrop={() => emConstrucao('Drop')} />
      <Grupos onAbrir={(g) => emConstrucao(g.nome)} onCriar={() => emConstrucao('Criar grupo')} />
      <SuaSemana />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingHorizontal: space[24], gap: ESPACO_SECAO },
  // Frame 71 do Figma começa 2 px antes da margem e é 4 px mais largo (392 em 436).
  saudacao: { marginTop: ESPACO_SECAO, marginHorizontal: -2 },
});
