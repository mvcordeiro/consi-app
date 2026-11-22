import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { space, useTema } from '@/theme';

import { Botao } from '../Botao';
import { Texto } from '../Texto';
import { mensagemErro } from './rotulos';

/** Carregando: indicador centralizado, anunciado ao leitor de tela. */
export function Carregando({ rotulo = 'Carregando' }: { rotulo?: string }) {
  const { cores } = useTema();
  return (
    <View style={styles.centro} accessible accessibilityLabel={rotulo} accessibilityLiveRegion="polite">
      <ActivityIndicator color={cores.action.primary.default} />
    </View>
  );
}

/** Erro da nuvem com a frase certa e o botão de tentar de novo. */
export function FalhaNuvem({ erro, onTentar }: { erro: unknown; onTentar: () => void }) {
  const { cores } = useTema();
  return (
    <View style={styles.centro} accessibilityLiveRegion="polite">
      <Texto estilo="Títulos/Pequeno" style={styles.texto}>
        Não deu para carregar
      </Texto>
      <Texto cor={cores.text.secondary} style={styles.texto}>
        {mensagemErro(erro)}
      </Texto>
      <Botao rotulo="Tentar de novo" estilo="secundario" onPress={onTentar} />
    </View>
  );
}

/** Lista vazia: título, explicação e uma ação opcional. */
export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: { rotulo: string; onPress: () => void } }) {
  const { cores } = useTema();
  return (
    <View style={styles.centro}>
      <Texto estilo="Títulos/Pequeno" style={styles.texto}>
        {titulo}
      </Texto>
      {descricao ? (
        <Texto cor={cores.text.secondary} style={styles.texto}>
          {descricao}
        </Texto>
      ) : null}
      {acao ? <Botao rotulo={acao.rotulo} estilo="secundario" onPress={acao.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center', gap: space[12], paddingVertical: space[48], paddingHorizontal: space[16] },
  texto: { textAlign: 'center' },
});
