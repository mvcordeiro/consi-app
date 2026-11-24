import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { ImagemLocal } from '../ImagemLocal';

import { guardarArquivo } from '@/data/arquivos';
import { novoIdBloco, type Bloco, type TipoBloco } from '@/data/catalogo';
import { borderWidth, primitivas, radius, size, space, tipografia, useTema } from '@/theme';

import { Folha, ItemFolha } from '../Folha';
import { Icone, type NomeIcone } from '../Icone';
import { Texto } from '../Texto';
import { CaixaTarefa, estiloDoBloco, numeracao } from './Blocos';

/** Tipos de bloco que o editor oferece, com o ícone do Design System e a dica de atalho. */
export const tiposDeBloco: { tipo: TipoBloco; rotulo: string; icone: NomeIcone; atalho?: string; marca?: string }[] = [
  { tipo: 'texto', rotulo: 'Texto', icone: 'texto-quadrado' },
  { tipo: 'h1', rotulo: 'Título 1', icone: 'tamanho-fonte', atalho: '#', marca: 'H1' },
  { tipo: 'h2', rotulo: 'Título 2', icone: 'tamanho-fonte', atalho: '##', marca: 'H2' },
  { tipo: 'h3', rotulo: 'Título 3', icone: 'tamanho-fonte', atalho: '###', marca: 'H3' },
  { tipo: 'lista', rotulo: 'Lista', icone: 'lista-marcadores', atalho: '-' },
  { tipo: 'numerada', rotulo: 'Lista numerada', icone: 'lista-numerada', atalho: '1.' },
  { tipo: 'tarefa', rotulo: 'Tarefa', icone: 'lista-tarefas', atalho: '[]' },
  { tipo: 'citacao', rotulo: 'Citação', icone: 'aspas', atalho: '>' },
  { tipo: 'dica', rotulo: 'Dica', icone: 'lampada' },
  { tipo: 'imagem', rotulo: 'Imagem', icone: 'inserir-imagem' },
  { tipo: 'divisor', rotulo: 'Divisor', icone: 'subtrair', atalho: '---' },
];

/** Atalhos de markdown no começo do texto, como no Notion: "# " vira Título 1 etc. */
const atalhos: [RegExp, TipoBloco][] = [
  [/^### /, 'h3'],
  [/^## /, 'h2'],
  [/^# /, 'h1'],
  [/^[-*] /, 'lista'],
  [/^1[.)] /, 'numerada'],
  [/^\[ ?\] /, 'tarefa'],
  [/^> /, 'citacao'],
];

const LISTAS: TipoBloco[] = ['lista', 'numerada', 'tarefa'];
const SEM_TEXTO: TipoBloco[] = ['imagem', 'divisor'];

export type Editor = ReturnType<typeof useEditorBlocos>;

/** Estado do editor de blocos: a lista, o bloco em foco e as ações da barra. */
export function useEditorBlocos(inicial: Bloco[]) {
  const [blocos, setBlocos] = useState<Bloco[]>(inicial.length ? inicial : [{ id: novoIdBloco(), tipo: 'texto', texto: '' }]);
  const [focado, setFocado] = useState<string | null>(null);
  const [focar, setFocar] = useState<string | null>(null);

  const mudar = (id: string, parcial: Partial<Bloco>) =>
    setBlocos((bs) => bs.map((b) => (b.id === id ? { ...b, ...parcial } : b)));

  const inserirDepois = (id: string | null, novo: Bloco) => {
    setBlocos((bs) => {
      const i = id ? bs.findIndex((b) => b.id === id) : bs.length - 1;
      const lista = [...bs];
      lista.splice(i + 1, 0, novo);
      // depois de imagem ou divisor, sempre deixa um texto para continuar escrevendo
      if (SEM_TEXTO.includes(novo.tipo) && !lista[i + 2]) lista.splice(i + 2, 0, { id: novoIdBloco(), tipo: 'texto', texto: '' });
      return lista;
    });
    if (!SEM_TEXTO.includes(novo.tipo)) setFocar(novo.id);
  };

  const remover = (id: string) => {
    setBlocos((bs) => {
      if (bs.length === 1) return [{ id: novoIdBloco(), tipo: 'texto', texto: '' }];
      const i = bs.findIndex((b) => b.id === id);
      const anterior = bs.slice(0, i).reverse().find((b) => !SEM_TEXTO.includes(b.tipo));
      if (anterior) setFocar(anterior.id);
      return bs.filter((b) => b.id !== id);
    });
  };

  const mover = (id: string, delta: -1 | 1) =>
    setBlocos((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const lista = [...bs];
      [lista[i], lista[j]] = [lista[j], lista[i]];
      return lista;
    });

  const escolherImagem = async (depoisDe: string | null) => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (r.canceled || !r.assets[0]) return;
    const { uri, width, height } = r.assets[0];
    inserirDepois(depoisDe, { id: novoIdBloco(), tipo: 'imagem', imagem: await guardarArquivo(uri), proporcao: width && height ? width / height : 4 / 3 });
  };

  /** Barra: transforma o bloco em foco (ou insere imagem/divisor depois dele). */
  const aplicarTipo = (tipo: TipoBloco) => {
    if (tipo === 'imagem') return escolherImagem(focado);
    if (tipo === 'divisor') return inserirDepois(focado, { id: novoIdBloco(), tipo: 'divisor' });
    if (focado) {
      mudar(focado, { tipo, feito: tipo === 'tarefa' ? false : undefined });
      setFocar(focado);
    } else inserirDepois(null, { id: novoIdBloco(), tipo, texto: '' });
  };

  return { blocos, setBlocos, focado, setFocado, focar, setFocar, mudar, inserirDepois, remover, mover, aplicarTipo, escolherImagem };
}

/**
 * Editor de conteúdo em blocos (estilo Notion). Enter cria o próximo bloco (em listas,
 * outro item; num item vazio, sai da lista), Backspace num bloco vazio apaga e volta ao anterior,
 * "/" abre o menu de tipos e os atalhos de markdown ("# ", "- ", "1. ", "[] ", "> ") convertem o bloco.
 */
export function EditorBlocos({ editor, placeholder = 'Escreva, ou digite "/" para escolher um bloco' }: { editor: Editor; placeholder?: string }) {
  const { cores } = useTema();
  const refs = useRef(new Map<string, TextInputInstance>());
  const [menuDe, setMenuDe] = useState<string | null>(null);
  const numeros = numeracao(editor.blocos);
  const { focar, setFocar } = editor;

  useEffect(() => {
    if (!focar) return;
    const r = refs.current.get(focar);
    if (r) {
      r.focus();
      setFocar(null);
    }
  }, [focar, setFocar, editor.blocos]);

  const aoMudarTexto = (b: Bloco, texto: string) => {
    if (texto === '/') {
      editor.mudar(b.id, { texto: '' });
      setMenuDe(b.id);
      return;
    }
    if (texto === '---') {
      editor.mudar(b.id, { tipo: 'divisor', texto: undefined });
      editor.inserirDepois(b.id, { id: novoIdBloco(), tipo: 'texto', texto: '' });
      return;
    }
    for (const [re, tipo] of atalhos) {
      if (re.test(texto) && b.tipo !== tipo) {
        editor.mudar(b.id, { tipo, texto: texto.replace(re, ''), feito: tipo === 'tarefa' ? false : undefined });
        return;
      }
    }
    editor.mudar(b.id, { texto });
  };

  const aoEnter = (b: Bloco) => {
    const vazio = !b.texto?.trim();
    if (LISTAS.includes(b.tipo) && vazio) {
      editor.mudar(b.id, { tipo: 'texto' });
      return;
    }
    const tipo: TipoBloco = LISTAS.includes(b.tipo) ? b.tipo : 'texto';
    editor.inserirDepois(b.id, { id: novoIdBloco(), tipo, texto: '', feito: tipo === 'tarefa' ? false : undefined });
  };

  return (
    <View style={styles.coluna}>
      {editor.blocos.map((b, i) => {
        if (b.tipo === 'divisor') {
          return (
            <Pressable key={b.id} onLongPress={() => editor.remover(b.id)} style={styles.divisorToque} accessibilityHint="Segure para apagar">
              <View style={[styles.divisor, { backgroundColor: cores.border.subtle }]} />
            </Pressable>
          );
        }
        if (b.tipo === 'imagem') {
          return (
            <View key={b.id}>
              {b.imagem ? (
                <ImagemLocal
                  source={typeof b.imagem === 'string' ? { uri: b.imagem } : b.imagem}
                  style={[styles.imagem, { aspectRatio: b.proporcao ?? 4 / 3, backgroundColor: cores.bg.raised }]}
                />
              ) : null}
              <Pressable
                onPress={() => editor.remover(b.id)}
                accessibilityRole="button"
                accessibilityLabel="Remover imagem"
                style={[styles.removerImagem, { backgroundColor: cores.bg.scrim }]}
              >
                {/* sobre o véu escuro (bg/scrim), o ícone fica sempre branco */}
                <Icone nome="excluir" tamanho={16} cor={primitivas.neutral[0]} />
              </Pressable>
            </View>
          );
        }
        const estilo = estiloDoBloco[b.tipo] ?? 'Texto/Médio';
        const emFoco = editor.focado === b.id;
        return (
          <View
            key={b.id}
            style={[
              styles.linha,
              i > 0 && (b.tipo === 'h1' || b.tipo === 'h2') && styles.antesTitulo,
              b.tipo === 'citacao' && [styles.citacao, { borderLeftColor: cores.border.focus }],
              b.tipo === 'dica' && [styles.dica, { backgroundColor: cores.bg.sunken }],
            ]}
          >
            {b.tipo === 'lista' ? (
              <View style={styles.marcador}>
                <View style={[styles.ponto, { backgroundColor: cores.text.primary }]} />
              </View>
            ) : b.tipo === 'numerada' ? (
              <View style={[styles.numero, { backgroundColor: cores.bg.raised }]}>
                <Texto estilo="Texto/Botões e rótulos">{numeros[b.id]}</Texto>
              </View>
            ) : b.tipo === 'tarefa' ? (
              <Pressable onPress={() => editor.mudar(b.id, { feito: !b.feito })} hitSlop={6}>
                <CaixaTarefa feito={!!b.feito} />
              </Pressable>
            ) : b.tipo === 'dica' ? (
              <Icone nome="lampada" tamanho={20} />
            ) : null}
            <TextInput
              ref={(r) => {
                if (r) refs.current.set(b.id, r);
                else refs.current.delete(b.id);
              }}
              value={b.texto ?? ''}
              onChangeText={(t) => aoMudarTexto(b, t)}
              onFocus={() => editor.setFocado(b.id)}
              onSubmitEditing={() => aoEnter(b)}
              submitBehavior="submit"
              onKeyPress={(e) => {
                if (e.nativeEvent.key === 'Backspace' && !b.texto) {
                  if (b.tipo !== 'texto') editor.mudar(b.id, { tipo: 'texto' });
                  else editor.remover(b.id);
                }
              }}
              multiline
              scrollEnabled={false}
              placeholder={i === 0 || emFoco ? placeholder : undefined}
              placeholderTextColor={cores.text.tertiary}
              accessibilityLabel={tiposDeBloco.find((t) => t.tipo === b.tipo)?.rotulo}
              style={[
                tipografia[estilo],
                styles.entrada,
                { color: b.tipo === 'citacao' ? cores.text.secondary : cores.text.primary },
                b.feito && { textDecorationLine: 'line-through', color: cores.text.tertiary },
              ]}
            />
          </View>
        );
      })}

      <Folha visivel={!!menuDe} onFechar={() => setMenuDe(null)} titulo="Transformar em">
        <ScrollView style={styles.menu}>
          {tiposDeBloco.map((t) => (
            <ItemFolha
              key={t.tipo}
              rotulo={t.atalho ? `${t.rotulo}   ${t.atalho}` : t.rotulo}
              icone={(cor) => <Icone nome={t.icone} cor={cor} />}
              onPress={() => {
                const alvo = menuDe;
                setMenuDe(null);
                if (!alvo) return;
                if (t.tipo === 'imagem') editor.escolherImagem(alvo);
                else if (t.tipo === 'divisor') editor.inserirDepois(alvo, { id: novoIdBloco(), tipo: 'divisor' });
                else {
                  editor.mudar(alvo, { tipo: t.tipo, feito: t.tipo === 'tarefa' ? false : undefined });
                  editor.setFocar(alvo);
                }
              }}
            />
          ))}
        </ScrollView>
      </Folha>
    </View>
  );
}

/**
 * Barra de ferramentas do editor, fixa acima do teclado: um botão por tipo de bloco
 * (ícones do Design System), mover para cima e apagar o bloco em foco.
 */
export function BarraBlocos({ editor }: { editor: Editor }) {
  const { cores } = useTema();
  const focado = editor.blocos.find((b) => b.id === editor.focado);
  return (
    <View style={[styles.barra, { backgroundColor: cores.bg.raised, borderTopColor: cores.border.subtle }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.barraTrilho}>
        {tiposDeBloco.map((t) => {
          const ativo = focado?.tipo === t.tipo;
          return (
            <Pressable
              key={t.tipo}
              onPress={() => editor.aplicarTipo(t.tipo)}
              accessibilityRole="button"
              accessibilityLabel={t.rotulo}
              accessibilityState={{ selected: ativo }}
              style={[styles.ferramenta, ativo && { backgroundColor: cores.action.primary.pressed }]}
            >
              {t.marca ? (
                <Texto estilo="Texto/Botões e rótulos">{t.marca}</Texto>
              ) : (
                <Icone nome={t.icone} tamanho={20} />
              )}
            </Pressable>
          );
        })}
        <View style={[styles.separador, { backgroundColor: cores.border.subtle }]} />
        <Pressable
          disabled={!focado}
          onPress={() => focado && editor.mover(focado.id, -1)}
          accessibilityRole="button"
          accessibilityLabel="Mover bloco para cima"
          style={[styles.ferramenta, !focado && styles.desligado]}
        >
          <Icone nome="reordenar" tamanho={20} />
        </Pressable>
        <Pressable
          disabled={!focado}
          onPress={() => focado && editor.remover(focado.id)}
          accessibilityRole="button"
          accessibilityLabel="Apagar bloco"
          style={[styles.ferramenta, !focado && styles.desligado]}
        >
          <Icone nome="lixeira" tamanho={20} cor={cores.feedback.error} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[8] },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  antesTitulo: { marginTop: space[12] },
  entrada: { flex: 1, minWidth: 0, padding: 0, outlineStyle: 'none' } as object,
  marcador: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  numero: { width: 24, height: 24, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  citacao: { borderLeftWidth: borderWidth.thick, paddingLeft: space[16] },
  dica: { padding: space[16], borderRadius: radius.md },
  imagem: { width: '100%', borderRadius: radius.md },
  removerImagem: {
    position: 'absolute',
    top: space[8],
    right: space[8],
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divisorToque: { paddingVertical: space[8] },
  divisor: { height: borderWidth.thin },
  menu: { maxHeight: 420 },
  barra: { borderTopWidth: borderWidth.thin },
  barraTrilho: { paddingHorizontal: space[12], paddingVertical: space[8], gap: space[4], alignItems: 'center' },
  ferramenta: {
    width: size['touch-target'],
    height: size['touch-target'],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: { width: borderWidth.thin, height: 24, marginHorizontal: space[4] },
  desligado: { opacity: 0.4 },
});
