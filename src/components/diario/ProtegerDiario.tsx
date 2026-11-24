import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { conferirPin, destravarComAparelho, useTravaDiario } from '@/data/travaDiario';
import { space, useTema } from '@/theme';

import { Botao } from '../Botao';
import { Icone } from '../Icone';
import { Texto } from '../Texto';
import { PontosPin, TecladoPin } from './TecladoPin';

/** Depois de tantos erros seguidos, o teclado espera ESPERA_MS. */
const ERROS_ATE_ESPERAR = 5;
const ESPERA_MS = 30 * 1000;
let erros = 0;
let esperarAte = 0;

/**
 * Tranca de leitura do Diário (issue #12): com a trava ligada e o Diário trancado, mostra o PIN
 * (e a biometria, se ligada) no lugar do conteúdo. "Esqueci o PIN" usa o bloqueio do celular e
 * leva para criar um PIN novo.
 */
export function ProtegerDiario({ children }: { children: ReactNode }) {
  const trava = useTravaDiario();
  if (!trava.carregado || !trava.trancado) return trava.carregado ? <>{children}</> : null;
  return <TelaTrancada biometria={trava.biometria} tamanho={trava.tamanho} />;
}

function TelaTrancada({ biometria, tamanho }: { biometria: boolean; tamanho: number }) {
  const { cores } = useTema();
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const pediu = useRef(false);
  const esperando = esperarAte > agora;

  // Com biometria ligada, ela abre sozinha só quando o Diário está na frente. A aba do Diário
  // fica montada por trás das outras: sem o foco, a trava pediria a digital em qualquer tela.
  useFocusEffect(
    useCallback(() => {
      if (biometria && !pediu.current) {
        pediu.current = true;
        void destravarComAparelho();
      }
      return () => {
        pediu.current = false;
      };
    }, [biometria]),
  );

  useEffect(() => {
    if (!esperando) return;
    const t = setTimeout(() => setAgora(Date.now()), esperarAte - Date.now() + 50);
    return () => clearTimeout(t);
  }, [esperando]);

  const mudar = async (novo: string) => {
    setErro(false);
    setPin(novo);
    if (novo.length < tamanho) return;
    if (await conferirPin(novo)) {
      erros = 0;
      return;
    }
    erros += 1;
    if (erros >= ERROS_ATE_ESPERAR) {
      erros = 0;
      esperarAte = Date.now() + ESPERA_MS;
      setAgora(Date.now());
    }
    setErro(true);
    setPin('');
  };

  const esqueci = async () => {
    if (await destravarComAparelho(true)) router.push('/ajustes/pin' as Href);
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom']}>
      <View style={styles.topo}>
        <Icone nome="cadeado" tamanho={32} />
        <Texto estilo="Títulos/Grande" style={styles.centro}>
          Seu Diário está trancado
        </Texto>
        <Texto cor={erro ? cores.feedback.error : cores.text.secondary} style={styles.centro} accessibilityLiveRegion="polite">
          {esperando ? 'Muitas tentativas. Espere 30 segundos.' : erro ? 'PIN errado. Tente de novo.' : 'Digite o seu PIN.'}
        </Texto>
        <PontosPin quantos={pin.length} erro={erro} />
      </View>
      <TecladoPin
        pin={pin}
        onMudar={(p) => void mudar(p)}
        desabilitado={esperando}
        extra={biometria ? { icone: 'cadeado', rotulo: 'Usar biometria', onPress: () => void destravarComAparelho() } : undefined}
      />
      <Botao rotulo="Esqueci o PIN" estilo="secundario" onPress={() => void esqueci()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'space-between', padding: space[24], gap: space[24] },
  topo: { alignItems: 'center', gap: space[16], paddingTop: space[40] },
  centro: { textAlign: 'center' },
});
