import { Pressable, StyleSheet, View } from 'react-native';
import { ImagemLocal } from '../ImagemLocal';

import type { Bloco } from '@/data/catalogo';
import { borderWidth, inset, radius, space, useTema, type EstiloDeTexto } from '@/theme';

import { Icone } from '../Icone';
import { Texto } from '../Texto';

/** Estilo de texto de cada tipo de bloco (mesma tabela no editor). */
export const estiloDoBloco: Partial<Record<Bloco['tipo'], EstiloDeTexto>> = {
  h1: 'Títulos/Grande',
  h2: 'Títulos/Médio',
  h3: 'Títulos/Pequeno',
  texto: 'Texto/Médio',
  lista: 'Texto/Médio',
  numerada: 'Texto/Médio',
  tarefa: 'Texto/Médio',
  citacao: 'Texto/Grande',
  dica: 'Texto/Pequeno',
};

/** Número de cada item de lista numerada: conta a partir do primeiro de uma sequência. */
export function numeracao(blocos: Bloco[]) {
  const n: Record<string, number> = {};
  let conta = 0;
  for (const b of blocos) {
    conta = b.tipo === 'numerada' ? conta + 1 : 0;
    if (b.tipo === 'numerada') n[b.id] = conta;
  }
  return n;
}

/**
 * Conteúdo de uma atividade, em blocos (estilo Notion): títulos h1/h2/h3, texto, listas,
 * tarefas, citação, dica, imagem e divisor. Tarefas podem ser marcadas quando `onAlternarTarefa` existe.
 */
export function Blocos({ blocos, onAlternarTarefa }: { blocos: Bloco[]; onAlternarTarefa?: (id: string) => void }) {
  const numeros = numeracao(blocos);
  return (
    <View style={styles.coluna}>
      {blocos.map((b, i) => (
        <View key={b.id} style={espacoAntes(b, blocos[i - 1])}>
          <BlocoVisivel bloco={b} numero={numeros[b.id]} onAlternar={onAlternarTarefa} />
        </View>
      ))}
    </View>
  );
}

/** Títulos ganham mais ar acima; itens de lista seguidos ficam mais juntos. */
function espacoAntes(b: Bloco, anterior?: Bloco) {
  if (!anterior) return null;
  if (b.tipo === 'h1' || b.tipo === 'h2') return { marginTop: space[24] };
  if (b.tipo === 'h3') return { marginTop: space[16] };
  const lista = ['lista', 'numerada', 'tarefa'];
  if (lista.includes(b.tipo) && anterior.tipo === b.tipo) return { marginTop: space[8] };
  return { marginTop: space[12] };
}

function BlocoVisivel({ bloco: b, numero, onAlternar }: { bloco: Bloco; numero?: number; onAlternar?: (id: string) => void }) {
  const { cores } = useTema();
  const estilo = estiloDoBloco[b.tipo];

  switch (b.tipo) {
    case 'divisor':
      return <View style={[styles.divisor, { backgroundColor: cores.border.subtle }]} />;
    case 'imagem':
      return b.imagem ? (
        <ImagemLocal
          source={typeof b.imagem === 'string' ? { uri: b.imagem } : b.imagem}
          style={[styles.imagem, { aspectRatio: b.proporcao ?? 4 / 3, backgroundColor: cores.bg.raised }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null;
    case 'lista':
      return (
        <View style={styles.item}>
          <View style={styles.marcador}>
            <View style={[styles.ponto, { backgroundColor: cores.text.primary }]} />
          </View>
          <Texto estilo={estilo} style={styles.flex}>
            {b.texto}
          </Texto>
        </View>
      );
    case 'numerada':
      return (
        <View style={styles.item}>
          <View style={[styles.numero, { backgroundColor: cores.bg.raised }]}>
            <Texto estilo="Texto/Botões e rótulos">{numero}</Texto>
          </View>
          <Texto estilo={estilo} style={styles.flex}>
            {b.texto}
          </Texto>
        </View>
      );
    case 'tarefa':
      return (
        <Pressable
          disabled={!onAlternar}
          onPress={() => onAlternar?.(b.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!b.feito }}
          style={styles.item}
        >
          <CaixaTarefa feito={!!b.feito} />
          <Texto
            estilo={estilo}
            cor={b.feito ? cores.text.tertiary : undefined}
            style={[styles.flex, b.feito && styles.riscado]}
          >
            {b.texto}
          </Texto>
        </Pressable>
      );
    case 'citacao':
      return (
        <View style={[styles.citacao, { borderLeftColor: cores.border.focus }]}>
          <Texto estilo={estilo} cor={cores.text.secondary}>
            {b.texto}
          </Texto>
        </View>
      );
    case 'dica':
      return (
        <View style={[styles.dica, { backgroundColor: cores.bg.sunken }]}>
          <Icone nome="lampada" tamanho={20} />
          <Texto estilo={estilo} style={styles.flex}>
            {b.texto}
          </Texto>
        </View>
      );
    default:
      return <Texto estilo={estilo}>{b.texto}</Texto>;
  }
}

/** Caixinha de tarefa: contorno border/focus; marcada, fundo action/primary com o "✓" desenhado. */
export function CaixaTarefa({ feito }: { feito: boolean }) {
  const { cores } = useTema();
  return (
    <View
      style={[
        styles.caixa,
        { borderColor: feito ? cores.action.primary.default : cores.border.focus },
        feito && { backgroundColor: cores.action.primary.default },
      ]}
    >
      {feito ? <View style={[styles.check, { borderColor: cores.text['on-primary'] }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {},
  flex: { flex: 1, minWidth: 0 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  marcador: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  numero: { width: 24, height: 24, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  caixa: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: radius.xs,
    borderWidth: borderWidth.thick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 10,
    height: 6,
    marginTop: -2,
    borderLeftWidth: borderWidth.thick,
    borderBottomWidth: borderWidth.thick,
    transform: [{ rotate: '-45deg' }],
  },
  riscado: { textDecorationLine: 'line-through' },
  citacao: { borderLeftWidth: borderWidth.thick, paddingLeft: space[16], paddingVertical: space[4] },
  dica: { flexDirection: 'row', gap: space[12], padding: inset.md, borderRadius: radius.md },
  imagem: { width: '100%', borderRadius: radius.md },
  divisor: { height: borderWidth.thin, marginVertical: space[8] },
});
