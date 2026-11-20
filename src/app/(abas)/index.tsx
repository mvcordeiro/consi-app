import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAviso, useEspacoBarra, useModoImersivo } from '@/components';
import {
  Conteudos,
  Drops,
  Grupos,
  HeroEmocoes,
  SuaSemana,
  TopoHome,
} from '@/components/home';
import { hobbyInfo } from '@/data/catalogo';
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
 * A primeira tela (100vh) é o topo + a hero (escolha da emoção, Figma 667:9661), com o boneco
 * colado na barra de navegação; as seções seguem com 64 px entre elas.
 * Enquanto a pessoa escolhe a emoção (modo imersivo), o topo sobe e sai da tela e a rolagem trava.
 */
export default function Inicio() {
  const { top } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const espacoBarra = useEspacoBarra();
  const [nome, setNome] = useState('');
  const [arrastandoBalao, setArrastandoBalao] = useState(false);
  const [arrastandoDrop, setArrastandoDrop] = useState(false);
  const [aviso, mostrarAviso] = useAviso();
  // Altura real da área da Home (no Android edge-to-edge pode diferir da janela).
  const [alturaTela, setAlturaTela] = useState(height);
  const { imersivo, saida } = useModoImersivo();
  const rolagem = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);

  // Ao entrar no modo imersivo, volta para o alto: as emoções ocupam a primeira tela.
  useEffect(() => {
    if (imersivo) rolagem.current?.scrollTo({ y: 0, animated: true });
  }, [imersivo]);

  useEffect(() => {
    respostasSalvas().then((r) => setNome(r.nome));
  }, []);

  const topo = top + space[8];
  const alturaTopo = topo + ALTURA_TOPO;
  // A hero vai do fim do topo até a barra de navegação: topo + hero = altura da tela.
  const alturaHero = alturaTela - alturaTopo - espacoBarra;
  const arrastando = useCallback((a: boolean) => setArrastandoBalao(a), []);
  const escolher = useCallback(
    (e: Emocao) => router.push({ pathname: '/emocao', params: { id: e.id } }),
    [],
  );

  return (
    <View style={styles.flex}>
    <ScrollView
      ref={(r: unknown) => {
        rolagem.current = r as typeof rolagem.current;
      }}
      scrollEnabled={!imersivo && !arrastandoBalao && !arrastandoDrop}
      onLayout={(e) => setAlturaTela(e.nativeEvent.layout.height)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.conteudo, { paddingTop: topo, paddingBottom: espacoBarra + ESPACO_SECAO }]}
    >
      <View style={styles.primeiraTela}>
        {/* O topo sai pela parte de cima no modo imersivo e volta descendo */}
        <Animated.View
          style={{
            transform: [{ translateY: saida.interpolate({ inputRange: [0, 1], outputRange: [0, -(alturaTopo + space[16])] }) }],
          }}
        >
          <TopoHome />
        </Animated.View>
        <View style={styles.hero}>
          <HeroEmocoes
            nome={nome}
            altura={alturaHero}
            alturaTopo={alturaTopo}
            alturaTela={alturaTela}
            onArrastando={arrastando}
            onEscolher={escolher}
          />
        </View>
      </View>
      {/* Reflexões e "Padrões encontrados" voltam quando houver uso registrado suficiente para gerá-los. */}
      <Conteudos onVerTudo={(secao) => emConstrucao(secao)} onAbrir={(c) => emConstrucao(c.titulo)} />
      <Drops
        margem={space[24]}
        onArrastando={setArrastandoDrop}
        onAceito={(s) => mostrarAviso(`Adicionada em Suas atividades · ${hobbyInfo(s.hobby).nome}`)}
      />
      <Grupos
        onAbrir={(g) => router.push({ pathname: '/grupo/[id]', params: { id: g.id } })}
        onCriar={() => router.push('/grupo/criar')}
        onAjustes={() => router.push('/grupos-home')}
      />
      <SuaSemana margem={space[24]} onArrastando={setArrastandoDrop} onAviso={mostrarAviso} />
    </ScrollView>
    {aviso}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { paddingHorizontal: space[24], gap: ESPACO_SECAO },
  // O palco usa a largura toda da tela: as posições dos balões são do frame de 436 px.
  // por cima das seções seguintes: a vinheta do modo imersivo cobre a tela inteira
  primeiraTela: { zIndex: 1 },
  hero: { marginHorizontal: -space[24] },
});
