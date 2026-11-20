import * as Clipboard from 'expo-clipboard';
import { useState, type ReactNode, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';

import type { Destaque } from '@/data/momentos';
import { tipografia, useTema, type EstiloDeTexto } from '@/theme';

import { Texto } from '../Texto';

/** Ajusta os destaques depois de uma edição do texto (o trecho mudado fica entre o começo e o fim em comum). */
export function ajustarDestaques(antes: string, depois: string, destaques: Destaque[]): Destaque[] {
  let p = 0;
  while (p < antes.length && p < depois.length && antes[p] === depois[p]) p++;
  let s = 0;
  while (s < antes.length - p && s < depois.length - p && antes[antes.length - 1 - s] === depois[depois.length - 1 - s]) s++;
  const fimAntigo = antes.length - s;
  const delta = depois.length - antes.length;
  return destaques
    .map((d) => {
      if (d.fim <= p) return d;
      if (d.inicio >= fimAntigo) return { inicio: d.inicio + delta, fim: d.fim + delta };
      return { inicio: Math.min(d.inicio, p), fim: Math.max(p, d.fim + delta) };
    })
    .filter((d) => d.fim > d.inicio);
}

/** Junta trechos que se encostam ou se cruzam. */
function juntar(lista: Destaque[]): Destaque[] {
  const o = [...lista].sort((a, b) => a.inicio - b.inicio);
  const out: Destaque[] = [];
  for (const d of o) {
    const u = out[out.length - 1];
    if (u && d.inicio <= u.fim) u.fim = Math.max(u.fim, d.fim);
    else out.push({ ...d });
  }
  return out;
}

/** Pedaços do texto, marcando os destacados. */
export function trechos(texto: string, destaques: Destaque[] = []) {
  const out: { t: string; destaque: boolean }[] = [];
  let i = 0;
  for (const d of juntar(destaques)) {
    if (d.inicio > i) out.push({ t: texto.slice(i, d.inicio), destaque: false });
    out.push({ t: texto.slice(Math.max(i, d.inicio), d.fim), destaque: true });
    i = Math.max(i, d.fim);
  }
  if (i < texto.length) out.push({ t: texto.slice(i), destaque: false });
  return out;
}

/** Texto com os destaques (fundo bg/selected), para mostrar fora do editor. */
export function TextoComDestaques({
  texto,
  destaques,
  cor,
  linhas,
  estilo = 'Texto/Pequeno',
}: {
  texto: string;
  destaques?: Destaque[];
  cor?: string;
  linhas?: number;
  estilo?: EstiloDeTexto;
}) {
  const { cores } = useTema();
  return (
    <Texto estilo={estilo} cor={cor ?? cores.text.secondary} numberOfLines={linhas}>
      {trechos(texto, destaques).map((p, i) =>
        p.destaque ? (
          <Text key={i} style={{ backgroundColor: cores.bg.selected, color: cores.text.primary }}>
            {p.t}
          </Text>
        ) : (
          p.t
        ),
      )}
    </Texto>
  );
}

/**
 * Campo de texto do momento (Figma 760:6223): Texto/Grande sobre bg/base, cantos de 20 px.
 * Ao selecionar um trecho, aparece o "Menu do trecho" (760:7068) em bg/inverse:
 * Destacar (ou Tirar destaque), Copiar e Apagar.
 */
export function CampoMomento({
  ref,
  texto,
  destaques,
  onMudar,
  placeholder,
  editavel = true,
  onFocus,
  onBlur,
  autoFocus,
  minimo,
  cheio,
}: {
  /** Ocupa a altura disponível (o texto rola dentro do campo). */
  cheio?: boolean;
  ref?: Ref<TextInputInstance>;
  texto: string;
  destaques: Destaque[];
  onMudar: (texto: string, destaques: Destaque[]) => void;
  placeholder: string;
  editavel?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  /** Altura mínima do texto. */
  minimo?: number;
}) {
  const { cores } = useTema();
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const [menu, setMenu] = useState(false);

  const temSelecao = menu && sel.end > sel.start;
  const jaDestacado = destaques.some((d) => d.inicio <= sel.start && d.fim >= sel.end);

  const destacar = () => {
    const novos = jaDestacado
      ? destaques.flatMap((d) => {
          if (d.fim <= sel.start || d.inicio >= sel.end) return [d];
          return [
            { inicio: d.inicio, fim: sel.start },
            { inicio: sel.end, fim: d.fim },
          ].filter((x) => x.fim > x.inicio);
        })
      : juntar([...destaques, { inicio: sel.start, fim: sel.end }]);
    onMudar(texto, novos);
    setMenu(false);
  };
  const copiar = () => {
    Clipboard.setStringAsync(texto.slice(sel.start, sel.end));
    setMenu(false);
  };
  const apagar = () => {
    const novo = texto.slice(0, sel.start) + texto.slice(sel.end);
    onMudar(novo, ajustarDestaques(texto, novo, destaques));
    setMenu(false);
  };

  return (
    <View style={cheio ? styles.cheio : undefined}>
      {temSelecao ? (
        <View style={[styles.menu, { backgroundColor: cores.bg.inverse }]}>
          {[
            [jaDestacado ? 'Tirar destaque' : 'Destacar', destacar],
            ['Copiar', copiar],
            ['Apagar', apagar],
          ].map(([rotulo, f], i) => (
            <Pressable
              key={rotulo as string}
              onPress={f as () => void}
              accessibilityRole="button"
              style={[styles.acao, i < 2 && { borderRightWidth: 1, borderRightColor: cores.border.subtle }]}
            >
              <Texto estilo="Texto/Botões e rótulos" cor={cores.text['on-inverse']}>
                {rotulo as string}
              </Texto>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        ref={ref}
        multiline
        editable={editavel}
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={editavel ? cores.text.tertiary : cores.text.disabled}
        selectionColor={cores.action.primary.default}
        cursorColor={cores.action.secondary.default}
        onFocus={onFocus}
        onBlur={() => {
          setMenu(false);
          onBlur?.();
        }}
        onChangeText={(t) => onMudar(t, ajustarDestaques(texto, t, destaques))}
        onSelectionChange={(e) => {
          const s = e.nativeEvent.selection;
          setSel(s);
          setMenu(s.end > s.start);
        }}
        accessibilityLabel="Texto do momento"
        style={[tipografia['Texto/Grande'], styles.entrada, cheio && styles.cheio, { color: cores.text.primary, minHeight: minimo }]}
        // na web o campo não aceita trechos com estilo: mostra o texto puro
        value={Platform.OS === 'web' ? texto : undefined}
      >
        {Platform.OS === 'web' ? null : trechos(texto, destaques).map((p, i) =>
          p.destaque ? (
            <Text key={i} style={{ backgroundColor: cores.bg.selected }}>
              {p.t}
            </Text>
          ) : (
            <Text key={i}>{p.t}</Text>
          ),
        )}
      </TextInput>
    </View>
  );
}

/** Rodapé do campo: só para ter um nó estável onde as telas encaixam contagem e anexos. */
export function RodapeCampo({ children }: { children: ReactNode }) {
  return <View style={styles.rodape}>{children}</View>;
}

const styles = StyleSheet.create({
  cheio: { flex: 1 },
  entrada: { padding: 0, textAlignVertical: 'top', outlineStyle: 'none' } as object,
  menu: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    zIndex: 2,
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
  },
  acao: { paddingHorizontal: 16, paddingVertical: 12 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
