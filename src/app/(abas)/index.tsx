import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao, Tela, Texto } from '@/components';
import { refazerOnboarding } from '@/data/onboarding';
import { radius, space, useTema } from '@/theme';

/**
 * Home (provisória). Será substituída pela Home do Figma na próxima etapa.
 * Por enquanto oferece um atalho para refazer o onboarding durante os testes.
 */
export default function Inicio() {
  const { cores } = useTema();

  const refazer = async () => {
    await refazerOnboarding();
    router.replace('/onboarding');
  };

  return (
    <Tela>
      <Texto estilo="Títulos/Grande">Home</Texto>
      <Texto cor={cores.text.secondary}>Onboarding concluído. A Home será implementada a seguir.</Texto>
      <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary}>
          PARA TESTES
        </Texto>
        <Botao rotulo="Refazer onboarding" onPress={refazer} />
        <Botao rotulo="Abrir tela de pausa" estilo="secundario" onPress={() => router.push('/pausa')} />
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: space[12], padding: space[16], borderRadius: radius.card },
});
