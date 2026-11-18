import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  BalaoVazio,
  emocaoDeHoje,
  emocaoPorId,
  emocoes,
  quandoFoi,
  salvarEmocao,
  type Emocao,
  type RegistroEmocao,
} from '@/data/emocoes';
import { duration, easing, space, useCoresSvg, useTema } from '@/theme';

import BolhaPensamento from '../../../assets/home/bolha-pensamento.svg';
import PessoaPensando from '../../../assets/home/pessoa-pensando.svg';
import { TextoAnimado, fimDoTexto } from '../animacao';
import { Etiqueta } from '../Etiqueta';
import { Texto } from '../Texto';
import { BalaoEmocao, LADO_BALAO, LADO_SVG_BALAO } from './BalaoEmocao';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

// ─── Medidas do Figma (frames de 436 px; o palco começa logo abaixo do topo, em y = 80) ──
const LARGURA_FRAME = 436;
const TOPO_PALCO = 80;
const PESSOA = { largura: 151, altura: 155, topoFigma: 698 };
/** Distância entre o pé do boneco e a barra de navegação. */
const FOLGA_BARRA = space[32];
/** Centro da cabeça do boneco, medido a partir do canto do boneco (frame 665:8412). */
const CABECA = { x: 79, y: 37 };
/** Quanto o balão cresce ao chegar na cabeça (1 = tamanho normal). */
const ESCALA_NA_CABECA = 1.5;
/** Até onde (em px) do centro da cabeça o balão é aceito ao soltar. */
const RAIO_SOLTAR = 80;
/** Caixa do componente "Premo" no Figma. */
const PREMO = { largura: 87.643, altura: 84.5 };
const TOPO_PRIMEIRO_BALAO = 89;

type Etapa = 'inicio' | 'escolhendo' | 'soltou';

type Props = {
  nome: string;
  /** Altura do palco: do fim do topo até a barra de navegação. */
  altura: number;
  /** Avisa quando um balão está sendo arrastado, para a Home travar a rolagem. */
  onArrastando: (arrastando: boolean) => void;
  /** Chamado depois que a emoção é solta na cabeça e registrada. */
  onEscolher: (emocao: Emocao) => void;
};

/**
 * Hero da Home — "Como você está hoje?". Tocar no balão "?" mostra as emoções;
 * a pessoa arrasta uma até a cabeça do boneco para registrá-la.
 */
export function HeroEmocoes({ nome, altura, onArrastando, onEscolher }: Props) {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [registro, setRegistro] = useState<RegistroEmocao | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [saudacao] = useState(() => new Animated.Value(1));
  const [nuvem] = useState(() => new Animated.Value(0));

  // Ao voltar para a Home: estado inicial e a emoção de hoje (se houver).
  useFocusEffect(
    useCallback(() => {
      setEtapa('inicio');
      setSelecionada(null);
      saudacao.setValue(1);
      nuvem.setValue(0);
      emocaoDeHoje().then(setRegistro);
      setAgora(Date.now());
    }, [saudacao, nuvem]),
  );

  // Atualiza o "há X min" da etiqueta.
  useEffect(() => {
    if (!registro) return;
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, [registro]);

  const kx = width / LARGURA_FRAME;
  const topoPessoa = altura - FOLGA_BARRA - PESSOA.altura;
  const esquerdaPessoa = (width - PESSOA.largura) / 2;
  // Em telas mais baixas que o Figma, as emoções se aproximam na vertical.
  const ky = Math.min(1, (topoPessoa - (TOPO_PRIMEIRO_BALAO - TOPO_PALCO)) / (PESSOA.topoFigma - TOPO_PRIMEIRO_BALAO));
  const posicao = (e: Emocao) => ({
    x: e.x * kx + (PREMO.largura - LADO_SVG_BALAO) / 2,
    y: topoPessoa - (PESSOA.topoFigma - e.y) * ky + (PREMO.altura - LADO_SVG_BALAO) / 2,
  });
  const cabeca = { x: esquerdaPessoa + CABECA.x, y: topoPessoa + CABECA.y };

  const abrir = () => {
    setEtapa('escolhendo');
    Animated.parallel([
      Animated.timing(saudacao, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
      Animated.timing(nuvem, { toValue: 1, duration: 600, easing: curva, useNativeDriver: nativo }),
    ]).start();
  };

  const soltar = (e: Emocao) => {
    setEtapa('soltou');
    onArrastando(false);
    salvarEmocao(e.id).then(setRegistro);
    setTimeout(() => onEscolher(e), 700);
  };

  const titulo = `${nome ? `Olá, ${nome}!` : 'Olá!'}\nComo você está hoje?`;
  const fimTitulo = fimDoTexto(titulo, 200);
  const emocaoRegistrada = emocaoPorId(registro?.id);
  const escolhendo = etapa !== 'inicio';

  return (
    <View style={[styles.palco, { height: altura }]}>
      {/* Saudação e etiqueta da emoção de hoje */}
      <Animated.View
        pointerEvents={escolhendo ? 'none' : 'auto'}
        style={[styles.saudacao, { opacity: saudacao }]}
      >
        <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={200} />
        <TextoAnimado
          texto="Clique no balão e escolha uma emoção."
          estilo="Texto/Pequeno"
          cor={cores.text.tertiary}
          atraso={fimTitulo}
        />
        {emocaoRegistrada && registro ? (
          <Etiqueta
            rotulo={`${emocaoRegistrada.nome} · ${quandoFoi(registro.em, agora)}`}
            fundo={cores.action.primary.pressed}
            iconeNode={
              <BalaoEmocao
                Svg={emocaoRegistrada.Svg}
                Textura={emocaoRegistrada.Textura}
                circulo={emocaoRegistrada.circulo}
                tamanho={15}
                flutuar={false}
              />
            }
            style={styles.etiqueta}
          />
        ) : null}
      </Animated.View>

      {/* Balão "?" e bolinha de pensamento */}
      {!escolhendo ? (
        <View style={[styles.pergunta, { bottom: altura - topoPessoa + space[24] }]}>
          <Pressable
            onPress={abrir}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Escolher uma emoção"
          >
            <BalaoEmocao Svg={BalaoVazio} />
          </Pressable>
          <BolhaFlutuante />
        </View>
      ) : null}

      {/* Boneco */}
      <View pointerEvents="none" style={[styles.pessoa, { top: topoPessoa, left: esquerdaPessoa }]}>
        <PessoaPensando width={PESSOA.largura} height={PESSOA.altura} corTraco={cores.icon.primary} />
      </View>

      {/* Emoções */}
      {escolhendo ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.instrucao,
              { bottom: altura - topoPessoa + 10, opacity: etapa === 'soltou' ? 0 : nuvem },
            ]}
          >
            <Texto estilo="Títulos/Pequeno">Leve a emoção até aqui</Texto>
            <Texto estilo="Títulos/Pequeno">↓</Texto>
          </Animated.View>
          {emocoes.map((e, i) => (
            <BalaoArrastavel
              key={e.id}
              emocao={e}
              indice={i}
              origem={posicao(e)}
              cabeca={cabeca}
              aparecer={nuvem}
              selecionada={selecionada === e.id}
              algumSelecionado={selecionada !== null && etapa !== 'soltou'}
              travado={etapa === 'soltou'}
              onSelecionar={() => setSelecionada(e.id)}
              onArrastando={onArrastando}
              onSoltarNaCabeca={() => soltar(e)}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

/**
 * Bolinha de pensamento entre o balão "?" e o boneco. Flutua junto com o balão,
 * com metade da altura e um pouco depois dele, e "respira" de leve.
 */
function BolhaFlutuante() {
  const { cores } = useTema();
  const [v] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const meia = (para: number) =>
      Animated.timing(v, { toValue: para, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: nativo });
    const loop = Animated.loop(Animated.sequence([meia(1), meia(0)]));
    const t = setTimeout(() => loop.start(), 250);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [v]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }}
    >
      <BolhaPensamento width={20} height={18} corTraco={cores.icon.primary} />
    </Animated.View>
  );
}

type PropsBalao = {
  emocao: Emocao;
  indice: number;
  origem: { x: number; y: number };
  cabeca: { x: number; y: number };
  aparecer: Animated.Value;
  selecionada: boolean;
  algumSelecionado: boolean;
  travado: boolean;
  onSelecionar: () => void;
  onArrastando: (a: boolean) => void;
  onSoltarNaCabeca: () => void;
};

function BalaoArrastavel({
  emocao,
  indice,
  origem,
  cabeca,
  aparecer,
  selecionada,
  algumSelecionado,
  travado,
  onSelecionar,
  onArrastando,
  onSoltarNaCabeca,
}: PropsBalao) {
  const svg = useCoresSvg();
  const [pan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  // 0 = onde começou o arraste, 1 = em cima da cabeça. O balão cresce conforme se aproxima.
  const [perto] = useState(() => new Animated.Value(0));
  const centro = { x: origem.x + LADO_SVG_BALAO / 2, y: origem.y + LADO_SVG_BALAO / 2 };

  const responder = useMemo(() => {
    const distanciaInicial = Math.max(1, Math.hypot(centro.x - cabeca.x, centro.y - cabeca.y));
    const proximidade = (dx: number, dy: number) =>
      Math.min(1, Math.max(0, 1 - Math.hypot(centro.x + dx - cabeca.x, centro.y + dy - cabeca.y) / distanciaInicial));
    const voltar = () => {
      onArrastando(false);
      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: nativo, bounciness: 6 }),
        Animated.spring(perto, { toValue: 0, useNativeDriver: nativo, bounciness: 6 }),
      ]).start();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !travado,
      onMoveShouldSetPanResponder: () => !travado,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onSelecionar();
        onArrastando(true);
      },
      onPanResponderMove: (_, g) => {
        pan.setValue({ x: g.dx, y: g.dy });
        perto.setValue(proximidade(g.dx, g.dy));
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
          onSoltarNaCabeca();
        } else {
          voltar();
        }
      },
      onPanResponderTerminate: voltar,
    });
  }, [pan, perto, travado, centro.x, centro.y, cabeca.x, cabeca.y, onSelecionar, onArrastando, onSoltarNaCabeca]);

  // Os balões surgem em sequência (fade + leve zoom), um pouco depois do anterior.
  const atraso = indice * 0.03;
  const progresso = aparecer.interpolate({
    inputRange: [0, Math.min(0.6, atraso), Math.min(1, atraso + 0.4)],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const apagado = algumSelecionado && !selecionada;
  const crescer = perto.interpolate({ inputRange: [0, 1], outputRange: [1, ESCALA_NA_CABECA] });

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
          left: origem.x,
          top: origem.y,
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
            // o nome sobe junto com a borda de cima do balão, que cresce a partir do centro
            { transform: [{ translateY: perto.interpolate({ inputRange: [0, 1], outputRange: [0, (-(ESCALA_NA_CABECA - 1) * LADO_BALAO) / 2] }) }] },
          ]}
        >
          <Texto estilo="Títulos/Pequeno" cor={svg.corTraco} style={styles.centro}>
            {emocao.nome}
          </Texto>
        </Animated.View>
      ) : null}
      <Animated.View style={{ opacity: apagado ? 0.5 : 1, transform: [{ scale: crescer }] }}>
        <BalaoEmocao
          Svg={emocao.Svg}
          Textura={emocao.Textura}
          circulo={emocao.circulo}
          fase={(indice * 137) % 1000}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  palco: { position: 'relative', overflow: 'visible' },
  saudacao: {
    position: 'absolute',
    top: space[64] + space[24],
    left: 22,
    right: 22,
    alignItems: 'center',
    gap: space[12],
  },
  etiqueta: { alignSelf: 'center' },
  pergunta: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: space[16] - 3 },
  pessoa: { position: 'absolute' },
  instrucao: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
  balao: { position: 'absolute', width: LADO_SVG_BALAO, height: LADO_SVG_BALAO },
  nome: {
    position: 'absolute',
    bottom: LADO_SVG_BALAO - (LADO_SVG_BALAO - LADO_BALAO) / 2 + space[16],
    left: -40,
    right: -40,
  },
  centro: { textAlign: 'center' },
});
