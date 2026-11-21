import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { ImpactoVibracao, vibrarImpacto, vibrarSelecao } from '@/data/haptica';
import { borderWidth, radius, space, useTema } from '@/theme';


type Props<T> = {
  itens: T[];
  chave: (item: T) => string;
  /** Altura fixa de cada linha: é ela que diz em que posição o item cai ao soltar. */
  altura: number;
  renderizar: (item: T) => ReactNode;
  /** Nome lido pelo leitor de tela na alça (ex.: "Reordenar Drops"). */
  rotuloAlca: (item: T) => string;
  onMover: (item: T, para: number) => void;
  /** Avisa quando começa/termina um arraste (para travar a rolagem da tela). */
  onArrastando?: (arrastando: boolean) => void;
};

/**
 * Lista reordenável arrastando a alça (ícone "reordenar") à direita de cada linha.
 * As outras linhas abrem espaço enquanto o item passa; ao soltar, chama `onMover` com a posição
 * nova. Para leitor de tela, cada alça também tem as ações "Subir" e "Descer".
 */
export function ListaArrastavel<T>({ itens, chave, altura, renderizar, rotuloAlca, onMover, onArrastando }: Props<T>) {
  const { cores } = useTema();
  const [ativo, setAtivo] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);
  const [dy] = useState(() => new Animated.Value(0));

  return (
    <View style={[styles.lista, { backgroundColor: cores.bg.base, borderColor: cores.border.subtle }]}>
      {itens.map((item, i) => {
        // Enquanto outro item é arrastado, as linhas entre a origem e o alvo andam uma posição.
        let desloc = 0;
        if (ativo !== null && alvo !== null && i !== ativo) {
          if (ativo < alvo && i > ativo && i <= alvo) desloc = -altura;
          if (ativo > alvo && i < ativo && i >= alvo) desloc = altura;
        }
        const arrastando = ativo === i;
        return (
          <Animated.View
            key={chave(item)}
            style={[
              styles.linha,
              { height: altura, backgroundColor: cores.bg.base },
              i > 0 && !arrastando && { borderTopWidth: borderWidth.thin, borderTopColor: cores.border.subtle },
              arrastando
                ? {
                    zIndex: 2,
                    backgroundColor: cores.bg.selected,
                    borderRadius: radius.card,
                    transform: [{ translateY: dy }, { scale: 1.02 }],
                  }
                : { transform: [{ translateY: desloc }] },
            ]}
          >
            <View style={styles.conteudo}>{renderizar(item)}</View>
            <Alca
              rotulo={rotuloAlca(item)}
              indice={i}
              total={itens.length}
              altura={altura}
              dy={dy}
              onInicio={() => {
                setAtivo(i);
                setAlvo(i);
                onArrastando?.(true);
                vibrarImpacto(ImpactoVibracao.Light);
              }}
              onAlvo={(a) =>
                setAlvo((anterior) => {
                  if (anterior !== a) vibrarSelecao();
                  return a;
                })
              }
              onFim={(a) => {
                dy.setValue(0);
                setAtivo(null);
                setAlvo(null);
                onArrastando?.(false);
                if (a !== null && a !== i) onMover(item, a);
              }}
              onAcessivel={(para) => onMover(item, para)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

function Alca({
  rotulo,
  indice,
  total,
  altura,
  dy,
  onInicio,
  onAlvo,
  onFim,
  onAcessivel,
}: {
  rotulo: string;
  indice: number;
  total: number;
  altura: number;
  dy: Animated.Value;
  onInicio: () => void;
  onAlvo: (alvo: number) => void;
  onFim: (alvo: number | null) => void;
  onAcessivel: (para: number) => void;
}) {
  const { cores } = useTema();
  // A posição e os callbacks mudam a cada render; o PanResponder é criado uma vez só.
  const atual = useRef({ indice, total, altura, onInicio, onAlvo, onFim });
  useLayoutEffect(() => {
    atual.current = { indice, total, altura, onInicio, onAlvo, onFim };
  });
  const alvoRef = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/refs -- os handlers só leem os refs nos eventos
  const [gesto] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Uma vez segurando a alça, nem a rolagem nem o gesto das abas tomam o toque.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        alvoRef.current = atual.current.indice;
        atual.current.onInicio();
      },
      onPanResponderMove: (_, g) => {
        const { indice: i, total: n, altura: h } = atual.current;
        // Não deixa o item sair da lista.
        const min = -i * h;
        const max = (n - 1 - i) * h;
        const y = Math.max(min, Math.min(max, g.dy));
        dy.setValue(y);
        const a = Math.max(0, Math.min(n - 1, i + Math.round(y / h)));
        if (a !== alvoRef.current) {
          alvoRef.current = a;
          atual.current.onAlvo(a);
        }
      },
      onPanResponderRelease: () => atual.current.onFim(alvoRef.current),
      onPanResponderTerminate: () => atual.current.onFim(null),
    }),
  );

  return (
    <View
      {...gesto.panHandlers}
      hitSlop={8}
      style={styles.alca}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={rotulo}
      accessibilityHint="Arraste para cima ou para baixo para mudar a ordem."
      accessibilityActions={[
        { name: 'increment', label: 'Descer' },
        { name: 'decrement', label: 'Subir' },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'decrement' && indice > 0) onAcessivel(indice - 1);
        if (e.nativeEvent.actionName === 'increment' && indice < total - 1) onAcessivel(indice + 1);
      }}
    >
      <Pegador cor={cores.icon.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { borderRadius: radius.card, borderWidth: borderWidth.thin },
  linha: { flexDirection: 'row', alignItems: 'center', paddingLeft: space[12] },
  conteudo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[8] },
  alca: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});

/** Pegador de arrastar: 2 colunas × 3 pontos, o símbolo mais reconhecido para "segure e arraste". */
function Pegador({ cor }: { cor: string }) {
  return (
    <View style={pegador.grade}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={[pegador.ponto, { backgroundColor: cor }]} />
      ))}
    </View>
  );
}

const pegador = StyleSheet.create({
  grade: { width: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  ponto: { width: 3.5, height: 3.5, borderRadius: 2 },
});
