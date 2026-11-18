import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Platform, Pressable, StyleSheet, View, type HostInstance } from 'react-native';

import type { Comentario, ReacaoId } from '@/data/catalogo';
import { borderWidth, radius, space, useTema } from '@/theme';

import { Avatar } from '../Avatar';
import { vibrar } from '../hobbies/Arraste';
import { Icone } from '../Icone';
import { Texto } from '../Texto';
import { ChipsReacoes, type Ancora } from './Reacoes';

const nativo = Platform.OS !== 'web';
/** Quanto arrastar para a esquerda para responder. */
const LIMIAR_RESPOSTA = 64;
/** A partir daqui o recuo das respostas diminui, para o texto não ficar estreito demais. */
const MAX_NIVEL = 3;

export type NoConversa = { c: Comentario; filhos: NoConversa[] };

/** Monta a árvore de respostas a partir da lista (cada comentário aponta para o pai). */
export function montarArvore(lista: Comentario[]): NoConversa[] {
  const nos = new Map(lista.map((c) => [c.id, { c, filhos: [] as NoConversa[] }]));
  const raiz: NoConversa[] = [];
  for (const c of lista) {
    const no = nos.get(c.id)!;
    const pai = c.paiId ? nos.get(c.paiId) : undefined;
    if (pai) pai.filhos.push(no);
    else raiz.push(no);
  }
  return raiz;
}

const contarRespostas = (n: NoConversa): number => n.filhos.reduce((t, f) => t + 1 + contarRespostas(f), 0);

type Acoes = {
  minhaReacao: (id: string) => ReacaoId | undefined;
  onResponder: (c: Comentario) => void;
  onReagir: (c: Comentario, r: ReacaoId | null) => void;
  onSegurar: (c: Comentario, ancora: Ancora) => void;
  onAbrirImagem: (uri: string) => void;
};

/**
 * Conversa em threads (estilo Reddit): cada resposta fica recuada, com uma linha à esquerda
 * que liga ao comentário de cima. Tocar na linha recolhe a thread ("+ 3 respostas"); tocar de novo abre.
 */
export function Thread({ no, nivel = 0, acoes }: { no: NoConversa; nivel?: number; acoes: Acoes }) {
  const { cores } = useTema();
  const [aberta, setAberta] = useState(true);
  const total = contarRespostas(no);

  return (
    <View>
      <ItemComentario comentario={no.c} acoes={acoes} />
      {no.filhos.length ? (
        aberta ? (
          <View style={styles.respostas}>
            <Pressable
              onPress={() => setAberta(false)}
              accessibilityRole="button"
              accessibilityLabel="Recolher respostas"
              hitSlop={{ left: 8, right: 4 }}
              style={[styles.linhaToque, nivel >= MAX_NIVEL && styles.linhaEstreita]}
            >
              <View style={[styles.linha, { backgroundColor: cores.border.subtle }]} />
            </Pressable>
            <View style={styles.filhos}>
              {no.filhos.map((f) => (
                <Thread key={f.c.id} no={f} nivel={nivel + 1} acoes={acoes} />
              ))}
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setAberta(true)}
            accessibilityRole="button"
            style={[styles.recolhida, { borderColor: cores.border.subtle }]}
          >
            <Icone nome="adicionar" tamanho={14} cor={cores.text.secondary} />
            <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
              {total === 1 ? '1 resposta' : `${total} respostas`}
            </Texto>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

/**
 * Um comentário. Arrastar para a esquerda revela "Responder" (vibra no limite e responde ao soltar);
 * segurar vibra e abre o painel de reações logo abaixo.
 */
function ItemComentario({ comentario: c, acoes }: { comentario: Comentario; acoes: Acoes }) {
  const { cores } = useTema();
  const ref = useRef<HostInstance>(null);
  const [pan] = useState(() => new Animated.Value(0));
  const vivo = useRef({ acoes, c, passou: false });
  useLayoutEffect(() => {
    vivo.current.acoes = acoes;
    vivo.current.c = c;
  });

  // eslint-disable-next-line react-hooks/refs -- os handlers só leem o ref nos eventos
  const [gesto] = useState(() => {
    const v = vivo.current;
    const soltar = (dx: number) => {
      if (dx < -LIMIAR_RESPOSTA) v.acoes.onResponder(v.c);
      v.passou = false;
      Animated.spring(pan, { toValue: 0, useNativeDriver: nativo, speed: 16, bounciness: 6 }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onMoveShouldSetPanResponderCapture: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        // resistência depois do limite, como um elástico
        const dx = Math.min(0, g.dx);
        pan.setValue(dx < -LIMIAR_RESPOSTA ? -LIMIAR_RESPOSTA + (dx + LIMIAR_RESPOSTA) * 0.3 : dx);
        const passou = dx < -LIMIAR_RESPOSTA;
        if (passou !== v.passou) {
          v.passou = passou;
          if (passou) vibrar('limite');
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => soltar(g.dx),
      onPanResponderTerminate: () => soltar(0),
    });
  });

  const segurar = () => {
    vibrar('limite');
    ref.current?.measureInWindow((x, y, largura, altura) => acoes.onSegurar(c, { x, y, largura, altura }));
  };

  const mostrarResposta = pan.interpolate({ inputRange: [-LIMIAR_RESPOSTA, -16, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' });
  const minha = acoes.minhaReacao(c.id);

  return (
    <View style={styles.itemFora}>
      {/* "Responder" aparece por trás, do lado direito */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.responderFundo,
          {
            opacity: mostrarResposta,
            transform: [{ scale: mostrarResposta.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      >
        <View style={[styles.responderIcone, { backgroundColor: cores.action.primary.pressed }]}>
          <Icone nome="responder" tamanho={20} />
        </View>
      </Animated.View>

      <Animated.View {...gesto.panHandlers} style={{ transform: [{ translateX: pan }] }}>
        <Pressable
          ref={ref}
          onLongPress={segurar}
          delayLongPress={320}
          accessibilityHint="Segure para reagir, arraste para a esquerda para responder"
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: cores.bg.raised }]}
        >
          <Avatar tamanho={24} foto={c.autor.foto} iniciais={c.autor.iniciais} />
          <View style={styles.corpo}>
            <View style={styles.cabecalho}>
              <Texto estilo="Texto/Botões e rótulos">{c.autor.usuario}</Texto>
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                {c.quando}
              </Texto>
            </View>
            {c.texto ? <Texto estilo="Texto/Pequeno">{c.texto}</Texto> : null}
            {c.imagem ? (
              <Pressable onPress={() => acoes.onAbrirImagem(c.imagem!)} accessibilityRole="imagebutton" accessibilityLabel="Abrir imagem">
                <Image source={{ uri: c.imagem }} style={[styles.imagem, { backgroundColor: cores.bg.raised }]} />
              </Pressable>
            ) : null}
            <View style={styles.rodape}>
              <ChipsReacoes contagem={c.reacoes} minha={minha} onAlternar={(r) => acoes.onReagir(c, minha === r ? null : r)} />
              <Pressable onPress={() => acoes.onResponder(c)} hitSlop={8} accessibilityRole="button" style={styles.responder}>
                <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
                  Responder
                </Texto>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemFora: { overflow: 'visible' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12], paddingVertical: space[8], paddingHorizontal: space[4], borderRadius: radius.md },
  corpo: { flex: 1, minWidth: 0, gap: space[4] },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  imagem: { width: 200, height: 150, borderRadius: radius.md, marginTop: space[4] },
  rodape: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[12], marginTop: space[4] },
  responder: { paddingVertical: space[2] },
  responderFundo: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  responderIcone: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  // A linha fica alinhada ao centro do avatar de 24 px (4 de padding + 12).
  respostas: { flexDirection: 'row' },
  linhaToque: { width: 32, alignItems: 'center' },
  linha: { width: borderWidth.thick, flex: 1, borderRadius: 1 },
  filhos: { flex: 1, minWidth: 0 },
  linhaEstreita: { width: 12 },
  recolhida: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[4],
    marginLeft: 36,
    marginTop: space[4],
    marginBottom: space[8],
    paddingHorizontal: space[12],
    height: 28,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
});
