import { router } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '@/components';
import { Aparecer } from '@/components/animacao';
import { FiltroDiario } from '@/components/diario/Indice';
import { Premo } from '@/components/diario/Premo';
import { IconeLupa } from '@/components/home/assets';
import { emocaoPorId } from '@/data/emocoes';
import { acharTermo, chaveDia, DIAS_CURTOS, hora, nomeMes, plural, useMomentos, type Momento } from '@/data/momentos';
import { borderWidth, radius, space, tipografia, useTema } from '@/theme';

type Pagina = { chave: string; data: Date; doDia: Momento[]; achado: Momento };

/** O trecho onde o termo aparece, com um pouco de contexto antes. */
function trechoComTermo(texto: string, termo: string) {
  const a = acharTermo(texto, termo);
  if (!a) return { antes: texto, termo: '', depois: '' };
  const inicio = a.inicio > 28 ? texto.lastIndexOf(' ', a.inicio - 20) + 1 : 0;
  return {
    antes: (inicio > 0 ? '…' : '') + texto.slice(inicio, a.inicio),
    termo: texto.slice(a.inicio, a.fim),
    depois: texto.slice(a.fim),
  };
}

/**
 * Caderno · Índice · buscando (Figma 760:7078): busca em todo o diário (texto, emoção e
 * marcadores) e mostra as páginas (dias) onde o termo aparece: o dia em Títulos/Grande,
 * o trecho com o termo sublinhado em text/accent e as emoções do dia empilhadas.
 * Sem termo, sugere marcadores e emoções já usados.
 */
export default function Busca() {
  const { cores } = useTema();
  const todos = useMomentos();
  const [termo, setTermo] = useState('');
  const t = termo.trim();

  const paginas = useMemo<Pagina[]>(() => {
    if (!t) return [];
    const porDia = new Map<string, Momento[]>();
    for (const m of todos) porDia.set(chaveDia(m.em), [...(porDia.get(chaveDia(m.em)) ?? []), m]);
    const out: Pagina[] = [];
    for (const [chave, doDia] of porDia) {
      const achado = doDia.find(
        (m) => (m.texto && acharTermo(m.texto, t)) || acharTermo(emocaoPorId(m.id)?.nome ?? '', t) || m.marcadores?.some((x) => acharTermo(x, t)),
      );
      if (achado) out.push({ chave, data: new Date(achado.em), doDia, achado });
    }
    return out.sort((a, b) => b.achado.em - a.achado.em);
  }, [todos, t]);

  const marcadores = useMemo(() => [...new Set(todos.flatMap((m) => m.marcadores ?? []))].slice(0, 8), [todos]);
  const emocoesUsadas = useMemo(() => [...new Set(todos.map((m) => m.id))].slice(0, 8), [todos]);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'left', 'right']}>
      <View style={styles.topo}>
        <View style={[styles.campo, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
          <IconeLupa width={18.8} height={20} corTraco={cores.icon.primary} />
          <TextInput
            autoFocus
            value={termo}
            onChangeText={setTermo}
            placeholder="Buscar palavras, pessoas, lugares"
            placeholderTextColor={cores.text.tertiary}
            selectionColor={cores.action.primary.default}
            cursorColor={cores.action.secondary.default}
            returnKeyType="search"
            accessibilityLabel="Buscar no diário"
            style={[tipografia['Texto/Pequeno'], styles.entrada, { color: cores.text.primary }]}
          />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Texto estilo="Texto/Botões e rótulos" cor={cores.text.accent}>
            Cancelar
          </Texto>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {t ? (
          <>
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.contagem}>
              {paginas.length ? `${plural(paginas.length, 'página', 'páginas')} com “${t}”` : `Nada encontrado para “${t}”`}
            </Texto>
            <Aparecer key={t} deslocamento={4} duracao={300}>
              {paginas.map((p, i) => {
                const novoMes = i === 0 ? p.data.getMonth() !== new Date().getMonth() : p.data.getMonth() !== paginas[i - 1].data.getMonth();
                return (
                  <Fragment key={p.chave}>
                    {novoMes ? (
                      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.mes}>
                        {nomeMes(p.data.getMonth())}
                      </Texto>
                    ) : null}
                    <ResultadoBusca pagina={p} termo={t} />
                  </Fragment>
                );
              })}
            </Aparecer>
          </>
        ) : (
          <View style={styles.sugestoes}>
            {marcadores.length ? (
              <View style={styles.grupo}>
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                  Seus marcadores
                </Texto>
                <View style={styles.chips}>
                  {marcadores.map((m) => (
                    <FiltroDiario key={m} rotulo={m} ativo={false} onPress={() => setTermo(m)} />
                  ))}
                </View>
              </View>
            ) : null}
            {emocoesUsadas.length ? (
              <View style={styles.grupo}>
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                  Emoções que você registrou
                </Texto>
                <View style={styles.chips}>
                  {emocoesUsadas.map((id) => (
                    <FiltroDiario key={id} rotulo={emocaoPorId(id)?.nome ?? id} ativo={false} onPress={() => setTermo(emocaoPorId(id)?.nome ?? id)} />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultadoBusca({ pagina, termo }: { pagina: Pagina; termo: string }) {
  const { cores } = useTema();
  const { data, doDia, achado } = pagina;
  const textoBase = achado.texto && acharTermo(achado.texto, termo) ? achado.texto : (achado.texto ?? emocaoPorId(achado.id)?.nome ?? '');
  const tr = trechoComTermo(textoBase, termo);
  const emocoesDoDia = [...new Set(doDia.map((m) => m.id))].slice(0, 3);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/diario/dia', params: { data: pagina.chave } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pagina, { borderBottomColor: cores.border.subtle, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.data}>
        <Texto estilo="Títulos/Grande">{data.getDate()}</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.semana}>
          {DIAS_CURTOS[data.getDay()].toUpperCase()}
        </Texto>
      </View>
      <View style={styles.textos}>
        <Texto estilo="Texto/Médio" numberOfLines={1}>
          {tr.antes}
          {tr.termo ? <Text style={{ color: cores.text.accent, textDecorationLine: 'underline' }}>{tr.termo}</Text> : null}
          {tr.depois}
        </Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {plural(doDia.length, 'momento', 'momentos')} · {hora(achado.em)}
        </Texto>
      </View>
      <View style={styles.emocoes}>
        {emocoesDoDia.map((id, i) => (
          <View key={id} style={{ marginLeft: i ? -8 : 0, zIndex: 3 - i }}>
            <Premo id={id} tamanho={24} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space[24], paddingTop: space[8] },
  campo: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space[16],
    borderRadius: radius.full,
    borderWidth: borderWidth.medium,
  },
  entrada: { flex: 1, padding: 0, outlineStyle: 'none' } as object,
  conteudo: { paddingHorizontal: space[24], paddingBottom: space[40] },
  contagem: { marginTop: 18, marginBottom: 30 },
  mes: { marginTop: space[16], marginBottom: space[4] },
  pagina: { flexDirection: 'row', alignItems: 'flex-start', gap: space[16], paddingVertical: 14, borderBottomWidth: 1 },
  data: { width: 40 },
  semana: { letterSpacing: 0.72 },
  textos: { flex: 1, gap: space[4] },
  emocoes: { flexDirection: 'row' },
  sugestoes: { gap: space[24], paddingTop: space[24] },
  grupo: { gap: space[12] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
