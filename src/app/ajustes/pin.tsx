import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, Texto } from '@/components';
import { TelaAjustes } from '@/components/ajustes';
import { PontosPin, TecladoPin } from '@/components/diario/TecladoPin';
import { definirPin, PIN_MAX, PIN_MIN } from '@/data/travaDiario';
import { space, useTema } from '@/theme';

/**
 * Criar ou trocar o PIN do Diário (issue #12): digita de 4 a 6 dígitos, toca em Continuar e
 * repete. Também é o destino do "Esqueci o PIN", depois do bloqueio do celular.
 */
export default function DefinirPin() {
  const { cores } = useTema();
  const [primeiro, setPrimeiro] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const continuar = async () => {
    if (pin.length < PIN_MIN) return;
    if (primeiro === null) {
      setPrimeiro(pin);
      setPin('');
      return;
    }
    if (pin !== primeiro) {
      setErro('Os PINs não batem. Comece de novo.');
      setPrimeiro(null);
      setPin('');
      return;
    }
    await definirPin(pin);
    router.back();
  };

  return (
    <TelaAjustes
      titulo={primeiro === null ? 'Crie um PIN' : 'Repita o PIN'}
      voltar="Voltar"
      rodape={<Botao rotulo="Continuar" onPress={() => void continuar()} estado={pin.length >= PIN_MIN ? 'normal' : 'desabilitado'} />}
    >
      <Texto cor={erro ? cores.feedback.error : cores.text.secondary}>
        {erro ?? `De ${PIN_MIN} a ${PIN_MAX} números. Ele fica só neste celular; se esquecer, o bloqueio do celular abre o Diário.`}
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
