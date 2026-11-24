import { StyleSheet, View } from 'react-native';

import {
  definirLembretesAtividadesLigados,
  temLembretesAtividades,
  useLembretesAtividadesLigados,
} from '@/data/lembretesAtividades';
import { pedirNotificacoes } from '@/data/vigia';
import { space, useTema } from '@/theme';

import { Alternancia } from './Alternancia';
import { Texto } from './Texto';

/**
 * Ajustes → Pausa e lembretes: chave geral dos lembretes de atividades (issue #13). Cada
 * lembrete é escolhido na atividade ("Adicionar à agenda"); aqui dá para calar todos de uma vez.
 */
export function AjustesLembretesAtividades() {
  const { cores } = useTema();
  const ligados = useLembretesAtividadesLigados();
  if (!temLembretesAtividades) return null;

  return (
    <View style={styles.secao}>
      <View style={styles.linha}>
        <Texto estilo="Títulos/Pequeno" style={styles.flex} accessibilityRole="header">
          Lembretes de atividades
        </Texto>
        <Alternancia
          ligado={ligados}
          rotulo="Lembretes de atividades"
          onMudar={async (l) => {
            if (l) await pedirNotificacoes();
            await definirLembretesAtividadesLigados(l);
          }}
        />
      </View>
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Um aviso no dia e no horário que você marcou em cada atividade, em Adicionar à agenda. Desligado, nenhuma
        atividade avisa.
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[8] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  flex: { flex: 1 },
});
