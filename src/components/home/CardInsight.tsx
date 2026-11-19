import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Insight, LinhaGrafico } from '@/data/home';
import { radius, space, useTema } from '@/theme';

import { Botao } from '../Botao';
import { Texto } from '../Texto';
import { IconeLupa } from './assets';

type Props = {
  insight: Insight;
  onExplorar: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Insight / Reflexão — título, explicação, gráfico "Noite anterior / Manhã seguinte" e ação. */
export function CardInsight({ insight, onExplorar, style }: Props) {
  const { cores } = useTema();
  return (
    <View style={[styles.card, { backgroundColor: cores.bg.raised }, style]}>
      <Texto estilo="Títulos/Médio">{insight.titulo}</Texto>
      <Texto estilo="Texto/Pequeno">{insight.explicacao}</Texto>
      <GraficoNoiteManha noite={insight.noite} manha={insight.manha} />
      <Botao
        rotulo="Explorar essa relação"
        corRotulo={cores.text.primary}
        icone={<IconeLupa width={22.64} height={24.03} corTraco={cores.action.neutral.default} />}
        onPress={onExplorar}
      />
    </View>
  );
}

const LARGURA_HORA = 32;
const LARGURA_MANHA = 142;

/** Evidence / Noite e manhã — dois blocos de horários ligados por uma linha vertical. */
function GraficoNoiteManha({ noite, manha }: { noite: LinhaGrafico[]; manha: LinhaGrafico[] }) {
  const { cores } = useTema();
  return (
    <View
      style={[styles.grafico, { backgroundColor: cores.bg.sunken }]}
      accessible
      accessibilityLabel="Gráfico: uso na noite anterior e como você se sentiu na manhã seguinte."
    >
      <View style={[styles.coluna, styles.colunaNoite]}>
        <Texto estilo="Legenda/Pequena">NOITE ANTERIOR</Texto>
        <View style={styles.linhas}>
          {noite.map((l) => (
            <Linha key={l.hora} linha={l} />
          ))}
        </View>
      </View>
      <View style={[styles.conector, { backgroundColor: cores.decor.accent }]} />
      <View style={[styles.coluna, styles.colunaManha]}>
        <Texto estilo="Legenda/Pequena">MANHÃ SEGUINTE</Texto>
        <View style={styles.linhas}>
          {manha.map((l) => (
            <Linha key={l.hora} linha={l} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Linha({ linha }: { linha: LinhaGrafico }) {
  const { cores } = useTema();
  const { icone: Icone, tipo, centro } = linha.marcador;
  return (
    <View style={styles.linha}>
      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.hora} numberOfLines={1}>
        {linha.hora}
      </Texto>
      <View style={styles.trilha}>
        <View style={[styles.risco, { backgroundColor: cores.decor.accent }]} />
        <View style={[styles.marcador, { left: `${centro * 100}%` }]}>
          <Icone
            width={16}
            height={16}
            corTraco={tipo === 'sucesso' ? cores.feedback.success : cores.feedback.error}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[12], padding: space[24], borderRadius: radius.md, overflow: 'hidden' },
  grafico: {
    flexDirection: 'row',
    gap: space[16],
    padding: space[12],
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  coluna: { gap: 10 },
  colunaNoite: { flex: 1 },
  colunaManha: { width: LARGURA_MANHA, gap: space[16] },
  conector: { width: 1, alignSelf: 'stretch' },
  linhas: { gap: space[4] },
  linha: { flexDirection: 'row', gap: space[16], height: 32, paddingVertical: space[4] },
  // No Figma a hora é Inter 11 px em 32 px; com Legenda/Pequena (12 px) a coluna cresce o necessário.
  hora: { minWidth: LARGURA_HORA, textAlign: 'right' },
  trilha: { flex: 1 },
  risco: { height: 1, borderRadius: radius.full },
  marcador: { position: 'absolute', top: 4, marginLeft: -8 },
});
