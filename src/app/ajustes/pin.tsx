import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components';
import { TelaAjustes } from '@/components/ajustes';
import { PontosPin, TecladoPin } from '@/components/diario/TecladoPin';
import { definirPin, PIN_MAX, PIN_MIN } from '@/data/travaDiario';
import { space, useTema } from '@/theme';

/**
 * Criar ou trocar o PIN do Diário (issue #12), em dois passos com o passo à vista:
 * 1. escolher de 4 a 6 números; 2. digitar de novo para confirmar. Se não bater, explica e
 * volta ao passo 1. Também é o destino do "Esqueci o PIN", depois do bloqueio do celular.
 */
export default function DefinirPin() {
  const { cores } = useTema();
  const [primeiro, setPrimeiro] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const confirmando = primeiro !== null;

  const continuar = async () => {
    if (pin.length < PIN_MIN) return;
    if (!confirmando) {
      setPrimeiro(pin);
      setPin('');
      return;
    }
    if (pin !== primeiro) {
      setErro('Os dois PINs ficaram diferentes. Escolha o PIN de novo e repita igual.');
      setPrimeiro(null);
      setPin('');
      return;
    }
    await definirPin(pin);
    router.back();
  };

  return (
    <TelaAjustes
      titulo={confirmando ? 'Confirme o PIN' : 'Escolha um PIN'}
      voltar="Voltar"
      rodape={
        <Botao
          rotulo={confirmando ? 'Confirmar PIN' : 'Continuar'}
          onPress={() => void continuar()}
          estado={pin.length >= PIN_MIN ? 'normal' : 'desabilitado'}
        />
      }
    >
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        {confirmando ? 'PASSO 2 DE 2' : 'PASSO 1 DE 2'}
      </Texto>
      <Texto cor={erro ? cores.feedback.error : cores.text.secondary} accessibilityLiveRegion="polite">
        {erro ??
          (confirmando
            ? 'Digite o mesmo PIN mais uma vez, para ter certeza de que você lembra dele.'
            : `Escolha de ${PIN_MIN} a ${PIN_MAX} números e toque em Continuar. Depois você vai digitar de novo para confirmar. Ele fica só neste celular; se esquecer, o bloqueio do celular abre o Diário.`)}
      </Texto>
      <View style={styles.pin}>
        <PontosPin quantos={pin.length} />
        <TecladoPin
          pin={pin}
          onMudar={(p) => {
            setErro(null);
            setPin(p);
          }}
        />
      </View>
    </TelaAjustes>
  );
}

const styles = StyleSheet.create({
  pin: { gap: space[24], paddingTop: space[16] },
});
