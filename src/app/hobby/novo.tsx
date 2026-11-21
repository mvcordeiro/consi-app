import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, CabecalhoVoltar, Texto } from '@/components';
import { Aparecer, TextoAnimado, fimDoTexto } from '@/components/animacao';
import { CanvasHobbies } from '@/components/hobbies';
import { BuscaHobbies } from '@/components/hobbies/BuscaHobbies';
import { buscarHobbies, hobbyInfo, type HobbyId } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import { inset, space, useTema } from '@/theme';

const TITULO = 'O que vamos explorar dessa vez?';
const SUB = 'Arraste para ver mais e use dois dedos para aproximar. Toque nos que despertam curiosidade.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_CANVAS = fimDoTexto(SUB, T_SUB);

/**
 * Novo hobby (etiqueta "+ Novo hobby" de Para você; sem design no Figma, a partir da tela D4
 * do onboarding). Um canvas infinito com todo o catálogo, agrupado por categoria, para explorar
 * pelas bolhas. Os hobbies que a pessoa já tem aparecem marcados. "Continuar" adiciona os novos.
 */
export default function NovoHobby() {
  const { cores } = useTema();
  const h = useHobbies();
  const [escolhidos, setEscolhidos] = useState<HobbyId[]>([]);
  const [consulta, setConsulta] = useState('');
  const busca = consulta.trim() ? buscarHobbies(consulta).map((x) => x.id) : null;

  const alternar = (id: HobbyId) =>
    setEscolhidos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  const continuar = () => {
    h.adicionarHobbies(escolhidos);
    router.back();
  };

  const nomes = escolhidos.map((id) => hobbyInfo(id).nome);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.margemTopo}>
        <CabecalhoVoltar rotulo="Novo hobby" />
      </View>
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.secondary} atraso={T_SUB} />
        <Aparecer atraso={T_SUB}>
          {/* Busca + "+" para criar um hobby que não está no catálogo */}
          <BuscaHobbies
            consulta={consulta}
            onConsulta={setConsulta}
            semResultado={!!busca && !busca.length}
            onCriado={(novo) =>
              setEscolhidos((atual) => (atual.includes(novo.id) || h.hobbies.includes(novo.id) ? atual : [...atual, novo.id]))
            }
          />
        </Aparecer>
      </View>

      <Aparecer atraso={T_CANVAS} deslocamento={0} style={styles.flex}>
        <CanvasHobbies selecionados={escolhidos} onAlternar={alternar} jaTem={h.hobbies} busca={busca} />
      </Aparecer>

      <View style={styles.rodape}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro} numberOfLines={2}>
          {nomes.length ? nomes.join(' · ') : 'Nenhum escolhido ainda'}
        </Texto>
        <Botao
          rotulo={escolhidos.length > 1 ? `Continuar com ${escolhidos.length}` : 'Continuar'}
          corRotulo={cores.text['on-primary']}
          disabled={!escolhidos.length}
          onPress={continuar}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1 },
  margemTopo: { paddingHorizontal: inset.md },
  cabecalho: { gap: space[12], paddingHorizontal: inset.lg, paddingBottom: space[8] },
  centro: { textAlign: 'center' },
  rodape: { gap: space[8], paddingHorizontal: inset.lg, paddingTop: space[12], paddingBottom: space[8] },
});
