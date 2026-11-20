import { apagarEstado, gravarEstado, lerEstado } from '@/data/banco';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, Folha, Icone, ItemFolha, Texto, useAviso } from '@/components';
import { Fechar } from '@/components/diario/assets';
import { GravandoAudio, PlayerAudio, useGravador } from '@/components/diario/Audio';
import { CampoMomento } from '@/components/diario/CampoMomento';
import { ALTURA_CARROSSEL, CarrosselEmocoes } from '@/components/diario/CarrosselEmocoes';
import { escolherFoto, FotoAnexada, VisualizarFoto } from '@/components/diario/Fotos';
import { Premo } from '@/components/diario/Premo';
import { emocaoPorId, emocoes } from '@/data/emocoes';
import {
  adicionarMomento,
  atualizarMomento,
  carregarMomentos,
  dataDaChave,
  diasAtras,
  hora,
  MESES,
  momentoPorEm,
  PERGUNTA_DA_EMOCAO,
  plural,
  resumoAnexos,
  type Anexo,
  type Destaque,
  type Momento,
} from '@/data/momentos';
import { duration, easing, radius, space, useTema } from '@/theme';

const curva = Easing.bezier(...easing.standard);
const CHAVE_RASCUNHO = 'consi:diario:rascunho';

type Rascunho = { id: string | null; texto: string; destaques: Destaque[]; anexos: Anexo[] };

/**
 * Novo momento (Figma 760:6169 → 760:6149 → 760:6190 → 760:6211).
 * - sem emoção: o "?" no centro, "Como você está?" e o campo desligado;
 * - com emoção: o nome em Títulos/Destaque e a pergunta da emoção no campo;
 * - escrevendo: o carrossel recolhe, o campo sobe com borda border/focus e a barra
 *   (microfone, câmera, emoção, "Pronto") fica sobre o teclado;
 * - com anexos: áudio e fotos dentro do campo, "1 áudio · 1 foto" no rodapé.
 *
 * Parâmetros: `em` abre um momento que já existe (o check-in da Home ou da Pausa, para escrever
 * sobre ele); `emocao` já escolhe a emoção; `data` (AAAA-MM-DD) guarda em outro dia;
 * `pergunta` vem da Página de hoje; `acao` (audio | foto) já abre o anexo.
 */
export default function NovoMomento() {
  const { cores } = useTema();
  const { width, height } = useWindowDimensions();
  // Figma: o carrossel começa a ~16% da altura (233 px numa tela de 917)
  const respiro = Math.max(24, Math.round(height * 0.16));
  const params = useLocalSearchParams<{ em?: string; emocao?: string; data?: string; pergunta?: string; acao?: string }>();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const gravador = useGravador();
  const campo = useRef<TextInputInstance | null>(null);

  const existente = params.em ? momentoPorEm(params.em) : undefined;
  const [quando] = useState(() => {
    if (existente) return existente.em;
    if (params.data) {
      const d = dataDaChave(params.data);
      const agora = new Date();
      d.setHours(agora.getHours(), agora.getMinutes(), 0, 0);
      return d.getTime();
    }
    return Date.now();
  });

  const [emocao, setEmocao] = useState<string | null>(existente?.id ?? params.emocao ?? null);
  const [texto, setTexto] = useState(existente?.texto ?? '');
  const [destaques, setDestaques] = useState<Destaque[]>(existente?.destaques ?? []);
  const [anexos, setAnexos] = useState<Anexo[]>(existente?.anexos ?? []);
  const [escrevendo, setEscrevendo] = useState(false);
  const [versaoSalva, setVersaoSalva] = useState('');
  const [folhaFoto, setFolhaFoto] = useState(false);
  const [sair, setSair] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [pedirEmocao, setPedirEmocao] = useState(false);
  const [recolher] = useState(() => new Animated.Value(0));

  const nomeEmocao = emocaoPorId(emocao)?.nome;
  const temConteudo = !!texto.trim() || anexos.length > 0;
  const rascunhavel = !existente;

  // Rascunho: um novo momento sem guardar volta quando a pessoa abrir outro.
  useEffect(() => {
    if (!rascunhavel || params.emocao) return;
    lerEstado(CHAVE_RASCUNHO)
      .then((bruto) => {
        if (!bruto) return;
        const r = JSON.parse(bruto) as Rascunho;
        if (!r.texto && !r.anexos.length) return;
        setEmocao((e) => e ?? r.id);
        setTexto(r.texto);
        setDestaques(r.destaques);
        setAnexos(r.anexos);
        mostrarAviso('Seu rascunho voltou');
      })
      .catch(() => {});
  }, [rascunhavel, params.emocao, mostrarAviso]);

  // Grava o rascunho 600 ms depois da última mudança; "salvo" aparece quando o gravado é o atual.
  const versao = JSON.stringify({ id: emocao, texto, destaques, anexos } satisfies Rascunho);
  const salvo = versaoSalva === versao;
  useEffect(() => {
    if (!rascunhavel) return;
    const t = setTimeout(() => {
      gravarEstado(CHAVE_RASCUNHO, versao)
        .then(() => setVersaoSalva(versao))
        .catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [rascunhavel, versao]);

  // O momento existente pode ainda não estar carregado (abrindo direto da pausa).
  useEffect(() => {
    if (!params.em || existente) return;
    carregarMomentos().then(() => {
      const m = momentoPorEm(params.em);
      if (!m) return;
      setEmocao(m.id);
      setTexto(m.texto ?? '');
      setDestaques(m.destaques ?? []);
      setAnexos(m.anexos ?? []);
    });
  }, [params.em, existente]);

  // Escrevendo: o carrossel e o título recolhem para o campo subir.
  useEffect(() => {
    Animated.timing(recolher, {
      toValue: escrevendo ? 1 : 0,
      duration: duration.slow,
      easing: curva,
      useNativeDriver: false,
    }).start();
  }, [escrevendo, recolher]);

  // ─── Anexos ───────────────────────────────────────────────────────────────
  const gravarAudio = async () => {
    if (gravador.gravando) return;
    const r = await gravador.iniciar();
    if (r === 'sem-permissao') mostrarAviso('Permita o microfone nos ajustes do celular para gravar.');
    else if (r === 'erro') mostrarAviso('Não deu para gravar agora. Tente de novo.');
  };
  const pararAudio = async () => {
    const a = await gravador.parar();
    if (a) setAnexos((l) => [...l, { tipo: 'audio', uri: a.uri, duracao: a.duracao }]);
  };
  const adicionarFoto = async (deOnde: 'camera' | 'galeria') => {
    setFolhaFoto(false);
    const uri = await escolherFoto(deOnde);
    if (uri) setAnexos((l) => [...l, { tipo: 'foto', uri }]);
  };
  const remover = (a: Anexo) => setAnexos((l) => l.filter((x) => x !== a));

  // Da Página de hoje: o microfone/câmera já abrem quando a tela termina de entrar.
  useEffect(() => {
    const t = setTimeout(() => {
      if (params.acao === 'audio') gravarAudio();
      else if (params.acao === 'foto') setFolhaFoto(true);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir
  }, []);

  // ─── Sair e guardar ───────────────────────────────────────────────────────
  const fechar = () => {
    if (gravador.gravando) gravador.parar();
    router.back();
  };
  const pedirParaSair = () => {
    if (temConteudo && rascunhavel) setSair(true);
    else fechar();
    return true;
  };
  useEffect(() => {
    const s = BackHandler.addEventListener('hardwareBackPress', () => {
      if (escrevendo) {
        Keyboard.dismiss();
        return true;
      }
      return pedirParaSair();
    });
    return () => s.remove();
  });

  const descartar = () => {
    apagarEstado(CHAVE_RASCUNHO).catch(() => {});
    setSair(false);
    fechar();
  };

  // Dá para escrever antes de escolher a emoção; ela só é pedida na hora de guardar.
  const guardar = async (escolhida = emocao) => {
    if (!escolhida) {
      Keyboard.dismiss();
      setPedirEmocao(true);
      return;
    }
    setPedirEmocao(false);
    if (gravador.gravando) await pararAudio();
    const dados: Partial<Momento> = {
      id: escolhida,
      texto: texto.trim() ? texto : undefined,
      destaques: destaques.length ? destaques : undefined,
      anexos: anexos.length ? anexos : undefined,
    };
    let em = quando;
    if (existente || params.em) {
      const antes = momentoPorEm(params.em);
      await atualizarMomento(Number(params.em), {
        ...dados,
        editadoEm: antes?.texto !== dados.texto ? Date.now() : antes?.editadoEm,
      });
      em = Number(params.em);
    } else {
      const m = await adicionarMomento({ ...(dados as Omit<Momento, 'em'>), em: quando, origem: 'diario' });
      em = m.em;
      apagarEstado(CHAVE_RASCUNHO).catch(() => {});
    }
    // Novo, Home ou Pausa: fecha tudo por cima das abas e volta para a tela principal do
    // Diário (na visão escolhida, lista ou linha do tempo), com o aviso "Momento guardado".
    if (router.canDismiss()) router.dismissAll();
    router.navigate({ pathname: '/diario', params: { guardado: String(em) } });
  };

  // ─── Tela ─────────────────────────────────────────────────────────────────
  const n = diasAtras(quando);
  const d = new Date(quando);
  const horario = n === 0 ? hora(quando) : `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} · ${hora(quando)}`;
  const placeholder =
    params.pergunta ?? (emocao ? (PERGUNTA_DA_EMOCAO[emocao] ?? 'Como foi esse momento?') : 'Escreva o que quiser. A emoção pode vir depois.');
  const alturaTopo = respiro + ALTURA_CARROSSEL + 100;

  const resumo = resumoAnexos(anexos);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.sunken }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        {/* Topo: Fechar, "Novo momento" e o horário */}
        <View style={styles.cabecalho}>
          <Pressable onPress={pedirParaSair} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.lado}>
            <Fechar width={24} height={24} corTraco={cores.icon.primary} />
          </Pressable>
          <Texto estilo="Texto/Botões e rótulos" style={styles.titulo}>
            {existente || params.em ? 'Seu momento' : 'Novo momento'}
          </Texto>
          <View style={[styles.lado, styles.direita]}>
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} numberOfLines={1}>
              {horario}
            </Texto>
          </View>
        </View>

        {/* Carrossel e título (recolhem enquanto escreve) */}
        <Animated.View
          pointerEvents={escrevendo ? 'none' : 'auto'}
          style={{
            height: recolher.interpolate({ inputRange: [0, 1], outputRange: [alturaTopo, 0] }),
            opacity: recolher.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
            overflow: 'hidden',
          }}
        >
          <View style={{ marginTop: respiro }}>
            <CarrosselEmocoes largura={width} valor={emocao} onMudar={setEmocao} />
          </View>
          <View style={styles.textos}>
            <Texto estilo="Títulos/Destaque" style={styles.centro}>
              {nomeEmocao ?? 'Como você está?'}
            </Texto>
            {!nomeEmocao ? (
              <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.centro}>
                Deslize e toque na emoção que mais combina
              </Texto>
            ) : null}
          </View>
        </Animated.View>

        {/* Campo · texto */}
        <View style={[styles.areaCampo, escrevendo && styles.areaCampoEscrevendo]}>
          <Pressable
            onPress={() => campo.current?.focus()}
            style={[
              styles.campo,
              (escrevendo || temConteudo || gravador.gravando) && styles.flex,
              {
                backgroundColor: cores.bg.base,
                borderColor: escrevendo ? cores.border.focus : 'transparent',
              },
            ]}
          >
            <CampoMomento
                cheio
                ref={campo}
                texto={texto}
                destaques={destaques}
                onMudar={(t, ds) => {
                  setTexto(t);
                  setDestaques(ds);
                }}
                placeholder={placeholder}

                onFocus={() => setEscrevendo(true)}
                onBlur={() => setEscrevendo(false)}
                minimo={60}
              />

            {escrevendo ? (
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.contagem}>
                {plural(texto.length, 'caractere', 'caracteres')}
                {rascunhavel && salvo && temConteudo ? ' · salvo' : ''}
              </Texto>
            ) : (
              <View style={styles.rodapeCampo}>
                {gravador.gravando || anexos.length ? (
                  <View style={styles.anexos}>
                    {gravador.gravando ? <GravandoAudio segundos={gravador.segundos} onParar={pararAudio} /> : null}
                    {anexos.map((a, i) =>
                      a.tipo === 'audio' ? (
                        <View key={a.uri + i} style={styles.linhaAnexo}>
                          <PlayerAudio uri={a.uri} duracao={a.duracao} onRemover={() => remover(a)} />
                        </View>
                      ) : null,
                    )}
                    {anexos.some((a) => a.tipo === 'foto') ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fotos}>
                        {anexos.map((a, i) => (a.tipo === 'foto' ? <FotoAnexada key={a.uri + i} uri={a.uri} onPress={() => setFoto(a.uri)} /> : null))}
                      </ScrollView>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.ferramentas}>
                  <Pressable onPress={gravarAudio} hitSlop={8} accessibilityRole="button" accessibilityLabel="Gravar áudio">
                    <Icone nome="microfone" cor={cores.text.tertiary} />
                  </Pressable>
                  <Pressable onPress={() => setFolhaFoto(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Adicionar foto">
                    <Icone nome="camera" cor={cores.text.tertiary} />
                  </Pressable>
                  <View style={styles.flex} />
                  <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                    {resumo || 'opcional'}
                  </Texto>
                </View>
              </View>
            )}
          </Pressable>
        </View>

        {/* Rodapé: "Guardar momento", ou a barra sobre o teclado */}
        {escrevendo ? (
          <View style={[styles.barraTeclado, { backgroundColor: cores.bg.raised }]}>
            <Pressable onPress={gravarAudio} hitSlop={8} accessibilityRole="button" accessibilityLabel="Gravar áudio">
              <Icone nome="microfone" />
            </Pressable>
            <Pressable onPress={() => setFolhaFoto(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Adicionar foto">
              <Icone nome="camera" />
            </Pressable>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Trocar emoção">
              <Premo id={emocao} tamanho={30} />
            </Pressable>
            <View style={styles.flex} />
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10} accessibilityRole="button">
              <Texto estilo="Texto/Botões e rótulos" cor={cores.text.accent}>
                Pronto
              </Texto>
            </Pressable>
          </View>
        ) : (
          <View style={styles.rodape}>
            <Botao rotulo="Guardar momento" disabled={!emocao && !temConteudo} onPress={() => guardar()} />
          </View>
        )}
      </KeyboardAvoidingView>

      {aviso}

      <Folha visivel={folhaFoto} onFechar={() => setFolhaFoto(false)} titulo="Adicionar foto">
        <View>
          <ItemFolha rotulo="Tirar foto" icone={(c) => <Icone nome="camera" cor={c} />} onPress={() => adicionarFoto('camera')} />
          <ItemFolha rotulo="Escolher da galeria" icone={(c) => <Icone nome="inserir-imagem" cor={c} />} onPress={() => adicionarFoto('galeria')} />
        </View>
      </Folha>

      <Folha
        visivel={sair}
        onFechar={() => setSair(false)}
        titulo="Sair sem guardar?"
        descricao="O rascunho fica neste aparelho e volta quando você abrir um novo momento."
      >
        <View style={styles.botoesSair}>
          <Botao rotulo="Continuar escrevendo" onPress={() => setSair(false)} />
          <Botao rotulo="Descartar rascunho" estilo="secundario" estado="erro" onPress={descartar} />
          <Botao
            rotulo="Sair e guardar depois"
            estilo="secundario"
            apagado
            onPress={() => {
              setSair(false);
              fechar();
            }}
          />
        </View>
      </Folha>

      {/* Escreveu sem escolher a emoção: ela é pedida só na hora de guardar */}
      <Folha
        visivel={pedirEmocao}
        onFechar={() => setPedirEmocao(false)}
        titulo="Como você estava?"
        descricao="Escolha a emoção que mais combina para guardar o momento."
      >
        <View style={styles.grade}>
          {emocoes.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => {
                setEmocao(e.id);
                guardar(e.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={e.nome}
              style={({ pressed }) => [styles.opcao, { backgroundColor: cores.bg.sunken, opacity: pressed ? 0.8 : 1 }]}
            >
              <Premo id={e.id} tamanho={36} />
              <Texto estilo="Legenda/Pequena" numberOfLines={1}>
                {e.nome}
              </Texto>
            </Pressable>
          ))}
        </View>
      </Folha>

      <VisualizarFoto
        uri={foto}
        onFechar={() => setFoto(null)}
        onRemover={() => {
          setAnexos((l) => l.filter((a) => !(a.tipo === 'foto' && a.uri === foto)));
          setFoto(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1 },
  cabecalho: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: space[4] },
  lado: { width: 72, justifyContent: 'center' },
  direita: { alignItems: 'flex-end' },
  titulo: { flex: 1, textAlign: 'center' },
  textos: { alignItems: 'center', gap: space[16], paddingHorizontal: space[24], marginTop: space[20] },
  centro: { textAlign: 'center' },
  areaCampo: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space[24], paddingTop: space[24] },
  areaCampoEscrevendo: { justifyContent: 'flex-start', paddingTop: 40, paddingBottom: space[24] },
  campo: {
    flexShrink: 1,
    minHeight: 188,
    gap: space[16],
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  contagem: { alignSelf: 'flex-end' },
  rodapeCampo: { gap: space[16] },
  anexos: { gap: 10 },
  linhaAnexo: { flexDirection: 'row' },
  fotos: { gap: 10 },
  ferramentas: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  rodape: { paddingHorizontal: space[24], paddingTop: 44, paddingBottom: space[24] },
  barraTeclado: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[20],
    paddingHorizontal: space[24],
    borderRadius: radius.none,
  },
  botoesSair: { gap: space[12] },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  opcao: { width: '31%', flexGrow: 1, alignItems: 'center', gap: space[4], paddingVertical: space[12], borderRadius: radius.md },
});
