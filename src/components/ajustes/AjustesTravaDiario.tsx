import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { definirBiometria, desligarTrava, destravarComAparelho, temBiometria, useTravaDiario } from '@/data/travaDiario';
import { space, useTema } from '@/theme';

import { Alternancia } from '../Alternancia';
import { Botao } from '../Botao';
import { Texto } from '../Texto';
import { Ajuste } from './Cartao';

/**
 * Ajustes → Privacidade e dados → Trancar o Diário (issue #12): liga com um PIN, biometria
 * opcional e trocar o PIN. Com o Diário trancado, mudar a trava pede o bloqueio do celular.
 */
export function AjustesTravaDiario() {
  const { cores } = useTema();
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
      descricao="Pede o PIN sempre que você abre o Diário. Escrever um momento novo continua livre. Se esquecer o PIN, o bloqueio do celular abre."
      acessorio={
        <Alternancia
          rotulo="Trancar o Diário"
          ligado={trava.ligada}
          onMudar={async (v) => {
            if (v) await irParaPin();
            else if (await confirmar()) await desligarTrava();
          }}
        />
      }
    >
      {trava.ligada ? (
        <View style={styles.coluna}>
          {bio ? (
            <View style={styles.linha}>
              <View style={styles.flex}>
                <Texto estilo="Texto/Médio">Abrir com digital ou rosto</Texto>
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                  No lugar do PIN, quando o celular reconhecer você.
                </Texto>
              </View>
              <Alternancia rotulo="Abrir com digital ou rosto" ligado={trava.biometria} onMudar={(v) => void definirBiometria(v)} />
            </View>
          ) : null}
          <Botao rotulo="Trocar o PIN" estilo="secundario" onPress={() => void irParaPin()} />
        </View>
      ) : null}
    </Ajuste>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[12] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  flex: { flex: 1 },
});
