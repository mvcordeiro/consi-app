import { StyleSheet, View } from 'react-native';

import { emocaoPorId } from '@/data/emocoes';
import type { Reflexao } from '@/data/reflexoes';
import { radius, space, useTema, type Cores } from '@/theme';

import { Botao } from '../Botao';
import { Etiqueta } from '../Etiqueta';
import { Filtro } from '../Filtro';
import { Icone } from '../Icone';
import { Texto } from '../Texto';
import { BalaoEmocao } from './BalaoEmocao';

/** Cores das partes da barra de emoções, na ordem das mais registradas (DS: amarelo, rosa, sálvia, azul). */
const corDaParte = (c: Cores, i: number) => [c.feedback.warning, c.feedback.error, c.decor.sage, c.decor.accent][i] ?? c.border.default;

const ALTURA_BARRAS = 112;

/**
 * Card / Reflexão (DS 258:2042): título (Títulos/Médio), explicação (Texto/Pequeno, text/secondary),
 * o painel de cada tipo (bg/sunken, radius/lg) e o Botão Secundário com ícone.
 * Fundo bg/raised, radius/md, padding 24, espaço 12.
 */
export function CardReflexao({
  reflexao: r,
  largura,
  onAcao,
  onResponder,
}: {
  reflexao: Reflexao;
  largura: number;
  onAcao: (r: Reflexao) => void;
  /** Pergunta: marcar ou desmarcar uma opção. */
  onResponder: (opcao: string) => void;
}) {
  const { cores } = useTema();
  return (
    <View style={[styles.card, { width: largura, backgroundColor: cores.bg.raised }]}>
      <View style={styles.textos}>
        <Texto estilo="Títulos/Médio">{r.titulo}</Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          {r.explicacao}
        </Texto>
      </View>

      <Painel r={r} onResponder={onResponder} />

      <View style={styles.flex} />
      <Botao
        estilo="secundario"
        rotulo={r.acao.rotulo}
        icone={(cor) => <Icone nome={r.acao.icone} tamanho={20} cor={cor} />}
        onPress={() => onAcao(r)}
      />
    </View>
  );
}

function Painel({ r, onResponder }: { r: Reflexao; onResponder: (opcao: string) => void }) {
  const { cores } = useTema();
  const painel = [styles.painel, { backgroundColor: cores.bg.sunken }];
  switch (r.tipo) {
    case 'numero':
      return (
        <View style={painel}>
          <View style={styles.numeroLinha}>
            <Texto estilo="Títulos/Grande" cor={cores.text.accent}>
              {r.numero}
            </Texto>
            <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.flex}>
              {r.complemento}
            </Texto>
          </View>
          <Texto estilo="Texto/Pequeno">{r.legenda}</Texto>
          {r.etiqueta ? <Etiqueta rotulo={r.etiqueta.rotulo} tom={r.etiqueta.tom} style={styles.etiqueta} /> : null}
        </View>
      );
    case 'semana': {
      const max = Math.max(1, ...r.barras.map((b) => b.valor));
      return (
        <View style={painel}>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {r.legendaTopo}
          </Texto>
          <View style={styles.barras} accessible accessibilityLabel={r.barras.map((b) => `${b.rotulo}: ${b.valor}`).join(', ')}>
            {r.barras.map((b, i) => (
              <View key={i} style={styles.colunaBarra}>
                <View
                  style={[
                    styles.barra,
                    {
                      height: Math.max(6, (b.valor / max) * ALTURA_BARRAS),
                      backgroundColor: b.destaque ? cores.decor.accent : cores.bg.selected,
                    },
                  ]}
                />
                <Texto estilo="Legenda/Pequena" cor={b.destaque ? cores.text.primary : cores.text.tertiary}>
                  {b.rotulo}
                </Texto>
              </View>
            ))}
          </View>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {r.rodape}
          </Texto>
        </View>
      );
    }
    case 'emocoes':
      return (
        <View style={painel}>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {r.legendaTopo}
          </Texto>
          <View style={styles.pilha}>
            {r.partes.map((p, i) => (
              <View key={p.id} style={{ flex: Math.max(p.pct, 1), backgroundColor: corDaParte(cores, i) }} />
            ))}
          </View>
          <View style={styles.legendas}>
            {r.partes.map((p, i) => (
              <View key={p.id} style={styles.legenda}>
                <View style={[styles.ponto, { backgroundColor: corDaParte(cores, i) }]} />
                <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} numberOfLines={1}>
                  {`${p.nome} · ${p.pct}%`}
                </Texto>
              </View>
            ))}
          </View>
        </View>
      );
    case 'citacao': {
      const e = emocaoPorId(r.emocao);
      return (
        <View style={painel}>
          <View style={[styles.citacao, { borderLeftColor: cores.border.focus }]}>
            <Texto estilo="Texto/Médio">{`“${r.texto}”`}</Texto>
            <View style={styles.autor}>
              {e ? <BalaoEmocao Svg={e.Svg} Textura={e.Textura} circulo={e.circulo} tamanho={20} flutuar={false} /> : null}
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                {r.quando}
              </Texto>
            </View>
          </View>
        </View>
      );
    }
    case 'sequencia':
      return (
        <View style={painel}>
          {r.passos.map((p, i) => {
            const e = p.emocao ? emocaoPorId(p.emocao) : undefined;
            return (
              <View key={i} style={styles.passo}>
                <View style={styles.trilho}>
                  <View style={[styles.marcador, { backgroundColor: e ? cores.decor.accent : cores.bg.selected }]}>
                    {e ? (
                      <BalaoEmocao Svg={e.Svg} Textura={e.Textura} circulo={e.circulo} tamanho={18} flutuar={false} />
                    ) : (
                      <Icone nome="relogio" tamanho={14} cor={cores.icon.primary} />
                    )}
                  </View>
                  {i < r.passos.length - 1 ? <View style={[styles.linha, { backgroundColor: cores.border.subtle }]} /> : null}
                </View>
                <View style={[styles.flex, styles.passoTexto]}>
                  <Texto estilo="Texto/Botões e rótulos">{`${p.hora} · ${p.titulo}`}</Texto>
                  <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                    {p.detalhe}
                  </Texto>
                </View>
              </View>
            );
          })}
        </View>
      );
    case 'pergunta':
      return (
        <View style={styles.opcoes}>
          {r.opcoes.map((o) => (
            <Filtro key={o} rotulo={o} ativo={r.escolhidas.includes(o)} onPress={() => onResponder(o)} />
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: space[24], gap: space[12] },
  textos: { gap: space[8] },
  flex: { flex: 1 },
  painel: { borderRadius: radius.lg, padding: space[16], gap: space[12] },
  numeroLinha: { flexDirection: 'row', alignItems: 'baseline', gap: space[8] },
  etiqueta: { alignSelf: 'flex-start' },
  barras: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: ALTURA_BARRAS + 24 },
  colunaBarra: { alignItems: 'center', gap: space[8], flex: 1 },
  barra: { width: 18, borderRadius: radius.xs },
  pilha: { flexDirection: 'row', height: 8, borderRadius: radius.full, overflow: 'hidden', gap: 2 },
  legendas: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[8] },
  legenda: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: space[8], paddingRight: space[8] },
  ponto: { width: 8, height: 8, borderRadius: radius.full },
  citacao: { borderLeftWidth: 2, paddingLeft: space[16], gap: space[12] },
  autor: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  passo: { flexDirection: 'row', gap: space[12] },
  trilho: { alignItems: 'center', width: 28 },
  marcador: { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  linha: { width: 1, flex: 1, minHeight: 12 },
  passoTexto: { gap: space[2], paddingBottom: space[12] },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
