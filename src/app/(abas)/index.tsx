import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEspacoBarra } from '@/components';
import { Aparecer } from '@/components/animacao';
import {
  ConfirmacaoPadroes,
  Conteudos,
  Drops,
  Grupos,
  HeroEmocoes,
  Reflexoes,
  SuaSemana,
  TopoHome,
} from '@/components/home';
import type { Emocao } from '@/data/emocoes';
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
 * A hero (escolha da emoção, Figma 667:9661) ocupa a primeira tela; as seções seguem com 64 px entre elas.
 */
export default function Inicio() {
  const { top } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const espacoBarra = useEspacoBarra();
  const [nome, setNome] = useState('');
  const [rolagem, setRolagem] = useState(true);

  useEffect(() => {
    respostasSalvas().then((r) => setNome(r.nome));
  }, []);

  const topo = top + space[8];
  // O palco da hero vai do fim do topo até a barra de navegação.
  const alturaHero = height - topo - ALTURA_TOPO - espacoBarra;
  const arrastando = useCallback((a: boolean) => setRolagem(!a), []);
  const escolher = useCallback(
    (e: Emocao) => router.push({ pathname: '/emocao', params: { id: e.id } }),
    [],
  );

  return (
    <ScrollView
      scrollEnabled={rolagem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.conteudo, { paddingTop: topo, paddingBottom: espacoBarra + ESPACO_SECAO }]}
    >
      <View>
        <TopoHome />
        <View style={styles.hero}>
          <HeroEmocoes nome={nome} altura={alturaHero} onArrastando={arrastando} onEscolher={escolher} />
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
  // O palco usa a largura toda da tela: as posições dos balões são do frame de 436 px.
  hero: { marginHorizontal: -space[24] },
});
