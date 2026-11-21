import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { vibrarSelecao } from '@/data/haptica';

/** Quanto o dedo precisa andar na horizontal (ou a velocidade) para trocar de aba. */
const DISTANCIA = 70;
const VELOCIDADE = 0.45;
/** O gesto só é das abas quando é claramente horizontal. */
const INCLINACAO = 2;

type Props = {
  children: ReactNode;
  /** Vai para a aba vizinha: -1 = a da esquerda, +1 = a da direita. */
  onTrocar: (direcao: -1 | 1) => void;
  /** Desliga o gesto (ex.: no modo imersivo da Home). */
  desligado?: boolean;
};

/**
 * Deslizar para os lados troca de aba em todo o app (pedido de 21/11/2026). Só JS, sem
 * react-native-pager-view: chega por EAS Update. A animação de entrada é a "shift" das Tabs.
 *
 * Quem tem prioridade: o responder é pedido na fase de bolha, então qualquer gesto de dentro da
 * tela que já pediu o toque (arrastar drops, deslizar check-ins, carrosséis, a alça da lista de
 * Ajustes) ganha antes. Rolagens verticais seguem normais porque o gesto exige movimento
 * claramente horizontal.
 */
export function GestoAbas({ children, onTrocar, desligado = false }: Props) {
  const atual = useRef({ onTrocar, desligado });
  useLayoutEffect(() => {
    atual.current = { onTrocar, desligado };
  });

  // eslint-disable-next-line react-hooks/refs -- os handlers só leem o ref nos eventos
  const [gesto] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !atual.current.desligado && Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * INCLINACAO,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, g) => {
        const longe = Math.abs(g.dx) > DISTANCIA || Math.abs(g.vx) > VELOCIDADE;
        if (!longe || Math.abs(g.dx) < Math.abs(g.dy)) return;
        // Dedo para a esquerda = próxima aba (à direita na barra).
        vibrarSelecao();
        atual.current.onTrocar(g.dx < 0 ? 1 : -1);
      },
    }),
  );

  return (
    <View style={styles.flex} {...gesto.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
