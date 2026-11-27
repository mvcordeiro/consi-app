import { Pressable, StyleSheet, View } from 'react-native';

import { ESTILOS_TIMER, type EstiloTimer, type Grupo } from '@/data/gruposHome';
import { borderWidth, radius, space, useTema } from '@/theme';

import { Alternancia } from '../Alternancia';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

/**
 * "Timer no app" do grupo (Apenas pausar e Cuidar tempo): o timer flutuante por cima do app
 * (Figma 736:13664) ligado ou não, e o estilo dele. Desligado, a contagem fica na notificação
 * do Consi: sempre há um ou o outro.
 * PROVISÓRIO: os estilos Faixa e Bolha não têm design no Figma.
 */
export function OpcoesTimer({ grupo, onMudar }: { grupo: Grupo; onMudar: (g: Partial<Grupo>) => void }) {
  const { cores } = useTema();
  const ligado = grupo.timerFlutuante !== false;
  const estilo = grupo.estiloTimer ?? 'pilula';

  return (
    <View style={styles.coluna}>
      <View style={[styles.linha, { backgroundColor: cores.bg.raised }]}>
        <View style={styles.flex}>
          <Texto estilo="Texto/Botões e rótulos">Timer flutuante no app</Texto>
          <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
            {ligado
              ? 'Fica por cima do app. Arraste para mudar de lugar ou solte no X para esconder; o tempo continua na notificação.'
              : 'O tempo aparece na notificação do Consi, no topo do celular.'}
          </Texto>
        </View>
        <Alternancia ligado={ligado} onMudar={(v) => onMudar({ timerFlutuante: v })} rotulo="Timer flutuante no app" />
      </View>

      {ligado ? (
        <View style={styles.estilos} accessibilityRole="radiogroup">
          {ESTILOS_TIMER.map((e) => {
            const ativo = estilo === e.id;
            return (
              <Pressable
                key={e.id}
                onPress={() => onMudar({ estiloTimer: e.id })}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={`Estilo ${e.nome}`}
                style={({ pressed }) => [
                  styles.estilo,
                  {
                    backgroundColor: cores.bg.raised,
                    borderColor: ativo ? cores.border.focus : 'transparent',
                    borderWidth: ativo ? borderWidth.thick : borderWidth.thin,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.palco}>
                  <PreviaTimer estilo={e.id} />
                </View>
                <Texto estilo="Legenda/Pequena" cor={ativo ? cores.text.primary : cores.text.secondary}>
                  {e.nome}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Miniatura do timer como ele aparece por cima do app (o mesmo desenho do Bolha.kt). */
export function PreviaTimer({ estilo }: { estilo: EstiloTimer }) {
  const { cores } = useTema();
  const base = [styles.timer, { backgroundColor: cores.timer.bg, borderColor: cores.timer.border }];
  if (estilo === 'bolha') {
    return (
      <View style={[base, styles.bolha]}>
        <Texto estilo="Legenda/Pequena" cor={cores.timer.text}>
          12:03
        </Texto>
      </View>
    );
  }
  return (
    <View style={[base, estilo === 'faixa' ? styles.faixa : styles.pilula]}>
      <Icone nome="relogio" tamanho={16} cor={cores.timer.text} />
      <Texto estilo="Legenda/Pequena" cor={cores.timer.text}>
        12min
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[12] },
  flex: { flex: 1, gap: space[4] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16], borderRadius: radius.card },
  estilos: { flexDirection: 'row', gap: space[8] },
  estilo: { flex: 1, alignItems: 'center', gap: space[8], paddingVertical: space[12], borderRadius: radius.card },
  palco: { height: 88, alignItems: 'center', justifyContent: 'center' },
  timer: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  // Figma 736:13664: 20 px em cima e embaixo, 8 nas laterais, 8 entre o relógio e o tempo
  pilula: { paddingVertical: 20, paddingHorizontal: 8, gap: 8 },
  faixa: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, gap: 6 },
  bolha: { width: 56, height: 56 },
});
