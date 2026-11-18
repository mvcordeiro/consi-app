import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '@/components';
import { Aparecer, TextoAnimado, fimDoTexto } from '@/components/animacao';
import { BalaoEmocao } from '@/components/home/BalaoEmocao';
import { emocaoPorId } from '@/data/emocoes';
import { borderWidth, radius, space, useTema } from '@/theme';

import IconeEscrever from '../../assets/home/icone-escrever.svg';

const nativo = Platform.OS !== 'web';
/** "HOME - BOTÃO DURA 2.5 SEGUNDOS" no Figma. */
const DURACAO_BOTAO = 2500;
const DESCRICAO = 'Registramos essa emoção para você.\nVocê pode editá-la depois se quiser.';

/**
 * Emoção registrada (Figma 665:8886 → 665:9114). Abre com o clarão feedback/info,
 * mostra a emoção e o botão "Quero explorar essa emoção", que esvazia em 2,5 s.
 * Tocar explora (ainda sem tela); se o tempo acabar, volta para a Home.
 */
export default function EmocaoRegistrada() {
  const { cores } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const emocao = emocaoPorId(id);
  const [clarao] = useState(() => new Animated.Value(1));
  const fimTexto = fimDoTexto(DESCRICAO, 500);

  useEffect(() => {
    Animated.timing(clarao, {
      toValue: 0,
      duration: 500,
      delay: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: nativo,
    }).start();
  }, [clarao]);

  if (!emocao) return null;

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.centro}>
        <View style={styles.textos}>
          <TextoAnimado texto={emocao.nome} estilo="Títulos/Grande" atraso={300} />
          <TextoAnimado texto={DESCRICAO} estilo="Texto/Médio" atraso={500} />
        </View>
        <Aparecer atraso={400} escalaInicial={0.85} deslocamento={0} duracao={800}>
          <BalaoEmocao Svg={emocao.Svg} Textura={emocao.Textura} circulo={emocao.circulo} tamanho={144} />
        </Aparecer>
      </View>
      <Aparecer atraso={fimTexto} style={styles.rodape}>
        <BotaoContagem
          inicio={fimTexto}
          onPress={() => router.replace({ pathname: '/em-construcao', params: { titulo: `Explorar ${emocao.nome}` } })}
          onFim={() => router.back()}
        />
      </Aparecer>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: cores.feedback.info, opacity: clarao }]}
      />
    </SafeAreaView>
  );
}

/**
 * Ação / Botão com contagem: começa cheio (action/primary) e vai esvaziando até a
 * borda (border/focus); o que resta fica em bg/raised, como nos frames do Figma.
 */
function BotaoContagem({ inicio, onPress, onFim }: { inicio: number; onPress: () => void; onFim: () => void }) {
  const { cores } = useTema();
  const [restante] = useState(() => new Animated.Value(1));
  const [cor] = useState(() => new Animated.Value(0));
  const acabou = useRef(false);

  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(inicio),
      Animated.parallel([
        Animated.timing(cor, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(restante, {
          toValue: 0,
          duration: DURACAO_BOTAO,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    ]);
    a.start(({ finished }) => {
      if (finished && !acabou.current) {
        acabou.current = true;
        onFim();
      }
    });
    return () => a.stop();
  }, [inicio, cor, restante, onFim]);

  const tocar = () => {
    if (acabou.current) return;
    acabou.current = true;
    onPress();
  };

  return (
    <Pressable
      onPress={tocar}
      accessibilityRole="button"
      accessibilityLabel="Quero explorar essa emoção"
      accessibilityHint="Disponível por alguns segundos"
      style={[styles.botao, { borderColor: cores.border.focus }]}
    >
      <Animated.View
        style={[
          styles.preenchimento,
          {
            width: restante.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: cor.interpolate({
              inputRange: [0, 1],
              outputRange: [cores.action.primary.default, cores.bg.raised],
            }),
          },
        ]}
      />
      {/* Num View: na web, o preenchimento absoluto seria pintado por cima do SVG. */}
      <View style={styles.conteudoBotao}>
        <IconeEscrever width={23.91} height={23.22} corTraco={cores.icon.primary} />
        <Texto estilo="Texto/Botões e rótulos" cor={cores.icon.primary}>
          Quero explorar essa emoção
        </Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[64], paddingHorizontal: space[24] },
  textos: { alignItems: 'center', gap: 17, maxWidth: 283 },
  rodape: { paddingHorizontal: space[24], paddingBottom: space[40] },
  botao: {
    height: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    paddingHorizontal: space[20],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  conteudoBotao: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  preenchimento: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.full },
});
