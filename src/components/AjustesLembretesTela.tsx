import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  definirLembretesTela,
  INTERVALOS_TELA,
  lerLembretesTela,
  pedirNotificacoes,
  temLembretesDeTela,
  usePermissoes,
} from '@/data/vigia';
import { radius, space, useTema } from '@/theme';

import { Alternancia } from './Alternancia';
import { Botao } from './Botao';
import { Filtro } from './Filtro';
import { Texto } from './Texto';

/**
 * Ajustes · "Cuidado com o tempo de tela" (só no APK Android). Depois de 20 ou 30 minutos
 * seguidos de celular (tela acesa e desbloqueada, sem uma pausa de 1 minuto), uma notificação
 * sugere ajustar a postura, olhar para longe, relaxar os olhos ou alongar.
 * Vale para o celular todo, não só para o Consi, e não precisa do Acesso de uso.
 * Começa desligado: é a pessoa quem escolhe receber.
 * PROVISÓRIO: sem tela no Figma; layout e textos aguardam o design.
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
    <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
      <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary}>
        CUIDADO COM O TEMPO DE TELA
      </Texto>
      <View style={styles.linha}>
        <Texto estilo="Títulos/Pequeno" style={styles.flex}>
          Lembretes de pausa
        </Texto>
        <Alternancia
          ligado={estado.ligados}
          rotulo="Lembretes de pausa"
          onMudar={(ligados) => void mudar({ ...estado, ligados })}
        />
      </View>
      <Texto cor={cores.text.secondary}>
        Depois de um tempo seguido no celular, uma sugestão simples: ajustar a postura, olhar para longe, relaxar os
        olhos ou alongar. Conta o uso do celular todo, não só do Consi. Apagar a tela por 1 minuto já conta como pausa.
      </Texto>
      {estado.ligados ? (
        <View style={styles.permissao}>
          <Texto cor={cores.text.secondary}>Lembrar depois de</Texto>
          <View style={styles.chips}>
            {INTERVALOS_TELA.map((m) => (
              <Filtro key={m} rotulo={`${m} min`} ativo={estado.minutos === m} onPress={() => void mudar({ ...estado, minutos: m })} />
            ))}
          </View>
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
  cartao: { gap: space[12], padding: space[16], borderRadius: radius.card },
  permissao: { gap: space[8] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  flex: { flex: 1 },
});
