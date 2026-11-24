import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet } from 'react-native';

import { useNomesEmocoes, type Emocao } from '@/data/emocoes';
import { duration, easing, spaceFixo as space, useCoresSvg } from '@/theme';

import { Texto } from '../Texto';
import { BalaoEmocao, LADO_BALAO, LADO_SVG_BALAO } from './BalaoEmocao';

/**
 * Peças da escolha de emoção ("Leve a emoção até aqui"), usadas na hero da Home e no
 * check-in da tela de pausa: os balões arrastáveis e o sorteio de onde cada um fica.
 */

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

/** Quanto o balão cresce ao chegar na cabeça (1 = tamanho normal). */
const ESCALA_NA_CABECA = 1.5;
/** Até onde (em px) do centro da cabeça o balão é aceito ao soltar. */
const RAIO_SOLTAR = 80;

export type Lugar = { x: number; y: number; tamanho: number };

/**
 * Espalha as emoções numa grade com folga e sorteia quase tudo: o número de colunas (entre
 * as opções que deixam os balões grandes), quais células ficam vazias, qual emoção vai em
 * cada célula e a posição dentro dela. Os balões não se sobrepõem (cada um fica na sua célula)
 * e diminuem se a tela for baixa.
 */
export function sortearLugares(n: number, largura: number, topo: number, fundo: number): Lugar[] {
  const margem = space[8];
  const areaL = largura - margem * 2;
  const areaA = Math.max(1, fundo - topo);
  const opcoes = [3, 4].map((colunas) => {
    const linhas = Math.ceil(n / colunas);
    return { colunas, linhas, celula: Math.min(areaL / colunas, areaA / linhas) };
  });
  const maior = Math.max(...opcoes.map((o) => o.celula));
  const boas = opcoes.filter((o) => o.celula >= maior * 0.85);
  const { colunas, linhas } = boas[Math.floor(Math.random() * boas.length)];
  const cw = areaL / colunas;
  const ch = areaA / linhas;
  const tamanho = Math.min(LADO_BALAO, Math.min(cw, ch) * 0.8);
  const lado = (LADO_SVG_BALAO * tamanho) / LADO_BALAO;

  const embaralhar = <T,>(lista: T[]) => {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  };
  const celulas = embaralhar(Array.from({ length: colunas * linhas }, (_, i) => i)).slice(0, n);
  // cada fileira ganha um deslocamento próprio, para não parecer uma grade
  const desvioLinha = Array.from({ length: linhas }, () => (Math.random() - 0.5) * 0.5);
  return celulas.map((c) => {
    const col = c % colunas;
    const lin = Math.floor(c / colunas);
    const folgaX = Math.max(0, cw - lado);
    const folgaY = Math.max(0, ch - lado);
    const fx = Math.min(1, Math.max(0, 0.5 + desvioLinha[lin] + (Math.random() - 0.5) * 0.9));
    const fy = Math.random();
    return { x: margem + col * cw + folgaX * fx, y: topo + lin * ch + folgaY * fy, tamanho };
  });
}

type Props = {
  emocao: Emocao;
  indice: number;
  lugar: Lugar;
  cabeca: { x: number; y: number };
  aparecer: Animated.Value;
  /** Proximidade compartilhada com a tela (para apagar a instrução). */
  aproximacao: Animated.Value;
  selecionada: boolean;
  travado: boolean;
  /** Opacidade quando não está selecionado (muda com animação). Na Home, 50%. */
  opacidade?: number;
  onSelecionar: () => void;
  onArrastando: (a: boolean) => void;
  onSoltarNaCabeca: () => void;
};

export function BalaoArrastavel({
  emocao,
  indice,
  lugar,
  cabeca,
  aparecer,
  aproximacao,
  selecionada,
  travado,
  opacidade = 0.5,
  onSelecionar,
  onArrastando,
  onSoltarNaCabeca,
}: Props) {
  useNomesEmocoes();
  const svg = useCoresSvg();
  const [pan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  // 0 = onde começou o arraste, 1 = em cima da cabeça. O balão cresce conforme se aproxima.
  const [perto] = useState(() => new Animated.Value(0));
  const [realce] = useState(() => new Animated.Value(0));
  const [base] = useState(() => new Animated.Value(opacidade));
  const lado = (LADO_SVG_BALAO * lugar.tamanho) / LADO_BALAO;
  const centro = { x: lugar.x + lado / 2, y: lugar.y + lado / 2 };
  // na cabeça, o balão chega a 1,5 × o tamanho do Figma, mesmo que na grade esteja menor
  const escalaFinal = (ESCALA_NA_CABECA * LADO_BALAO) / lugar.tamanho;
  // As funções da tela mudam a cada render (na pausa, o timer re-renderiza várias vezes por segundo).
  // Guardadas aqui, o PanResponder não é recriado no meio do arraste, o que cancelava o gesto.
  const acoes = useRef({ onSelecionar, onArrastando, onSoltarNaCabeca });
  useEffect(() => {
    acoes.current = { onSelecionar, onArrastando, onSoltarNaCabeca };
  });

  useEffect(() => {
    Animated.timing(realce, {
      toValue: selecionada ? 1 : 0,
      duration: duration.base,
      easing: curva,
      useNativeDriver: nativo,
    }).start();
  }, [selecionada, realce]);

  useEffect(() => {
    Animated.timing(base, { toValue: opacidade, duration: duration.slow, easing: curva, useNativeDriver: nativo }).start();
  }, [opacidade, base]);

  const responder = useMemo(() => {
    const distanciaInicial = Math.max(1, Math.hypot(centro.x - cabeca.x, centro.y - cabeca.y));
    const proximidade = (dx: number, dy: number) =>
      Math.min(1, Math.max(0, 1 - Math.hypot(centro.x + dx - cabeca.x, centro.y + dy - cabeca.y) / distanciaInicial));
    const voltar = () => {
      acoes.current.onArrastando(false);
      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: nativo, bounciness: 6 }),
        Animated.spring(perto, { toValue: 0, useNativeDriver: nativo, bounciness: 6 }),
        Animated.timing(aproximacao, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
      ]).start();
    };
    // `acoes.current` só é lido dentro dos handlers do gesto, nunca durante o render.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !travado,
      onMoveShouldSetPanResponder: () => !travado,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        acoes.current.onSelecionar();
        acoes.current.onArrastando(true);
      },
      onPanResponderMove: (_, g) => {
        pan.setValue({ x: g.dx, y: g.dy });
        const p = proximidade(g.dx, g.dy);
        perto.setValue(p);
        aproximacao.setValue(p);
      },
      onPanResponderRelease: (_, g) => {
        const dx = centro.x + g.dx - cabeca.x;
        const dy = centro.y + g.dy - cabeca.y;
        if (Math.hypot(dx, dy) <= RAIO_SOLTAR) {
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: cabeca.x - centro.x, y: cabeca.y - centro.y },
              duration: duration.base,
              easing: curva,
              useNativeDriver: nativo,
            }),
            Animated.timing(perto, { toValue: 1, duration: duration.base, easing: curva, useNativeDriver: nativo }),
          ]).start();
          acoes.current.onSoltarNaCabeca();
        } else {
          voltar();
        }
      },
      onPanResponderTerminate: voltar,
    });
  }, [pan, perto, aproximacao, travado, centro.x, centro.y, cabeca.x, cabeca.y]);

  // Os balões surgem em sequência (fade + leve zoom), um pouco depois do anterior.
  const atraso = indice * 0.03;
  const progresso = aparecer.interpolate({
    inputRange: [0, Math.min(0.6, atraso), Math.min(1, atraso + 0.4)],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const crescer = perto.interpolate({ inputRange: [0, 1], outputRange: [1, escalaFinal] });
  // `opacidade` normalmente; 100% quando tocado/selecionado
  const opacidadeAtual = Animated.add(base, Animated.multiply(Animated.subtract(1, base), realce));

  return (
    <Animated.View
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={emocao.nome}
      accessibilityHint="Arraste até a cabeça do boneco para registrar"
      accessibilityActions={[{ name: 'activate', label: `Registrar ${emocao.nome}` }]}
      onAccessibilityAction={onSoltarNaCabeca}
      style={[
        styles.balao,
        {
          left: lugar.x,
          top: lugar.y,
          width: lado,
          height: lado,
          zIndex: selecionada ? 2 : 1,
          opacity: progresso,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: progresso.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          ],
        },
      ]}
    >
      {selecionada && !travado ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.nome,
            { bottom: lado - (lado - lugar.tamanho) / 2 + space[16] },
            // o nome sobe junto com a borda de cima do balão, que cresce a partir do centro
            {
              transform: [
                {
                  translateY: perto.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (-(escalaFinal - 1) * lugar.tamanho) / 2],
                  }),
                },
              ],
            },
          ]}
        >
          <Texto estilo="Títulos/Pequeno" cor={svg.corTraco} style={styles.centro}>
            {emocao.nome}
          </Texto>
        </Animated.View>
      ) : null}
      <Animated.View style={{ opacity: opacidadeAtual, transform: [{ scale: crescer }] }}>
        <BalaoEmocao
          Svg={emocao.Svg}
          Textura={emocao.Textura}
          circulo={emocao.circulo}
          tamanho={lugar.tamanho}
          deriva
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  balao: { position: 'absolute' },
  nome: { position: 'absolute', left: -40, right: -40 },
  centro: { textAlign: 'center' },
});
