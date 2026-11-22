import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, Icone, Texto } from '@/components';
import { Aparecer, TextoAnimado, fimDoTexto } from '@/components/animacao';
import { BalaoArrastavel, sortearLugares, type Lugar } from '@/components/home/BalaoArrastavel';
import { BalaoEmocao } from '@/components/home/BalaoEmocao';
import { BotaoContagem } from '@/components/home/BotaoContagem';
import { BotaoTimer } from '@/components/pausa/BotaoTimer';
import { NaoAbri } from '@/components/pausa/NaoAbri';
import { RodaHobbies } from '@/components/pausa/RodaHobbies';
import { TempoNoApp } from '@/components/pausa/TempoNoApp';
import { hobbyInfo, type HobbyId } from '@/data/catalogo';
import { BalaoVazio, emocoes, salvarEmocao, type Emocao } from '@/data/emocoes';
import { sortearFrase } from '@/data/frases';
import { useGrupos } from '@/data/gruposHome';
import { useHobbies } from '@/data/hobbiesEstado';
import {
  ligarCheckin,
  marcarLiberacao,
  pausaDepoisDeUsar,
  perguntaTempoNoApp,
  regraDaPausa,
  registrarResistencia,
} from '@/data/pausa';
import { registrar } from '@/data/piloto';
import { seguirParaOApp } from '@/data/vigia';
import { duration, easing, space, useTema } from '@/theme';

import IconeEscrever from '../../assets/home/icone-escrever.svg';
import PessoaPensando from '../../assets/home/pessoa-pensando.svg';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

/** Boneco do check-in e o centro da cabeça dele (os mesmos da Home, Figma 665:8412). */
const PESSOA = { largura: 151, altura: 155 };
const CABECA = { x: 79, y: 37 };
/** "Leve a emoção até aqui ↓": 22 + 10 + 22 px, 10 px acima do boneco. */
const ALTURA_INSTRUCAO = 64;
/** O "?" cresce de 84 para 161 px antes das emoções aparecerem (Figma 638:5347). */
const ESCALA_PERGUNTA = 161 / 84;
/** Opacidade das emoções enquanto outra está sendo levada até a cabeça (Figma 642:7494). */
const OPACIDADE_FUNDO = 0.2;
const DESCRICAO_EMOCAO = 'Registramos essa emoção para você.\nVocê pode editá-la depois se quiser.';

/**
 * - pausa: a mensagem, o "?" flutuando e o timer de continuar (Figma 638:4351 → 638:4480)
 * - checkin: o easter egg do "?": as emoções e o boneco (638:5433 → 642:8085)
 * - emocao: a emoção registrada (642:8276)
 * - naoAbri: depois de "Dessa vez não abro"
 * - tempo: "Quanto tempo você precisa nesse app?"
 * - hobbies: a roda de hobbies do botão "Hobbies" (162:255)
 */
type Etapa = 'pausa' | 'checkin' | 'emocao' | 'naoAbri' | 'tempo' | 'hobbies';
/** De onde o check-in foi aberto: do "?" da pausa ou da tela de "não abri". */
type Origem = 'pausa' | 'naoAbri';

/**
 * Tela de pausa (Figma: seção "01.1 · PAUSA", 700:7576). Abre antes de um app de um grupo
 * com pausa; a mensagem e o tempo de espera vêm da regra do grupo. O timer de continuar
 * começa quando a tela abre e segue correndo durante o check-in.
 * Parâmetros: `grupo` (id) e/ou `app` (id); sem eles, vale o grupo "Livre". `origem=vigia`:
 * aberta pelo vigia do Android por cima do app (consi://pausa?app=<pacote>…); aí continuar
 * libera o app pelo tempo escolhido e abre o app.
 */
export default function Pausa() {
  const { cores } = useTema();
  const params = useLocalSearchParams<{ grupo?: string; app?: string; origem?: string }>();
  const doVigia = params.origem === 'vigia' && !!params.app;
  const grupos = useGrupos();
  const { grupo } = regraDaPausa(grupos, params);
  const timer = useTimer(grupo.pausaSegundos * 1000);
  // "Frases filosóficas": uma frase sorteada por pausa (do período do grupo), no lugar da
  // mensagem. Depende do período porque os grupos gravados chegam depois da primeira renderização.
  const periodo = grupo.periodoFilosofico ?? null;
  const frase = useMemo(() => sortearFrase(periodo), [periodo]);
  // A pessoa já estava usando o app (o tempo liberado acabou, ou "Cuidar tempo"): a saída
  // positiva vira "parar por aqui", em vez de "não abrir".
  const [depoisDeUsar, setDepoisDeUsar] = useState(false);
  useEffect(() => {
    let vivo = true;
    pausaDepoisDeUsar(grupo, params.app, doVigia).then((d) => vivo && setDepoisDeUsar(d));
    return () => {
      vivo = false;
    };
  }, [grupo, params.app, doVigia]);

  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const [altura, setAltura] = useState(0);
  const [topoRodape, setTopoRodape] = useState(0);

  const [etapa, setEtapa] = useState<Etapa>('pausa');
  const [origem, setOrigem] = useState<Origem>('pausa');
  const [jaFezCheckin, setJaFezCheckin] = useState(false);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [soltou, setSoltou] = useState(false);
  // Só depois das emoções aparecerem: o toque que abriu o check-in não pode fechá-lo.
  const [aberto, setAberto] = useState(false);
  const [emocao, setEmocao] = useState<Emocao | null>(null);
  // O check-in vira um momento do Diário: "Quero explorar essa emoção" abre esse momento para escrever.
  const [momentoEm, setMomentoEm] = useState<number | null>(null);
  // O registro do "Dessa vez não abro" desta pausa (para ligar o check-in feito em seguida).
  const resistenciaEm = useRef<Promise<number | null> | null>(null);

  // Roda de hobbies: os hobbies da pessoa, começando pelo do meio.
  const { hobbies } = useHobbies();
  const inicioRoda = Math.floor((hobbies.length - 1) / 2);
  const [hobbyEscolhido, setHobbyEscolhido] = useState<HobbyId | null>(null);
  const hobbyRoda = hobbyEscolhido && hobbies.includes(hobbyEscolhido) ? hobbyEscolhido : hobbies[inicioRoda];

  // Transições da pausa para o check-in
  const [titulo] = useState(() => new Animated.Value(1));
  const [pergunta] = useState(() => new Animated.Value(0));
  const [nuvem] = useState(() => new Animated.Value(0));
  const [rodape] = useState(() => new Animated.Value(1));
  const [pessoa] = useState(() => new Animated.Value(0));
  const [aproximacao] = useState(() => new Animated.Value(0));

  const topoPessoa = altura - bottom - space[8] - PESSOA.altura;
  const cabeca = { x: (width - PESSOA.largura) / 2 + CABECA.x, y: topoPessoa + CABECA.y };
  const comRodape = origem === 'pausa';

  // ─── Saídas ───────────────────────────────────────────────────────────────
  // Pausa do vigia: libera o app e volta para ele, deixando o Consi na Home por trás.
  const irParaOApp = (minutos: number) => {
    registrar('pausa_seguiu', { via: doVigia ? 'vigia' : 'manual', minutos });
    if (doVigia && seguirParaOApp(params.app, minutos)) {
      marcarLiberacao(params.app, minutos);
      router.dismissTo('/');
    }
    else router.back();
  };
  const continuar = () => (perguntaTempoNoApp(grupo) ? setEtapa('tempo') : irParaOApp(0));
  // "Diário" abre direto um novo momento (escolher a emoção e escrever), no lugar da pausa.
  const escreverNoDiario = () => router.replace('/diario/novo');
  // Abre o momento do check-in no Diário para escrever (no lugar da pausa).
  const explorarEmocao = () =>
    router.replace({
      pathname: '/diario/novo',
      params: momentoEm ? { em: String(momentoEm) } : { emocao: emocao?.id ?? '' },
    });
  const abrirHobbies = () => {
    setHobbyEscolhido(null);
    setEtapa('hobbies');
  };
  // Explorar um hobby no lugar do app também é não abrir: vira "não abriu … e explorou Música".
  const explorarHobby = () => {
    registrar('pausa_hobby', { via: doVigia ? 'vigia' : 'manual' });
    registrarResistencia({
      grupo: grupo.id,
      app: params.app,
      depoisDeUsar,
      hobby: hobbyRoda,
      checkinEm: momentoEm ?? undefined,
    });
    router.dismissTo({ pathname: '/hobbies', params: { hobby: hobbyRoda } });
  };
  const naoAbro = () => {
    registrar('pausa_nao_abri', { via: doVigia ? 'vigia' : 'manual' });
    // Um check-in já feito nesta pausa entra junto; um feito depois é ligado em `soltar`.
    resistenciaEm.current = registrarResistencia({
      grupo: grupo.id,
      app: params.app,
      depoisDeUsar,
      checkinEm: momentoEm ?? undefined,
    });
    setEtapa('naoAbri');
  };
  const sumir = useCallback(() => router.dismissTo('/'), []);

  // ─── Check-in ─────────────────────────────────────────────────────────────
  const abrirCheckin = (de: Origem) => {
    const topoArea = top + space[16];
    const fundoArea = de === 'pausa' ? topoRodape - space[16] : topoPessoa - ALTURA_INSTRUCAO;
    setLugares(sortearLugares(emocoes.length, width, topoArea, fundoArea));
    setOrigem(de);
    setSelecionada(null);
    setArrastando(false);
    setSoltou(false);
    setAberto(false);
    aproximacao.setValue(0);
    setJaFezCheckin(true);
    setEtapa('checkin');

    const aparecerNuvem = Animated.parallel([
      Animated.timing(nuvem, { toValue: 1, duration: 700, easing: curva, useNativeDriver: nativo }),
      Animated.timing(rodape, { toValue: 1, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
    ]);
    if (de === 'pausa') {
      // o título sai, o "?" cresce e os botões ficam em 50% (638:5347); depois vêm as emoções
      Animated.sequence([
        Animated.parallel([
          Animated.timing(titulo, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
          Animated.timing(pergunta, { toValue: 1, duration: 450, easing: curva, useNativeDriver: nativo }),
          Animated.timing(rodape, { toValue: 0.5, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
        ]),
        Animated.parallel([
          aparecerNuvem,
          Animated.timing(pergunta, { toValue: 2, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
        ]),
      ]).start(() => setAberto(true));
    } else {
      pessoa.setValue(0);
      Animated.parallel([
        aparecerNuvem,
        Animated.timing(pessoa, { toValue: 1, duration: 700, easing: curva, useNativeDriver: nativo }),
      ]).start(() => setAberto(true));
    }
  };

  const fecharCheckin = useCallback(() => {
    setAberto(false);
    Animated.parallel([
      Animated.timing(nuvem, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
      Animated.timing(pessoa, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
    ]).start(() => {
      setEtapa(origem);
      if (origem === 'pausa') {
        Animated.parallel([
          Animated.timing(titulo, { toValue: 1, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
          Animated.timing(pergunta, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
          Animated.timing(rodape, { toValue: 1, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
        ]).start();
      }
    });
  }, [nuvem, pessoa, titulo, pergunta, rodape, origem]);

  // Na pausa, os botões saem e o boneco entra quando uma emoção começa a ser arrastada (642:7494).
  useEffect(() => {
    if (etapa !== 'checkin' || origem !== 'pausa' || !aberto) return;
    const levando = arrastando || soltou;
    Animated.parallel([
      Animated.timing(rodape, { toValue: levando ? 0 : 1, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
      Animated.timing(pessoa, { toValue: levando ? 1 : 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }),
    ]).start();
  }, [arrastando, soltou, etapa, origem, aberto, rodape, pessoa]);

  const soltar = (e: Emocao) => {
    setSoltou(true);
    setArrastando(false);
    const registro = resistenciaEm.current;
    salvarEmocao(e.id, 'pausa').then((hoje) => {
      const em = hoje[0]?.em ?? null;
      setMomentoEm(em);
      // Check-in depois do "não abro": vira "não abriu … e se sentiu X".
      if (registro) registro.then((r) => ligarCheckin(r, em));
    });
    setTimeout(() => {
      setEmocao(e);
      setEtapa('emocao');
    }, 700);
  };

  const voltarDaEmocao = useCallback(() => {
    // volta para a pausa já com o timer em dia; da tela de "não abri", fecha
    if (origem === 'naoAbri') return sumir();
    titulo.setValue(1);
    pergunta.setValue(0);
    rodape.setValue(1);
    nuvem.setValue(0);
    pessoa.setValue(0);
    setEtapa('pausa');
  }, [origem, sumir, titulo, pergunta, rodape, nuvem, pessoa]);

  // Android: o voltar desfaz um passo em vez de fechar a pausa.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (etapa === 'checkin' && aberto && !soltou) fecharCheckin();
      else if (etapa === 'emocao') voltarDaEmocao();
      else if (etapa === 'tempo' || etapa === 'hobbies') setEtapa('pausa');
      return etapa !== 'pausa' && etapa !== 'naoAbri';
    });
    return () => sub.remove();
  }, [etapa, aberto, soltou, fecharCheckin, voltarDaEmocao]);

  const medir = (ev: LayoutChangeEvent) => setAltura(ev.nativeEvent.layout.height);
  const medirRodape = (ev: LayoutChangeEvent) => setTopoRodape(ev.nativeEvent.layout.y);

  const botaoTimer = (
    <BotaoTimer
      progresso={timer.progresso}
      segundos={timer.segundos}
      pronto={timer.pronto}
      variante={jaFezCheckin ? 'abrir' : 'continuar'}
      onContinuar={continuar}
    />
  );

  return (
    <View style={[styles.tela, { backgroundColor: cores.bg.base }]} onLayout={medir}>
      {etapa === 'pausa' || etapa === 'checkin' ? (
        <>
          {/* Toque fora das emoções: volta para onde estava */}
          {etapa === 'checkin' ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={aberto && !soltou ? fecharCheckin : undefined}
              accessibilityRole="button"
              accessibilityLabel="Fechar a escolha de emoção"
            />
          ) : null}

          {/* Mensagem e "?" (some no check-in) */}
          {etapa === 'pausa' || origem === 'pausa' ? (
            <View
              style={[styles.centro, { paddingTop: top }]}
              pointerEvents={etapa === 'pausa' ? 'box-none' : 'none'}
            >
              <Animated.View style={{ opacity: titulo }}>
                <Texto estilo="Títulos/Grande" style={styles.textoCentro}>
                  {grupo.mensagemFilosofica ? frase.texto : grupo.mensagem}
                </Texto>
                {grupo.mensagemFilosofica ? (
                  <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={[styles.textoCentro, styles.autor]}>
                    {frase.autor}
                  </Texto>
                ) : null}
              </Animated.View>
              <Animated.View
                style={{
                  opacity: pergunta.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1, 0] }),
                  transform: [
                    {
                      scale: pergunta.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [1, ESCALA_PERGUNTA, ESCALA_PERGUNTA * 1.1],
                      }),
                    },
                  ],
                }}
              >
                <Pressable
                  onPress={() => abrirCheckin('pausa')}
                  hitSlop={16}
                  accessibilityRole="button"
                  accessibilityLabel="Fazer um check-in de como você está"
                >
                  <BalaoEmocao Svg={BalaoVazio} />
                </Pressable>
              </Animated.View>
            </View>
          ) : null}

          {/* Boneco e instrução do check-in */}
          {etapa === 'checkin' ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: pessoa }]}>
              <Animated.View
                style={[
                  styles.instrucao,
                  {
                    top: topoPessoa - ALTURA_INSTRUCAO,
                    opacity: soltou
                      ? 0
                      : aproximacao.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
                  },
                ]}
              >
                <Texto estilo="Títulos/Pequeno">Leve a emoção até aqui</Texto>
                <Texto estilo="Títulos/Pequeno">↓</Texto>
              </Animated.View>
              <View style={[styles.pessoa, { top: topoPessoa, left: (width - PESSOA.largura) / 2 }]}>
                <PessoaPensando width={PESSOA.largura} height={PESSOA.altura} corTraco={cores.icon.primary} />
              </View>
            </Animated.View>
          ) : null}

          {/* Botões da pausa (no check-in vindo da pausa, continuam até uma emoção ser arrastada) */}
          {comRodape ? (
            <Animated.View
              onLayout={medirRodape}
              pointerEvents={etapa === 'checkin' && (arrastando || soltou) ? 'none' : 'box-none'}
              style={[styles.rodape, { paddingBottom: bottom + space[40], opacity: rodape }]}
            >
              <View style={styles.pilha}>
                <Botao
                  rotulo={depoisDeUsar ? 'Acho que já foi o suficiente' : 'Dessa vez não abro'}
                  corRotulo={cores.icon.primary}
                  icone={(cor) => <Icone nome="rosto-positivo" cor={cor} />}
                  onPress={naoAbro}
                />
                {botaoTimer}
              </View>
              <View style={styles.dupla}>
                <View style={styles.metade}>
                  <Botao
                    rotulo="Hobbies"
                    corRotulo={cores.icon.primary}
                    icone={(cor) => <Icone nome="dado-peao" cor={cor} />}
                    onPress={abrirHobbies}
                  />
                </View>
                <View style={styles.metade}>
                  <Botao
                    rotulo="Diário"
                    corRotulo={cores.icon.primary}
                    icone={(cor) => <Icone nome="livro-marcador" cor={cor} />}
                    onPress={escreverNoDiario}
                  />
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* Emoções */}
          {etapa === 'checkin'
            ? emocoes.map((e, i) =>
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
                    travado={soltou}
                    opacidade={selecionada && (arrastando || soltou) ? OPACIDADE_FUNDO : 1}
                    onSelecionar={() => setSelecionada(e.id)}
                    onArrastando={setArrastando}
                    onSoltarNaCabeca={() => soltar(e)}
                  />
                ) : null,
              )
            : null}
        </>
      ) : null}

      {etapa === 'emocao' && emocao ? (
        <EmocaoRegistrada
          emocao={emocao}
          rodape={(apareceu) =>
            origem === 'pausa' ? (
              <View style={styles.pilha}>
                <Botao
                  rotulo="Quero explorar essa emoção"
                  corRotulo={cores.icon.primary}
                  icone={(cor) => <IconeEscrever width={23.91} height={23.22} corTraco={cor} />}
                  onPress={explorarEmocao}
                />
                {botaoTimer}
              </View>
            ) : (
              <View style={styles.pilha}>
                {/* a contagem só começa quando a tela já apareceu inteira */}
                <BotaoContagem inicio={apareceu} onPress={explorarEmocao} onFim={sumir} />
                <Botao rotulo="Sair" estilo="secundario" apagado onPress={sumir} />
              </View>
            )
          }
        />
      ) : null}

      {etapa === 'naoAbri' ? (
        <View style={[styles.cheia, { paddingTop: top, paddingBottom: bottom }]}>
          <NaoAbri depoisDeUsar={depoisDeUsar} onCheckin={() => abrirCheckin('naoAbri')} onFim={sumir} />
        </View>
      ) : null}

      {etapa === 'tempo' ? (
        <View style={[styles.cheia, { paddingTop: top, paddingBottom: bottom }]}>
          {/* escolher um tempo segue para o app (aberta por dentro do Consi, só fecha a pausa); Sair volta para a Home */}
          <TempoNoApp onEscolher={irParaOApp} onSair={sumir} />
        </View>
      ) : null}

      {etapa === 'hobbies' && hobbyRoda ? (
        <Aparecer style={styles.cheia} deslocamento={0}>
          <RodaHobbies hobbies={hobbies} inicial={inicioRoda} escolhido={hobbyRoda} onMudar={setHobbyEscolhido} />
          <View pointerEvents="box-none" style={[styles.rodapeRoda, { paddingBottom: bottom + space[40] }]}>
            <Botao
              rotulo="Quero explorar esse hobby"
              corRotulo={cores.icon.primary}
              icone={(cor) => <Icone nome={hobbyInfo(hobbyRoda).icone} cor={cor} />}
              onPress={explorarHobby}
            />
            {/* saída discreta de volta para a pausa (o Figma não tem; no iPhone não há voltar do sistema) */}
            <Botao rotulo="Voltar" estilo="secundario" apagado onPress={() => setEtapa('pausa')} />
          </View>
        </Aparecer>
      ) : null}
    </View>
  );
}

/**
 * Timer de continuar: começa quando a pausa abre e não para durante o check-in.
 * Se o grupo terminar de carregar depois (outra duração), o fim é recalculado.
 */
function useTimer(duracaoMs: number) {
  const [inicio] = useState(() => Date.now());
  const [progresso] = useState(() => new Animated.Value(0));
  const [agora, setAgora] = useState(inicio);
  const fim = inicio + duracaoMs;
  const pronto = agora >= fim;

  useEffect(() => {
    const passado = Date.now() - inicio;
    progresso.setValue(Math.min(1, passado / duracaoMs));
    const a = Animated.timing(progresso, {
      toValue: 1,
      duration: Math.max(0, duracaoMs - passado),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [inicio, duracaoMs, progresso]);

  useEffect(() => {
    if (pronto) return;
    const t = setInterval(() => setAgora(Date.now()), 200);
    return () => clearInterval(t);
  }, [pronto]);

  return { progresso, pronto, segundos: Math.max(0, Math.ceil((fim - agora) / 1000)) };
}

/** Duração do appear-in dos botões (o padrão do Aparecer). */
const DURACAO_RODAPE = 900;

/**
 * Emoção registrada no check-in da pausa (Figma 642:8276): clarão feedback/info, nome e balão.
 * `rodape` recebe o instante (ms desde que a tela abriu) em que os botões terminam de aparecer.
 */
function EmocaoRegistrada({ emocao, rodape }: { emocao: Emocao; rodape: (apareceu: number) => ReactNode }) {
  const { cores } = useTema();
  const { top, bottom } = useSafeAreaInsets();
  const [clarao] = useState(() => new Animated.Value(1));
  const fimTexto = fimDoTexto(DESCRICAO_EMOCAO, 500);

  useEffect(() => {
    Animated.timing(clarao, {
      toValue: 0,
      duration: 500,
      delay: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: nativo,
    }).start();
  }, [clarao]);

  return (
    <View style={[styles.cheia, { paddingTop: top }]}>
      <View style={styles.centroEmocao}>
        <View style={styles.textosEmocao}>
          <TextoAnimado texto={emocao.nome} estilo="Títulos/Grande" atraso={300} />
          <TextoAnimado texto={DESCRICAO_EMOCAO} estilo="Texto/Médio" atraso={500} />
        </View>
        <Aparecer atraso={400} escalaInicial={0.85} deslocamento={0} duracao={800}>
          <BalaoEmocao Svg={emocao.Svg} Textura={emocao.Textura} circulo={emocao.circulo} tamanho={144} />
        </Aparecer>
      </View>
      <Aparecer
        atraso={fimTexto}
        duracao={DURACAO_RODAPE}
        style={[styles.rodapeEmocao, { paddingBottom: bottom + space[40] }]}
      >
        {rodape(fimTexto + DURACAO_RODAPE)}
      </Aparecer>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: cores.feedback.info, opacity: clarao }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  cheia: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  // Figma: título e "?" com 64 px entre eles, no meio da área acima dos botões
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[64], paddingHorizontal: space[24] },
  textoCentro: { textAlign: 'center' },
  autor: { marginTop: space[12] },
  // Figma: 12 + 16 px nas laterais, 40 px embaixo; 12 px entre os dois primeiros botões e 32 até a dupla
  rodape: { paddingHorizontal: space[12] + space[16], gap: space[32] },
  pilha: { gap: space[12] },
  dupla: { flexDirection: 'row', gap: space[24] },
  metade: { flex: 1 },
  instrucao: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
  pessoa: { position: 'absolute', width: PESSOA.largura, height: PESSOA.altura },
  centroEmocao: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[64], paddingHorizontal: space[24] },
  textosEmocao: { alignItems: 'center', gap: 17, maxWidth: 283 },
  rodapeEmocao: { paddingHorizontal: space[12] + space[16] },
  // Figma 162:255: o botão fica 28 px das laterais, sobre a roda
  rodapeRoda: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[12] + space[16],
    gap: space[12],
  },
});
