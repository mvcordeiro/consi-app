import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { definirBiometria, desligarTrava, destravarComAparelho, temBiometria, useTravaDiario } from '@/data/travaDiario';
import { space } from '@/theme';

import { Alternancia } from '../Alternancia';
import { Botao } from '../Botao';
import { Ajuste } from './Cartao';

/**
 * Ajustes → Privacidade e dados → Trancar o Diário (issue #12): liga com um PIN, biometria
 * opcional e trocar o PIN. Desligar pede o bloqueio do celular (ou o PIN, se não houver).
 */
export function AjustesTravaDiario() {
  const trava = useTravaDiario();
  const [bio, setBio] = useState(false);
  useEffect(() => {
    temBiometria().then(setBio);
  }, []);
  // Trancado, mudar a trava pede o bloqueio do celular (senão bastaria o celular desbloqueado).
  const confirmar = async () => !trava.trancado || (await destravarComAparelho(true));
  const irParaPin = async () => {
    if (await confirmar()) router.push('/ajustes/pin' as Href);
  };

  return (
    <Ajuste
      titulo="Trancar o Diário"
      descricao="Pede um PIN para ler o Diário ao abrir o app e depois de 1 minuto fora dele. Escrever um momento novo continua livre. Se esquecer o PIN, o bloqueio do celular abre."
    >
      <View style={styles.coluna}>
        <Alternancia
          rotulo="Trancar o Diário"
          ligado={trava.ligada}
          onMudar={async (v) => {
            if (v) await irParaPin();
            else if (await confirmar()) await desligarTrava();
          }}
        />
        {trava.ligada && bio ? (
          <View style={styles.linha}>
            <Alternancia rotulo="Abrir com digital ou rosto" ligado={trava.biometria} onMudar={(v) => void definirBiometria(v)} />
          </View>
        ) : null}
        {trava.ligada ? <Botao rotulo="Trocar o PIN" estilo="secundario" onPress={() => void irParaPin()} /> : null}
      </View>
    </Ajuste>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[12] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
});
