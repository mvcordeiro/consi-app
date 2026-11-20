import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { emocoes } from '@/data/emocoes';
import {
  diasAtras,
  editado,
  hora,
  MARCADORES_SUGERIDOS,
  MESES,
  type Anexo,
  type Destaque,
  type Momento,
} from '@/data/momentos';
import { borderWidth, radius, space, tipografia, useTema } from '@/theme';

import { Botao } from '../Botao';
import { Texto } from '../Texto';
import { PlayerAudio } from './Audio';
import { CampoMomento } from './CampoMomento';
import { FotoAnexada } from './Fotos';
import { Premo } from './Premo';

/** "Hoje, 13:05" · "Ontem, 08:20" · "12 nov, 21:00" */
function rotuloQuando(em: number) {
  const n = diasAtras(em);
  const d = new Date(em);
  const dia = n === 0 ? 'Hoje' : n === 1 ? 'Ontem' : `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
  return `${dia}, ${hora(em)}`;
}

/**
 * Etiqueta do Figma (125:34) tocável: fundo bg/base, ou bg/selected quando ativa
 * (action/primary/pressed do Figma não tem contraste com text/primary no modo Light).
 */
function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo?: boolean; onPress: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: ativo ? cores.bg.selected : cores.bg.base, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Texto estilo="Texto/Botões e rótulos" textBreakStrategy="simple">{rotulo}</Texto>
    </Pressable>
  );
}

/**
 * Editar momento (Figma 760:6339): folha bg/raised quase da altura da tela, com o Premo do
 * momento apagado ao fundo. Cancelar · "Editar momento" · Salvar; a fileira de emoções
 * (a escolhida com anel tracejado em action/secondary); "Quando" e marcadores em etiquetas;
 * o texto com borda border/focus e "editado agora". Tocar no horário mostra os ajustes de
 * 15 min; "+ marcador" abre as sugestões e um campo para criar outro.
 * É a mesma tela de edição para a lista e para a linha do tempo (rota /diario/editar).
 * Use com key={momento.em}: o estado começa do momento como está guardado.
 */
export function EditorMomento({
  momento,
  marcadoresUsados,
  onFechar,
  onSalvar,
  onApagar,
}: {
  momento: Momento;
  marcadoresUsados: string[];
  /** Cancelar: diz se havia alterações (para a tela perguntar antes de descartar). */
  onFechar: (alterado: boolean) => void;
  onSalvar: (em: number, mudancas: Partial<Momento>) => void;
  onApagar: (m: Momento) => void;
}) {
  const { cores } = useTema();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const emocoesRef = useRef<ScrollViewInstance | null>(null);

  // cada vez que abre (key = momento), começa do momento como está guardado
  const [id, setId] = useState(momento.id);
  const [em, setEm] = useState(momento.em);
  const [texto, setTexto] = useState(momento.texto ?? '');
  const [destaques, setDestaques] = useState<Destaque[]>(momento.destaques ?? []);
  const [marcadores, setMarcadores] = useState<string[]>(momento.marcadores ?? []);
  const [anexos, setAnexos] = useState<Anexo[]>(momento.anexos ?? []);
  const [editadoEm, setEditadoEm] = useState<number | undefined>(momento.editadoEm);
  const [ajustarHora, setAjustarHora] = useState(false);
  const [novoMarcador, setNovoMarcador] = useState<string | null>(null);

  // a fileira de emoções já abre mostrando a escolhida
  useEffect(() => {
    const i = emocoes.findIndex((e) => e.id === momento.id);
    setTimeout(() => emocoesRef.current?.scrollTo({ x: Math.max(0, i * 74 - width / 3), animated: false }), 50);
  }, [momento, width]);

  const mudarHora = (min: number) => {
    const novo = em + min * 60000;
    if (novo > Date.now()) return;
    setEm(novo);
  };

  const alterado =
    id !== momento.id ||
    em !== momento.em ||
    texto !== (momento.texto ?? '') ||
    JSON.stringify(destaques) !== JSON.stringify(momento.destaques ?? []) ||
    JSON.stringify(marcadores) !== JSON.stringify(momento.marcadores ?? []) ||
    (anexos.length !== (momento.anexos?.length ?? 0));

  const salvar = () => {
    const mudouTexto = (momento.texto ?? '') !== texto;
    onSalvar(momento.em, {
      id,
      em,
      texto: texto.trim() ? texto : undefined,
      destaques: destaques.length ? destaques : undefined,
      marcadores: marcadores.length ? marcadores : undefined,
      anexos: anexos.length ? anexos : undefined,
      editadoEm: mudouTexto ? Date.now() : momento.editadoEm,
    });
  };

  const sugestoes = [...new Set([...marcadoresUsados, ...MARCADORES_SUGERIDOS])].filter((m) => !marcadores.includes(m));
  const criarMarcador = () => {
    const m = novoMarcador?.trim();
    if (m && !marcadores.includes(m)) setMarcadores((l) => [...l, m]);
    setNovoMarcador(null);
  };

  return (
    <View style={[styles.fundo, { backgroundColor: cores.bg.sunken, paddingTop: top }]}>
        <View style={styles.premoFundo} pointerEvents="none">
          <Premo id={momento.id} tamanho={62} />
        </View>
        <KeyboardAvoidingView behavior="padding" style={[styles.folha, { backgroundColor: cores.bg.raised }]}>
          <View style={[styles.alca, { backgroundColor: cores.text.tertiary }]} />
          <View style={styles.cabecalho}>
            <Pressable onPress={() => onFechar(alterado)} hitSlop={10} accessibilityRole="button">
              <Texto estilo="Texto/Botões e rótulos" cor={cores.text.secondary}>
                Cancelar
              </Texto>
            </Pressable>
            <Texto estilo="Títulos/Pequeno">Editar momento</Texto>
            <Pressable onPress={salvar} hitSlop={10} accessibilityRole="button">
              <Texto estilo="Texto/Botões e rótulos" cor={cores.text.accent}>
                Salvar
              </Texto>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: bottom + space[24] }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Trocar emoção */}
            <ScrollView
              ref={(r: unknown) => {
                emocoesRef.current = r as ScrollViewInstance | null;
              }}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emocoes}
              style={styles.foraDaMargem}
            >
              {emocoes.map((e) => {
                const sel = e.id === id;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setId(e.id)}
                    accessibilityRole="button"
                    accessibilityLabel={e.nome}
                    accessibilityState={{ selected: sel }}
                    style={[styles.opcaoEmocao, !sel && { opacity: 0.5 }]}
                  >
                    <View
                      style={[
                        styles.anelEmocao,
                        sel && { borderColor: cores.action.secondary.default, borderWidth: borderWidth.thin, borderStyle: 'dashed' },
                      ]}
                    >
                      <Premo id={e.id} tamanho={sel ? 48 : 42} />
                    </View>
                    {/* o nome embaixo de cada balão, para saber qual emoção é qual */}
                    <Texto estilo="Legenda/Pequena" cor={sel ? cores.text.primary : cores.text.secondary} numberOfLines={1}>
                      {e.nome}
                    </Texto>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Quando e marcadores */}
            <View style={styles.chips}>
              <Chip rotulo={rotuloQuando(em)} ativo onPress={() => setAjustarHora((v) => !v)} />
              {marcadores.map((m) => (
                <Chip key={m} rotulo={`${m}  ×`} onPress={() => setMarcadores((l) => l.filter((x) => x !== m))} />
              ))}
              <Chip rotulo="+ marcador" onPress={() => setNovoMarcador((v) => (v === null ? '' : null))} />
            </View>

            {ajustarHora ? (
              <View style={[styles.painel, { backgroundColor: cores.bg.base }]}>
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                  Quando foi esse momento?
                </Texto>
                <View style={styles.horas}>
                  <Chip rotulo="− 15 min" onPress={() => mudarHora(-15)} />
                  <Texto estilo="Títulos/Médio">{hora(em)}</Texto>
                  <Chip rotulo="+ 15 min" onPress={() => mudarHora(15)} />
                </View>
              </View>
            ) : null}

            {novoMarcador !== null ? (
              <View style={[styles.painel, { backgroundColor: cores.bg.base }]}>
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                  Marque onde ou com quem você estava
                </Texto>
                <View style={styles.chips}>
                  {sugestoes.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setMarcadores((l) => [...l, m])}
                      accessibilityRole="button"
                      style={[styles.chip, { backgroundColor: cores.bg.raised }]}
                    >
                      <Texto estilo="Texto/Botões e rótulos" textBreakStrategy="simple">{m}</Texto>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={novoMarcador}
                  onChangeText={setNovoMarcador}
                  onSubmitEditing={criarMarcador}
                  placeholder="Criar marcador"
                  placeholderTextColor={cores.text.tertiary}
                  returnKeyType="done"
                  maxLength={24}
                  style={[tipografia['Texto/Pequeno'], styles.novoMarcador, { color: cores.text.primary, borderColor: cores.border.subtle }]}
                />
              </View>
            ) : null}

            {/* Campo · texto */}
            <View style={[styles.campo, { backgroundColor: cores.bg.base, borderColor: cores.border.focus }]}>
              <CampoMomento
                texto={texto}
                destaques={destaques}
                onMudar={(t, ds) => {
                  setTexto(t);
                  setDestaques(ds);
                  setEditadoEm(Date.now());
                }}
                placeholder="Escreva sobre esse momento"
                minimo={52}
              />
              {anexos.length ? (
                <View style={styles.anexos}>
                  {anexos.map((a, i) =>
                    a.tipo === 'audio' ? (
                      <View key={a.uri + i} style={styles.linha}>
                        <PlayerAudio uri={a.uri} duracao={a.duracao} onRemover={() => setAnexos((l) => l.filter((x) => x !== a))} />
                      </View>
                    ) : null,
                  )}
                  <View style={styles.linha}>
                    {anexos.map((a, i) =>
                      a.tipo === 'foto' ? (
                        <View key={a.uri + i}>
                          <FotoAnexada uri={a.uri} />
                          <Pressable
                            onPress={() => setAnexos((l) => l.filter((x) => x !== a))}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Remover foto"
                            style={[styles.tirarFoto, { backgroundColor: cores.bg.inverse }]}
                          >
                            <Texto estilo="Legenda/Pequena" cor={cores.text['on-inverse']}>
                              ×
                            </Texto>
                          </Pressable>
                        </View>
                      ) : null,
                    )}
                  </View>
                </View>
              ) : null}
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.editado}>
                {editado(editadoEm)}
              </Texto>
            </View>

            <Botao rotulo="Apagar momento" estilo="secundario" estado="erro" onPress={() => onApagar(momento)} />
          </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1 },
  premoFundo: { alignItems: 'center', paddingTop: space[24], height: 96, opacity: 0.35 },
  folha: {
    flex: 1,
    paddingTop: space[12],
    paddingHorizontal: space[24],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 18,
  },
  alca: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  conteudo: { gap: 18 },
  foraDaMargem: { marginHorizontal: -space[24] },
  emocoes: { gap: space[4], paddingHorizontal: space[24], alignItems: 'flex-start' },
  opcaoEmocao: { width: 70, alignItems: 'center', gap: space[4] },
  anelEmocao: { width: 62, height: 60, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  chip: { paddingHorizontal: space[12], paddingVertical: space[4], borderRadius: radius.full },
  painel: { gap: space[12], padding: space[16], borderRadius: radius.lg },
  horas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  novoMarcador: { padding: 0, height: 40, paddingHorizontal: space[12], borderWidth: borderWidth.thin, borderRadius: radius.md },
  campo: { gap: space[12], paddingTop: space[16], paddingBottom: 14, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1.5 },
  anexos: { gap: 10 },
  linha: { flexDirection: 'row', gap: 10 },
  editado: { alignSelf: 'flex-end' },
  tirarFoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
