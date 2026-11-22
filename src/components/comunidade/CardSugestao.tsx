import { Pressable, StyleSheet, View } from 'react-native';

import type { Placar, Sugestao, ValorVoto } from '@/data/nuvem/tipos';
import { space, useTema } from '@/theme';

import { Etiqueta } from '../Etiqueta';
import { Texto } from '../Texto';
import { BotoesVoto } from './BotoesVoto';
import { NOME_CATEGORIA, NOME_MODERACAO, NOME_STATUS, quando, TOM_STATUS } from './rotulos';

/**
 * Card de uma sugestão na lista: título (até 2 linhas), categoria · status · data e, à direita,
 * os votos. A própria sugestão ainda não publicada mostra "Aguardando revisão" e não tem voto.
 */
export function CardSugestao({
  sugestao,
  onAbrir,
  onMudar,
  onErro,
  extra,
}: {
  sugestao: Sugestao;
  onAbrir: () => void;
  onMudar: (mudanca: Placar & { meuVoto: ValorVoto }) => void;
  onErro: (mensagem: string) => void;
  /** Linha extra embaixo (ex.: denúncias, na moderação). */
  extra?: string;
}) {
  const { cores } = useTema();
  const publicada = sugestao.moderacao === 'publicada';
  const meta = [sugestao.categoria ? NOME_CATEGORIA[sugestao.categoria] : null, quando(sugestao.criadaEm), sugestao.minha ? 'sua' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onAbrir}
        style={({ pressed }) => [styles.texto, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`${sugestao.titulo}. ${publicada ? NOME_STATUS[sugestao.status] : NOME_MODERACAO[sugestao.moderacao]}. ${meta}`}
        accessibilityHint="Abre os detalhes"
      >
        <Texto estilo="Títulos/Pequeno" numberOfLines={2}>
          {sugestao.titulo}
        </Texto>
        <View style={styles.etiquetas}>
          {publicada ? (
            <Etiqueta rotulo={NOME_STATUS[sugestao.status]} tom={TOM_STATUS[sugestao.status]} linhaUnica />
          ) : (
            <Etiqueta rotulo={NOME_MODERACAO[sugestao.moderacao]} tom={sugestao.moderacao === 'pendente' ? 'aviso' : 'erro'} linhaUnica />
          )}
        </View>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {meta}
        </Texto>
        {extra ? (
          <Texto estilo="Legenda/Pequena" cor={cores.feedback.error}>
            {extra}
          </Texto>
        ) : null}
      </Pressable>
      <BotoesVoto sugestao={sugestao} onMudar={onMudar} onErro={onErro} desligado={!publicada || sugestao.minha} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[16] },
  texto: { flex: 1, gap: space[8] },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
