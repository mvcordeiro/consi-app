import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  definirLembretesTela,
  INTERVALOS_TELA,
  lerLembretesTela,
  passoDoIntervalo,
  pedirNotificacoes,
  temLembretesDeTela,
  usePermissoes,
} from '@/data/vigia';
import { space, useTema } from '@/theme';

import { Alternancia } from './Alternancia';
import { Botao } from './Botao';
import { EscalaPassos } from './EscalaPassos';
import { Texto } from './Texto';

/**
 * Ajustes · "Cuidado com o tempo de tela" (só no APK Android). Depois de 10 a 50 minutos
 * (escala de 5 passos) seguidos de celular (tela acesa e desbloqueada, sem uma pausa de 1 minuto), uma notificação
 * sugere ajustar a postura, olhar para longe, relaxar os olhos ou alongar.
 * Vale para o celular todo, não só para o Consi, e não precisa do Acesso de uso.
 * Começa desligado: é a pessoa quem escolhe receber.
 */
export function AjustesLembretesTela() {
  const { cores } = useTema();
  const { permissoes, reler } = usePermissoes();
  const [estado, setEstado] = useState(lerLembretesTela);
  if (!temLembretesDeTela) return null;

  const mudar = async (novo: typeof estado) => {
    if (novo.ligados && !estado.ligados && !permissoes.notificacoes) {
      await pedirNotificacoes();
      reler();
    }
    definirLembretesTela(novo);
    setEstado(lerLembretesTela());
  };

  return (
    <View style={styles.secao}>
      <View style={styles.linha}>
        <Texto estilo="Títulos/Pequeno" style={styles.flex} accessibilityRole="header">
          Lembretes de pausa
        </Texto>
        <Alternancia
          ligado={estado.ligados}
          rotulo="Lembretes de pausa"
          onMudar={(ligados) => void mudar({ ...estado, ligados })}
        />
      </View>
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Depois de um tempo seguido no celular, uma sugestão simples: ajustar a postura, olhar para longe, relaxar os
        olhos ou alongar. Conta o uso do celular todo, não só do Consi. Apagar a tela por 1 minuto já conta como pausa.
      </Texto>
      {estado.ligados ? (
        <View style={styles.permissao}>
          <Texto cor={cores.text.secondary}>Lembrar depois de</Texto>
          <EscalaPassos
            quantidade={INTERVALOS_TELA.length}
            indice={passoDoIntervalo(estado.minutos)}
            onMudar={(i) => void mudar({ ...estado, minutos: INTERVALOS_TELA[i] })}
            rotulo="Lembrar depois de"
            valorAcessivel={`${INTERVALOS_TELA[passoDoIntervalo(estado.minutos)]} minutos`}
            rotulos={INTERVALOS_TELA.map((m) => `${m} min`)}
          />
        </View>
      ) : null}
      {estado.ligados && !permissoes.notificacoes ? (
        <View style={styles.permissao}>
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            Sem notificações, os lembretes não aparecem.
          </Texto>
          <Botao
            rotulo="Permitir notificações"
            estilo="secundario"
            onPress={async () => {
              await pedirNotificacoes();
              reler();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[12], paddingVertical: space[16] },
  permissao: { gap: space[8] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
});
