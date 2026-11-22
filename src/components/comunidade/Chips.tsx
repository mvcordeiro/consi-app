import { StyleSheet, View } from 'react-native';

import type { Moderacao, StatusSugestao } from '@/data/nuvem/tipos';
import { borderWidth, radius, space, useTema, type Cores } from '@/theme';

import { Texto } from '../Texto';
import { NOME_MODERACAO, NOME_STATUS } from './rotulos';

/** Cor do ponto de cada status: sempre um tom de feedback, que contrasta com os dois fundos. */
function corStatus(c: Cores, s: StatusSugestao) {
  switch (s) {
    case 'aberta':
      return c.icon.secondary;
    case 'em_analise':
    case 'planejada':
      return c.feedback.info;
    case 'em_andamento':
      return c.feedback.warning;
    case 'lancada':
      return c.feedback.success;
    case 'recusada':
      return c.feedback.error;
  }
}

function corModeracao(c: Cores, m: Moderacao) {
  return m === 'publicada' ? c.feedback.success : m === 'pendente' ? c.feedback.warning : c.feedback.error;
}

/**
 * Chip de estado: contorno border/default, ponto colorido e texto em text/primary. Não depende de
 * um fundo "suave" (que no Dark some contra o bg/base): o contraste vem do texto e do contorno.
 */
export function Chip({ rotulo, cor }: { rotulo: string; cor?: string }) {
  const { cores } = useTema();
  return (
    <View style={[styles.chip, { borderColor: cores.border.default }]} accessible accessibilityLabel={rotulo}>
      {cor ? <View style={[styles.ponto, { backgroundColor: cor }]} /> : null}
      <Texto estilo="Legenda/Pequena" numberOfLines={1}>
        {rotulo}
      </Texto>
    </View>
  );
}

export function ChipStatus({ status }: { status: StatusSugestao }) {
  const { cores } = useTema();
  return <Chip rotulo={NOME_STATUS[status]} cor={corStatus(cores, status)} />;
}

export function ChipModeracao({ moderacao }: { moderacao: Moderacao }) {
  const { cores } = useTema();
  return <Chip rotulo={NOME_MODERACAO[moderacao]} cor={corModeracao(cores, moderacao)} />;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4] + 2,
    paddingHorizontal: space[8],
    paddingVertical: space[2],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignSelf: 'flex-start',
  },
  ponto: { width: 6, height: 6, borderRadius: 3 },
});
