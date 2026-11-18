import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao, Tela, Texto } from '@/components';
import { refazerOnboarding } from '@/data/onboarding';
import { radius, space, useTema } from '@/theme';

/**
 * Ajustes (provisório). Guarda os atalhos de teste que ficavam na Home provisória.
 */
export default function Ajustes() {
  const { cores } = useTema();

  const refazer = async () => {
    await refazerOnboarding();
    router.replace('/onboarding');
  };

  return (
    <Tela>
      <Texto estilo="Títulos/Grande">Ajustes</Texto>
      <Texto cor={cores.text.secondary}>Tela ainda não implementada.</Texto>
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
