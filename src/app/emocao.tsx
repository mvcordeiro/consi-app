import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aparecer, TextoAnimado, fimDoTexto } from '@/components/animacao';
import { BalaoEmocao } from '@/components/home/BalaoEmocao';
import { BotaoContagem } from '@/components/home/BotaoContagem';
import { emocaoPorId, emocoesDeHoje } from '@/data/emocoes';
import { space, useTema } from '@/theme';

const nativo = Platform.OS !== 'web';
const DESCRICAO = 'Registramos essa emoção para você.\nVocê pode editá-la depois se quiser.';

/**
 * Emoção registrada (Figma 665:8886 → 665:9114). Abre com o clarão feedback/info,
 * mostra a emoção e o botão "Quero explorar essa emoção", que esvazia em 2,5 s.
 * Tocar abre o momento no Diário para escrever; se o tempo acabar, volta para a Home.
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
          onPress={() =>
            // o check-in acabou de virar um momento do Diário: abre ele para escrever
            emocoesDeHoje().then((hoje) => {
              const m = hoje.find((r) => r.id === emocao.id);
              router.replace({ pathname: '/diario/novo', params: m ? { em: String(m.em) } : { emocao: emocao.id } });
            })
          }
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

const styles = StyleSheet.create({
  tela: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[64], paddingHorizontal: space[24] },
  textos: { alignItems: 'center', gap: 17, maxWidth: 283 },
  rodape: { paddingHorizontal: space[24], paddingBottom: space[40] },
});
