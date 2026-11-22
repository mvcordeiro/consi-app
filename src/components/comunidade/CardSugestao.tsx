import { Pressable, StyleSheet, View } from 'react-native';

import type { Placar, Sugestao, ValorVoto } from '@/data/nuvem/tipos';
import { space, useTema } from '@/theme';

import { Texto } from '../Texto';
import { BotoesVoto } from './BotoesVoto';
import { ChipModeracao, ChipStatus } from './Chips';
import { NOME_CATEGORIA, NOME_MODERACAO, NOME_STATUS, quando } from './rotulos';

/**
 * Uma sugestão na lista, direto no fundo: título (até 2 linhas); embaixo, o chip de estado e
 * "Categoria · quando"; e a linha de votos ↑ n ↓. A própria sugestão ainda não publicada mostra
 * "Aguardando revisão" e não tem voto.
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
  /** Linha extra (ex.: denúncias, na moderação). */
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
        <View style={styles.meta}>
          {publicada ? <ChipStatus status={sugestao.status} /> : <ChipModeracao moderacao={sugestao.moderacao} />}
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.flex} numberOfLines={1}>
            {meta}
          </Texto>
        </View>
        {extra ? (
          <Texto estilo="Legenda/Pequena" cor={cores.feedback.error}>
            {extra}
          </Texto>
        ) : null}
      </Pressable>
      <View style={styles.votos}>
        <BotoesVoto sugestao={sugestao} onMudar={onMudar} onErro={onErro} desligado={!publicada || sugestao.minha} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[16], gap: space[8] },
  texto: { gap: space[8] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
  // Alinha a primeira seta com o texto (o toque das setas é maior que o desenho).
  votos: { flexDirection: 'row', marginLeft: -space[8] },
});
