import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  BalaoVazio,
  emocaoPorId,
  emocoes,
  useNomesEmocoes,
  emocoesDeHoje,
  quandoFoi,
  salvarEmocao,
  type Emocao,
  type RegistroEmocao,
} from '@/data/emocoes';
import { saudacaoDaVez, textoDaSaudacao, type Saudacao } from '@/data/saudacoes';
import { duration, easing, radius, spaceFixo as space, useTema } from '@/theme';

import BolhaPensamento from '../../../assets/home/bolha-pensamento.svg';
import PessoaPensando from '../../../assets/home/pessoa-pensando.svg';
import { Aparecer, TextoAnimado, fimDoTexto } from '../animacao';
import { Etiqueta } from '../Etiqueta';
import { useModoImersivo } from '../ModoImersivo';
import { Texto } from '../Texto';
import { BalaoArrastavel, sortearLugares, type Lugar } from './BalaoArrastavel';
import { BalaoEmocao } from './BalaoEmocao';

const nativo = Platform.OS !== 'web';
const SAUDACAO_PADRAO: Saudacao = { modelo: 'Olá{, nome}!\nComo você está hoje?' };
const curva = Easing.bezier(...easing.standard);

const PESSOA = { largura: 151, altura: 155 };
/** Centro da cabeça do boneco, medido a partir do canto do boneco (Figma 665:8412). */
const CABECA = { x: 79, y: 37 };
/** "Leve a emoção até aqui ↓": 22 + 10 + 22 px, 10 px acima do boneco. */
const ALTURA_INSTRUCAO = 64;
/** Etiquetas de emoção visíveis antes do "•••". */
const ETIQUETAS_VISIVEIS = 3;
/** Máximo de etiquetas com o "•••" aberto (as mais recentes). */
const ETIQUETAS_EXPANDIDAS = 5;
/** Opacidade das emoções que não estão selecionadas. */
const OPACIDADE_EMOCAO = 0.5;
/** Quanto o texto da saudação pode subir quando as etiquetas expandem (do respiro de 88 px acima dele). */
const RESPIRO_TEXTO = 72;
/** Respiro entre o pé do boneco e a borda de baixo (acima da área segura) no modo imersivo. */
const RESPIRO_PE = space[8];

type Etapa = 'inicio' | 'escolhendo' | 'soltou';

type Props = {
  nome: string;
  /** Altura mínima da hero: do fim do topo até a barra de navegação (a Home tem 100vh). */
  altura: number;
  /** Do alto da tela até o começo da hero (área segura + topo). As emoções usam esse espaço quando o topo sai. */
  alturaTopo: number;
  /** Altura real da área da Home (medida no layout; no Android pode diferir da janela). */
  alturaTela: number;
  /** Avisa quando um balão está sendo arrastado, para a Home travar a rolagem. */
  onArrastando: (arrastando: boolean) => void;
  /** Chamado depois que a emoção é solta na cabeça e registrada. */
  onEscolher: (emocao: Emocao) => void;
};

/**
 * Hero da Home — "Como você está hoje?". Tocar no balão "?" entra no modo imersivo
 * (o topo e a barra saem, entra uma vinheta) e mostra as emoções; a pessoa arrasta
 * uma até a cabeça do boneco para registrá-la. O boneco fica colado na barra de navegação.
 */
export function HeroEmocoes({ nome, altura, alturaTopo, alturaTela: height, onArrastando, onEscolher }: Props) {
  const { cores } = useTema();
  useNomesEmocoes();
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const { setImersivo } = useModoImersivo();
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroEmocao[]>([]);
  const [verTodas, setVerTodas] = useState(false);
  // O appear-in das etiquetas (como o dos textos) só acontece na primeira vez que a Home abre.
  const [primeiraEntrada, setPrimeiraEntrada] = useState(true);
  // Altura das etiquetas recolhidas e atual: ao expandir, o texto sobe (o boneco não desce).
  const [etiquetas, setEtiquetas] = useState({ base: 0, atual: 0 });
  const [subida] = useState(() => new Animated.Value(0));
  const [maisAberto] = useState(() => new Animated.Value(0));
  const [agora, setAgora] = useState(() => Date.now());
  const [frase, setFrase] = useState<Saudacao | null>(null);
  const [topoPessoa, setTopoPessoa] = useState(altura - PESSOA.altura);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [saudacao] = useState(() => new Animated.Value(1));
  const [nuvem] = useState(() => new Animated.Value(0));
  // Quanto o balão arrastado já se aproximou da cabeça (0 a 1): apaga a instrução.
  const [aproximacao] = useState(() => new Animated.Value(0));

  const resetar = useCallback(() => {
    setEtapa('inicio');
    setSelecionada(null);
    setImersivo(false);
    saudacao.setValue(1);
    nuvem.setValue(0);
    aproximacao.setValue(0);
  }, [saudacao, nuvem, aproximacao, setImersivo]);

  // Ao voltar para a Home: estado inicial, barras de volta e as emoções de hoje.
  useFocusEffect(
    useCallback(() => {
      resetar();
      emocoesDeHoje().then((hoje) => {
        setRegistros(hoje);
        saudacaoDaVez(hoje[0]).then(setFrase, () => setFrase(SAUDACAO_PADRAO));
      });
      setAgora(Date.now());
      return () => {
        // Depois de sair da Home pela primeira vez, a volta não repete o appear-in das etiquetas.
        setPrimeiraEntrada(false);
        // Saindo da Home (ex.: "Quero explorar essa emoção" → Diário), a barra de navegação
        // não pode ficar escondida: a próxima aba pode abrir sem a Home voltar ao foco.
        setImersivo(false);
      };
    }, [resetar, setImersivo]),
  );

  // Atualiza o "há X min" das etiquetas.
  useEffect(() => {
    if (!registros.length) return;
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, [registros.length]);

  const escolhendo = etapa !== 'inicio';

  const fechar = useCallback(() => {
    onArrastando(false);
    Animated.parallel([
      Animated.timing(saudacao, { toValue: 1, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
      Animated.timing(nuvem, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
    ]).start(() => {
      setEtapa('inicio');
      setSelecionada(null);
    });
    setImersivo(false);
  }, [nuvem, saudacao, setImersivo, onArrastando]);

  // No Android, o botão voltar sai da escolha em vez de sair da tela.
  useEffect(() => {
    if (etapa !== 'escolhendo') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      fechar();
      return true;
    });
    return () => sub.remove();
  }, [etapa, fechar]);

  const esquerdaPessoa = (width - PESSOA.largura) / 2;
  // No modo imersivo a seção ocupa a tela inteira (100vh) e o boneco desce até o pé dela,
  // com um respiro acima da área segura.
  const alturaImersiva = height - alturaTopo;
  const topoPessoaImersiva = alturaImersiva - bottom - RESPIRO_PE - PESSOA.altura;
  const descida = Math.max(0, topoPessoaImersiva - topoPessoa);
  const cabeca = { x: esquerdaPessoa + CABECA.x, y: topoPessoaImersiva + CABECA.y };

  const abrir = () => {
    // Área livre: do alto da tela (o topo sai) até a instrução acima do boneco.
    const topoArea = -alturaTopo + top + space[16];
    const fundoArea = topoPessoaImersiva - ALTURA_INSTRUCAO;
    setLugares(sortearLugares(emocoes.length, width, topoArea, fundoArea));
    aproximacao.setValue(0);
    setSelecionada(null);
    setEtapa('escolhendo');
    setImersivo(true);
    Animated.parallel([
      Animated.timing(saudacao, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
      Animated.timing(nuvem, { toValue: 1, duration: 700, easing: curva, useNativeDriver: nativo }),
    ]).start();
  };

  const soltar = (e: Emocao) => {
    setEtapa('soltou');
    onArrastando(false);
    // As etiquetas só são recarregadas na volta (useFocusEffect): atualizar agora mudaria o
    // layout da saudação e a ilustração pularia no momento em que a emoção chega na cabeça.
    salvarEmocao(e.id);
    setTimeout(() => onEscolher(e), 700);
  };

  // Só mede fora do modo imersivo: na web o layout medido já inclui o translateY da descida.
  const medirPessoa = (ev: LayoutChangeEvent) => {
    if (etapa === 'inicio') setTopoPessoa(ev.nativeEvent.layout.y);
  };
  const medirEtiquetas = (ev: LayoutChangeEvent) => {
    const h = ev.nativeEvent.layout.height;
    setEtiquetas((e) => ({ base: verTodas ? e.base : h, atual: h }));
  };
  const extraEtiquetas = Math.max(0, etiquetas.atual - etiquetas.base);
  // O texto sobe o quanto as etiquetas cresceram (até onde há respiro acima dele).
  useEffect(() => {
    Animated.timing(subida, {
      toValue: -Math.min(extraEtiquetas, RESPIRO_TEXTO),
      duration: duration.slow,
      easing: curva,
      useNativeDriver: nativo,
    }).start();
  }, [extraEtiquetas, subida]);

  const alternarEtiquetas = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(duration.slow, 'easeInEaseOut', 'opacity'));
    Animated.timing(maisAberto, { toValue: verTodas ? 0 : 1, duration: duration.base, easing: curva, useNativeDriver: false }).start();
    setVerTodas((v) => !v);
  };

  // Até a saudação chegar do banco (alguns ms), o título fica reservado e invisível; quando
  // chega, entra com o appear-in. Trocar de frase reanima; o nome chegando depois só atualiza.
  const titulo = textoDaSaudacao(frase ?? SAUDACAO_PADRAO, nome);
  const fimTitulo = fimDoTexto(titulo, 200);
  const SUBTITULO = 'Clique no balão e escolha uma emoção.';
  const fimSubtitulo = fimDoTexto(SUBTITULO, fimTitulo);
  const comEmocao = registros
    .map((r) => ({ r, e: emocaoPorId(r.id) }))
    .filter((x): x is { r: RegistroEmocao; e: Emocao } => !!x.e);
  const visiveis = comEmocao.slice(0, verTodas ? ETIQUETAS_EXPANDIDAS : ETIQUETAS_VISIVEIS);
  // quantas o "•••" revela (no máximo até completar 5)
  const escondidas = Math.min(comEmocao.length, ETIQUETAS_EXPANDIDAS) - ETIQUETAS_VISIVEIS;
  const fundoEtiqueta = cores.bg.selected;
  // A emoção mais recente fica em destaque, preenchida em action/primary com texto on-primary
  // (branco sobre azul no Dark, 5:1; quase preto sobre laranja no Light).
  const fundoUltima = cores.action.primary.default;

  return (
    // no modo imersivo a hero cresce até 100vh (o bloco extra no fim), sem tirar espaço de cima do boneco
    <View style={[styles.hero, { minHeight: escolhendo ? Math.max(altura, alturaImersiva) : altura }]}>
      {/* Modo imersivo: fundo liso onde ficava a barra + vinheta bg/sunken nas bordas da tela */}
      <Animated.View
        pointerEvents={escolhendo ? 'auto' : 'none'}
        style={[
          styles.vinheta,
          { top: -alturaTopo, height, width, opacity: nuvem },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={etapa === 'escolhendo' ? fechar : undefined}
          accessibilityRole="button"
          accessibilityLabel="Fechar a escolha de emoção"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: cores.bg.base }]} />
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="vinheta-hero" cx="50%" cy="50%" rx="75%" ry="60%">
                <Stop offset="0.45" stopColor={cores.bg.sunken} stopOpacity={0} />
                <Stop offset="1" stopColor={cores.bg.sunken} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Rect width={width} height={height} fill="url(#vinheta-hero)" />
          </Svg>
        </Pressable>
      </Animated.View>

      {/* Saudação e etiquetas das emoções de hoje */}
      <Animated.View
        pointerEvents={escolhendo ? 'none' : 'auto'}
        style={[styles.saudacao, { opacity: saudacao, transform: [{ translateY: subida }] }]}
      >
        <View style={{ opacity: frase ? 1 : 0 }}>
          <TextoAnimado key={frase?.modelo ?? ''} texto={titulo} estilo="Títulos/Grande" atraso={200} equilibrado />
        </View>
        <TextoAnimado
          texto={SUBTITULO}
          estilo="Texto/Pequeno"
          cor={cores.text.tertiary}
          atraso={fimTitulo}
        />
        {comEmocao.length ? (
          <View style={styles.etiquetas} onLayout={medirEtiquetas}>
            {visiveis.map(({ r, e }, i) => (
              // aparecem uma a uma depois do subtítulo; as de "•••" entram logo ao abrir
              <Entrada
                key={r.em}
                // primeira entrada: uma a uma depois do subtítulo; as do "•••" entram ao abrir
                animar={primeiraEntrada || i >= ETIQUETAS_VISIVEIS}
                atraso={i < ETIQUETAS_VISIVEIS ? fimSubtitulo + i * 90 : (i - ETIQUETAS_VISIVEIS) * 70}
              >
              <Etiqueta
                rotulo={`${e.nome} · ${quandoFoi(r.em, agora)}`}
                fundo={i === 0 ? fundoUltima : fundoEtiqueta}
                corTexto={i === 0 ? cores.text['on-primary'] : undefined}
                iconeNode={
                  <BalaoEmocao Svg={e.Svg} Textura={e.Textura} circulo={e.circulo} tamanho={15} flutuar={false} />
                }
              />
              </Entrada>
            ))}
            {escondidas > 0 ? (
              <Entrada animar={primeiraEntrada} atraso={fimSubtitulo + ETIQUETAS_VISIVEIS * 90}>
              <Pressable
                onPress={alternarEtiquetas}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={verTodas ? 'Mostrar menos emoções' : `Mostrar mais ${escondidas} emoções`}
                accessibilityState={{ expanded: verTodas }}
              >
                {/* Fechado: fundo da etiqueta. Aberto: preenchido em action/primary (estado ativo). */}
                <Animated.View
                  style={[
                    styles.mais,
                    {
                      backgroundColor: maisAberto.interpolate({
                        inputRange: [0, 1],
                        outputRange: [fundoEtiqueta, cores.action.primary.default],
                      }),
                      borderColor: maisAberto.interpolate({
                        inputRange: [0, 1],
                        outputRange: [fundoEtiqueta, cores.border.focus],
                      }),
                    },
                  ]}
                >
                  <Texto estilo="Texto/Botões e rótulos" cor={verTodas ? cores.text['on-primary'] : cores.text.primary}>
                    •••
                  </Texto>
                </Animated.View>
              </Pressable>
              </Entrada>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.espaco} />

      {/* Balão "?" e bolinha de pensamento */}
      <View style={[styles.pergunta, escolhendo && styles.invisivel]} pointerEvents={escolhendo ? 'none' : 'auto'}>
        <Pressable onPress={abrir} hitSlop={12} accessibilityRole="button" accessibilityLabel="Escolher uma emoção">
          <BalaoEmocao Svg={BalaoVazio} />
        </Pressable>
        <BolhaFlutuante />
      </View>

      {/* Boneco: colado na barra de navegação; no modo imersivo, no pé da tela */}
      <Animated.View
        pointerEvents="none"
        onLayout={medirPessoa}
        style={[
          styles.pessoa,
          // no modo imersivo desce até o pé da seção de 100vh
          { transform: [{ translateY: nuvem.interpolate({ inputRange: [0, 1], outputRange: [0, descida] }) }] },
        ]}
      >
        <PessoaPensando width={PESSOA.largura} height={PESSOA.altura} corTraco={cores.icon.primary} />
      </Animated.View>
      {/* Completa os 100vh no modo imersivo (a seção de baixo fica fora da tela); o boneco não muda de lugar no layout */}
      {escolhendo ? <View style={{ height: Math.max(0, alturaImersiva - altura) }} /> : null}

      {/* Emoções */}
      {escolhendo ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.instrucao,
              {
                top: topoPessoaImersiva - ALTURA_INSTRUCAO,
                // some aos poucos conforme o balão arrastado chega perto do boneco
                opacity:
                  etapa === 'soltou'
                    ? 0
                    : Animated.multiply(
                        nuvem,
                        aproximacao.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
                      ),
              },
            ]}
          >
            <Texto estilo="Títulos/Pequeno">Leve a emoção até aqui</Texto>
            <Texto estilo="Títulos/Pequeno">↓</Texto>
          </Animated.View>
          {emocoes.map((e, i) =>
            lugares[i] ? (
              <BalaoArrastavel
                key={e.id}
                emocao={e}
                indice={i}
                lugar={lugares[i]}
                cabeca={cabeca}
                aparecer={nuvem}
                aproximacao={aproximacao}
                selecionada={selecionada === e.id}
                opacidade={OPACIDADE_EMOCAO}
                travado={etapa === 'soltou'}
                onSelecionar={() => setSelecionada(e.id)}
                onArrastando={onArrastando}
                onSoltarNaCabeca={() => soltar(e)}
              />
            ) : null,
          )}
        </>
      ) : null}
    </View>
  );
}

/** Appear-in das etiquetas quando `animar`; senão aparecem direto, junto com o resto. */
function Entrada({ animar, atraso, children }: { animar: boolean; atraso: number; children: ReactNode }) {
  if (!animar) return <View>{children}</View>;
  return (
    <Aparecer atraso={atraso} deslocamento={8} duracao={600}>
      {children}
    </Aparecer>
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

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  vinheta: { position: 'absolute', left: 0 },
  saudacao: {
    alignSelf: 'stretch',
    paddingTop: space[64] + space[24],
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: space[12],
  },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[8] },
  mais: {
    paddingHorizontal: space[12],
    paddingVertical: space[4],
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  espaco: { flexGrow: 1, minHeight: space[40] },
  pergunta: { alignItems: 'center', gap: space[16] - 3, marginBottom: space[24] },
  invisivel: { opacity: 0 },
  pessoa: { width: PESSOA.largura, height: PESSOA.altura },
  instrucao: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
});
