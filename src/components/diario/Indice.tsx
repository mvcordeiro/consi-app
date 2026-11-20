import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { emocaoPorId } from '@/data/emocoes';
import { DIAS_CURTOS, diasAtras, hora, MESES, type Momento } from '@/data/momentos';
import { borderWidth, radius, space, useTema } from '@/theme';

import { IconeLupa } from '../home/assets';
import { Icone } from '../Icone';
import { Texto } from '../Texto';
import { Premo } from './Premo';

/**
 * Campo de busca do topo do Diário (Figma 752:6445): pílula bg/raised de 48 px com a lupa
 * e "Buscar palavras, pessoas, lugares". Aqui é um botão que abre a tela de busca.
 */
export function BuscaDiario({ onPress, onControles }: { onPress: () => void; onControles: () => void }) {
  const { cores } = useTema();
  return (
    <View style={styles.linhaBusca}>
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel="Buscar no diário"
        style={({ pressed }) => [styles.busca, { backgroundColor: cores.bg.raised, opacity: pressed ? 0.85 : 1 }]}
      >
        <IconeLupa width={18.8} height={20} corTraco={cores.icon.primary} />
        <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} numberOfLines={1} style={styles.flex}>
          Buscar palavras, pessoas, lugares
        </Texto>
      </Pressable>
      <Pressable
        onPress={onControles}
        accessibilityRole="button"
        accessibilityLabel="Como ver o diário"
        style={({ pressed }) => [styles.controles, { backgroundColor: cores.bg.raised, opacity: pressed ? 0.85 : 1 }]}
      >
        <Icone nome="controles-verticais" />
      </Pressable>
    </View>
  );
}

/**
 * Filtro / Etiqueta do Índice (Figma 752:6448): ativa em action/primary/pressed com
 * text/on-secondary, inativa em bg/raised com text/primary.
 */
export function FiltroDiario({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      style={({ pressed }) => [
        styles.filtro,
        { backgroundColor: ativo ? cores.action.primary.pressed : cores.bg.raised, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Texto estilo="Texto/Botões e rótulos" cor={ativo ? cores.text['on-secondary'] : cores.text.primary}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

export function LinhaFiltros({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros} style={styles.filtrosFora}>
      {children}
    </ScrollView>
  );
}

/** "22:44" hoje, "ter" nesta semana, "12 nov" antes. */
function quandoNoIndice(em: number) {
  const n = diasAtras(em);
  const d = new Date(em);
  if (n === 0) return hora(em);
  if (n < 7) return DIAS_CURTOS[d.getDay()];
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

/**
 * Momento no Índice (Figma 760:5874): Premo de 48 px, o nome da emoção (Títulos/Pequeno)
 * com o horário, e o começo do texto numa linha. O mais recente leva o horário em text/accent
 * e o texto em text/primary; os outros em text/tertiary e text/secondary.
 */
export function ItemIndice({ momento, recente, onPress }: { momento: Momento; recente?: boolean; onPress: () => void }) {
  const { cores } = useTema();
  const nome = emocaoPorId(momento.id)?.nome ?? 'Momento';
  const resumo = momento.texto?.trim() || (momento.anexos?.length ? 'Momento com anexos' : 'Check-in sem texto. Toque para escrever.');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${quandoNoIndice(momento.em)}. ${resumo}`}
      style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Premo id={momento.id} tamanho={48} />
      <View style={styles.itemTextos}>
        <View style={styles.itemTopo}>
          <Texto estilo="Títulos/Pequeno" numberOfLines={1} style={styles.flex}>
            {nome}
          </Texto>
          <Texto estilo="Legenda/Pequena" cor={recente ? cores.text.accent : cores.text.tertiary}>
            {quandoNoIndice(momento.em)}
          </Texto>
        </View>
        <Texto
          estilo="Texto/Pequeno"
          cor={momento.texto ? (recente ? cores.text.primary : cores.text.secondary) : cores.text.tertiary}
          numberOfLines={1}
        >
          {resumo}
        </Texto>
      </View>
    </Pressable>
  );
}

/** Rótulo de grupo do Índice ("Hoje", "Esta semana"): Legenda/Pequena em text/tertiary. */
export function GrupoIndice({ rotulo }: { rotulo: string }) {
  const { cores } = useTema();
  return (
    <View style={styles.grupo}>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        {rotulo}
      </Texto>
    </View>
  );
}

/** Pílula "Comece a escrever" da Página de hoje (bg/base, 48 px), com microfone e câmera. */
export function ComeceAEscrever({
  onEscrever,
  onAudio,
  onFoto,
}: {
  onEscrever: () => void;
  onAudio: () => void;
  onFoto: () => void;
}) {
  const { cores } = useTema();
  return (
    <View style={[styles.comece, { backgroundColor: cores.bg.base }]}>
      <Pressable onPress={onEscrever} accessibilityRole="button" style={styles.flex}>
        <Texto estilo="Texto/Médio" cor={cores.text.tertiary}>
          Comece a escrever
        </Texto>
      </Pressable>
      <Pressable onPress={onAudio} hitSlop={8} accessibilityRole="button" accessibilityLabel="Gravar áudio">
        <Icone nome="microfone" cor={cores.text.tertiary} />
      </Pressable>
      <Pressable onPress={onFoto} hitSlop={8} accessibilityRole="button" accessibilityLabel="Adicionar foto">
        <Icone nome="camera" cor={cores.text.tertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  linhaBusca: { flexDirection: 'row', gap: 18 },
  busca: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space[16],
    borderRadius: radius.full,
  },
  controles: { height: 48, paddingHorizontal: space[16], borderRadius: radius.full, justifyContent: 'center' },
  filtrosFora: { marginHorizontal: -space[24] },
  filtros: { gap: space[8], paddingHorizontal: space[24] },
  filtro: { paddingHorizontal: space[12], paddingVertical: space[4], borderRadius: radius.full, borderWidth: borderWidth.thin, borderColor: 'transparent' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: space[12] },
  itemTextos: { flex: 1, gap: 2 },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  grupo: { paddingTop: space[8], paddingBottom: space[4] },
  comece: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: space[16],
    paddingRight: 14,
    borderRadius: radius.full,
  },
});
