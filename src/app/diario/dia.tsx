import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  PanResponder,

  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, Etiqueta, Texto, useAviso } from '@/components';
import { Aparecer } from '@/components/animacao';
import { ChevronEsquerda } from '@/components/diario/assets';
import { PlayerAudio } from '@/components/diario/Audio';
import { useAvisoPendente } from '@/components/diario/avisoPendente';
import { TextoComDestaques } from '@/components/diario/CampoMomento';
import { FotoAnexada, VisualizarFoto } from '@/components/diario/Fotos';
import { Premo } from '@/components/diario/Premo';
import { sairPeloLado, useArrasteLateral, voltarAoLugar } from '@/components/hobbies/Arraste';
import { IconeLupa } from '@/components/home/assets';
import { emocaoPorId } from '@/data/emocoes';
import {
  acharTermo,
  apagarMomento,
  chaveDia,
  dataDaChave,
  diaLongo,
  hora,
  emocoesDoDia,
  plural,
  restaurarMomento,
  useMomentos,
  type Momento,
} from '@/data/momentos';
import { borderWidth, duration, radius, space, tipografia, useTema } from '@/theme';
import { OrigemReflexao } from '@/components/diario/OrigemReflexao';

/** Onde ficam os outros balões em volta do principal (Figma 737:15765), relativos ao centro. */
const AO_REDOR = [
  { x: -88, y: 51, lado: 44 },
  { x: 90, y: 36, lado: 50 },
  { x: -128, y: -28, lado: 36 },
  { x: 126, y: -40, lado: 36 },
];
/** A folha "Momentos do dia" começa em 380/917 da tela e pode subir até perto do topo. */
const TOPO_FOLHA = 380 / 917;

/**
 * Constelação · Dia aberto (Figma 737:15765): o dia como um aglomerado de balões, a emoção
 * mais sentida no centro, e a folha "Momentos do dia" com cada momento. A folha sobe arrastando
 * a alça; a lupa filtra os momentos do dia. Arrastar um momento para a esquerda mostra
 * "Excluir · solte para apagar" (760:6297); tocar abre "Editar momento" (760:6339).
 */
export default function DiaAberto() {
  const { cores } = useTema();
  const { height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  // `reflexao`: veio de uma Reflexão da Home (mostra a origem na folha).
  const { data, reflexao } = useLocalSearchParams<{ data: string; reflexao?: string }>();
  const dia = dataDaChave(data ?? chaveDia(new Date()));
  const todos = useMomentos();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  // voltando de uma entrada apagada na edição: "Momento apagado" com o desfazer
  useAvisoPendente((a) => mostrarAviso(a.titulo, a.desfazer ? { rotulo: 'Desfazer', onPress: a.desfazer } : undefined));

  const [arrastando, setArrastando] = useState(false);
  const [busca, setBusca] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);

  const momentos = useMemo(() => todos.filter((m) => chaveDia(m.em) === chaveDia(dia)), [todos, dia]);
  // mesmo padrão da linha do tempo: até 5 emoções, a central é a mais repetida (ou a mais recente)
  const [principal = null, ...outras] = emocoesDoDia(momentos);
  const visiveis = busca?.trim()
    ? momentos.filter(
        (m) =>
          (m.texto && acharTermo(m.texto, busca)) ||
          acharTermo(emocaoPorId(m.id)?.nome ?? '', busca) ||
          m.marcadores?.some((x) => acharTermo(x, busca)),
      )
    : momentos;

  // Folha: arrastar a alça sobe (quase tela cheia) ou desce (posição do Figma).
  const meio = height * TOPO_FOLHA;
  const alto = top + 64;
  const [y] = useState(() => new Animated.Value(0));
  const [aberta, setAberta] = useState(false);
  const [gesto] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => y.setValue(g.dy),
      onPanResponderRelease: (_, g) => {
        setAberta((a) => {
          const vai = a ? !(g.dy > 80 || g.vy > 0.6) : g.dy < -60 || g.vy < -0.6;
          return vai;
        });
        Animated.spring(y, { toValue: 0, useNativeDriver: false, speed: 16, bounciness: 4 }).start();
      },
    }),
  );
  const topoFolha = Animated.add(y, aberta ? alto : meio);

  const apagar = (m: Momento) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(duration.slow, 'easeInEaseOut', 'opacity'));
    apagarMomento(m.em);
    mostrarAviso('Momento apagado', { rotulo: 'Desfazer', onPress: () => restaurarMomento(m) });
  };

  return (
    <View style={[styles.tela, { backgroundColor: cores.bg.sunken }]}>
      {/* Topo: voltar e a data */}
      <View style={[styles.cabecalho, { paddingTop: top + space[12] }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.voltar}>
          <ChevronEsquerda width={24} height={24} corTraco={cores.icon.primary} />
        </Pressable>
        <Texto estilo="Texto/Botões e rótulos" style={styles.titulo}>
          {diaLongo(dia)}
        </Texto>
        <View style={styles.voltar} />
      </View>

      {/* Aglomerado de emoções do dia */}
      <View style={[styles.aglomerado, { height: meio - top - 56 }]}>
        <View style={styles.areaAglomerado}>
          <View style={styles.centroAglomerado}>
            {outras.map((id, i) => {
              const p = AO_REDOR[i];
              return (
                <Aparecer key={id} atraso={200 + i * 120} escalaInicial={0.6} deslocamento={0} duracao={700} style={[styles.absoluto, { left: p.x - p.lado / 2, top: p.y - p.lado / 2, opacity: 0.9 }]}>
                  <Premo id={id} tamanho={p.lado} flutuar fase={i * 500} />
                </Aparecer>
              );
            })}
            <Aparecer escalaInicial={0.8} deslocamento={0} duracao={700} style={[styles.absoluto, { left: -53, top: -52 }]}>
              <Premo id={principal} tamanho={107} flutuar />
            </Aparecer>
          </View>
        </View>
        <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.resumo}>
          {momentos.length
            ? `${plural(momentos.length, 'momento', 'momentos')} · mais sentida: ${emocaoPorId(principal)?.nome}`
            : 'Nenhum momento neste dia'}
        </Texto>
      </View>

      {/* Folha · momentos */}
      <Animated.View style={[styles.folha, { top: topoFolha, backgroundColor: cores.bg.raised }]}>
        <View {...gesto.panHandlers} style={styles.puxador}>
          <View style={[styles.alca, { backgroundColor: cores.text.tertiary }]} />
          <View style={styles.cabecalhoFolha}>
            <Texto estilo="Títulos/Médio">Momentos do dia</Texto>
            {momentos.length ? (
              <Pressable
                onPress={() => setBusca((b) => (b === null ? '' : null))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={busca === null ? 'Buscar neste dia' : 'Fechar busca'}
              >
                <IconeLupa width={22.6} height={24} corTraco={busca === null ? cores.icon.primary : cores.text.accent} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {reflexao ? <OrigemReflexao titulo={reflexao} style={styles.origem} /> : null}
        {busca !== null ? (
          <View style={[styles.busca, { backgroundColor: cores.bg.base, borderColor: cores.border.focus }]}>
            <TextInput
              autoFocus
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar neste dia"
              placeholderTextColor={cores.text.tertiary}
              selectionColor={cores.action.primary.default}
              style={[tipografia['Texto/Pequeno'], styles.entradaBusca, { color: cores.text.primary }]}
            />
          </View>
        ) : null}

        <ScrollView
          scrollEnabled={!arrastando}
          contentContainerStyle={{ paddingBottom: bottom + space[24] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {visiveis.map((m, i) => (
            <LinhaMomento
              key={m.em}
              momento={m}
              ultimo={i === visiveis.length - 1}
              onArrastando={setArrastando}
              onApagar={() => apagar(m)}
              onAbrir={() => router.push({ pathname: '/diario/momento', params: { em: String(m.em) } })}
              onFoto={setFoto}
            />
          ))}
          {busca && !visiveis.length ? (
            <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.nada}>
              Nada encontrado neste dia.
            </Texto>
          ) : null}
          {!momentos.length ? (
            <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.nada}>
              Você não registrou nada neste dia. Ainda dá tempo de lembrar como foi.
            </Texto>
          ) : null}
          <View style={styles.adicionar}>
            <Botao
              rotulo="Adicionar momento a este dia"
              estilo="secundario"
              onPress={() => router.push({ pathname: '/diario/novo', params: { data: chaveDia(dia) } })}
            />
          </View>
        </ScrollView>
      </Animated.View>

      {aviso}

      <VisualizarFoto uri={foto} onFechar={() => setFoto(null)} />
    </View>
  );
}

/** Momento na folha (Figma 737:15780): Premo de 40 px, emoção, hora, texto, marcadores e anexos. */
function LinhaMomento({
  momento,
  ultimo,
  onArrastando,
  onApagar,
  onAbrir,
  onFoto,
}: {
  momento: Momento;
  ultimo: boolean;
  onArrastando: (a: boolean) => void;
  onApagar: () => void;
  onAbrir: () => void;
  onFoto: (uri: string) => void;
}) {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const { pan, handlers, progressoEsq } = useArrasteLateral({
    limiar: 110,
    onArrastando,
    onSoltar: (lado, p) => {
      if (lado === 'esquerda') sairPeloLado(p, 'esquerda', width, onApagar);
      else voltarAoLugar(p);
    },
  });
  // só arrasta para a esquerda
  const x = pan.interpolate({ inputRange: [-width, 0, 1], outputRange: [-width, 0, 0] });
  const fotos = momento.anexos?.filter((a) => a.tipo === 'foto') ?? [];
  const audios = momento.anexos?.filter((a) => a.tipo === 'audio') ?? [];

  return (
    <View style={[styles.linha, !ultimo && { borderBottomWidth: 1, borderBottomColor: cores.border.subtle }]}>
      {/* Excluir · solte para apagar (fundo bg/error-subtle) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.excluir, { backgroundColor: cores.bg['error-subtle'], opacity: progressoEsq }]}
      >
        <Texto estilo="Texto/Médio">Excluir</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
          solte para apagar
        </Texto>
      </Animated.View>
      <Animated.View {...handlers} style={{ transform: [{ translateX: x }] }}>
        <Pressable onPress={onAbrir} accessibilityRole="button" accessibilityHint="Toque para abrir, arraste para a esquerda para apagar" style={[styles.momento, { backgroundColor: cores.bg.raised }]}>
          <Premo id={momento.id} tamanho={40} />
          <View style={styles.textos}>
            <View style={styles.topoMomento}>
              <Texto estilo="Títulos/Pequeno">{emocaoPorId(momento.id)?.nome}</Texto>
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                {hora(momento.em)}
              </Texto>
            </View>
            {momento.texto ? (
              <TextoComDestaques texto={momento.texto} destaques={momento.destaques} />
            ) : (
              <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary}>
                Sem texto. Toque para escrever sobre esse momento.
              </Texto>
            )}
            {audios.map((a, i) => (
              <View key={a.uri + i} style={styles.linhaAnexo}>
                <PlayerAudio uri={a.uri} duracao={a.duracao} />
              </View>
            ))}
            {fotos.length ? (
              <View style={styles.linhaAnexo}>
                {fotos.map((a, i) => (
                  <FotoAnexada key={a.uri + i} uri={a.uri} tamanho={44} onPress={() => onFoto(a.uri)} />
                ))}
              </View>
            ) : null}
            {momento.marcadores?.length ? (
              <View style={styles.marcadores}>
                {momento.marcadores.map((m) => (
                  <Etiqueta key={m} rotulo={m} fundo={cores.bg.base} />
                ))}
              </View>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  voltar: { width: 44, height: 44, justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center' },
  aglomerado: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: space[24] },
  areaAglomerado: { flex: 1, alignSelf: 'stretch' },
  centroAglomerado: { position: 'absolute', left: '50%', top: '55%', width: 0, height: 0 },
  absoluto: { position: 'absolute' },
  resumo: { textAlign: 'center' },
  folha: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[24],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  puxador: { paddingTop: space[12], gap: space[12] },
  alca: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  cabecalhoFolha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space[12], paddingBottom: space[4] },
  origem: { marginTop: space[8] },
  busca: { height: 44, borderRadius: radius.full, borderWidth: borderWidth.medium, paddingHorizontal: space[16], justifyContent: 'center', marginTop: space[8] },
  entradaBusca: { padding: 0, outlineStyle: 'none' } as object,
  linha: { overflow: 'hidden' },
  excluir: {
    position: 'absolute',
    right: 0,
    top: 12,
    bottom: 12,
    width: 118,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  momento: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
  textos: { flex: 1, gap: 6 },
  topoMomento: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  linhaAnexo: { flexDirection: 'row', gap: space[8] },
  marcadores: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  nada: { textAlign: 'center', paddingVertical: space[24] },
  adicionar: { paddingTop: space[12] },
});

