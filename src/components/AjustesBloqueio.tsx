import { Pressable, StyleSheet, View } from 'react-native';

import { BLOQUEIO_MAX, BLOQUEIO_MIN, gravarBloqueio, useBloqueio } from '@/data/pausa';
import { temPausaDeVerdade } from '@/data/vigia';
import { radius, space, useTema } from '@/theme';

import { Alternancia } from './Alternancia';
import { Filtro } from './Filtro';
import { Icone } from './Icone';
import { Texto } from './Texto';

const ATALHOS = [3, 5, 10, 15, 30];

/**
 * Ajustes · "Fechar o app depois de não abrir" (só no APK Android). Depois do "Dessa vez não
 * abro" (ou de sair do app na pausa), o app fica fechado pelo tempo escolhido: tentar abrir
 * mostra a pausa sem a opção de continuar. Ligado por padrão, 5 minutos; atalhos de 3 a 30 min
 * e − / + para qualquer tempo entre 1 min e 2 h.
 */
export function AjustesBloqueio() {
  const { cores } = useTema();
  const b = useBloqueio();
  if (!temPausaDeVerdade) return null;

  const somar = (d: number) => void gravarBloqueio({ ...b, minutos: b.minutos + d });

  return (
    <View style={styles.secao}>
      <View style={styles.linha}>
        <Texto estilo="Títulos/Pequeno" style={styles.flex} accessibilityRole="header">
          Manter fechado depois de não abrir
        </Texto>
        <Alternancia
          ligado={b.ligado}
          rotulo="Manter fechado depois de não abrir"
          onMudar={(ligado) => void gravarBloqueio({ ...b, ligado })}
        />
      </View>
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Quando você escolhe não abrir um app na pausa, ou sair dele, ele fica fechado por um tempo. Assim a escolha
        vale de verdade.
      </Texto>
      {b.ligado ? (
        <View style={styles.tempo}>
          <View style={styles.passos}>
            <Passo icone="subtrair" rotulo="Um minuto a menos" desligado={b.minutos <= BLOQUEIO_MIN} onPress={() => somar(-1)} />
            <Texto estilo="Títulos/Médio" style={styles.valor} accessibilityLiveRegion="polite">
              {b.minutos} min
            </Texto>
            <Passo icone="adicionar" rotulo="Um minuto a mais" desligado={b.minutos >= BLOQUEIO_MAX} onPress={() => somar(1)} />
          </View>
          <View style={styles.chips}>
            {ATALHOS.map((m) => (
              <Filtro key={m} rotulo={`${m} min`} ativo={b.minutos === m} onPress={() => void gravarBloqueio({ ...b, minutos: m })} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Passo({
  icone,
  rotulo,
  desligado,
  onPress,
}: {
  icone: 'adicionar' | 'subtrair';
  rotulo: string;
  desligado: boolean;
  onPress: () => void;
}) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      disabled={desligado}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desligado }}
      style={({ pressed }) => [
        styles.passo,
        { backgroundColor: cores.bg.sunken, opacity: desligado ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Icone nome={icone} tamanho={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[12], paddingVertical: space[16] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
  tempo: { gap: space[12] },
  passos: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  passo: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  valor: { minWidth: 80, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
