import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Alternancia, Filtro, Folha, Icone, Texto, useEspacoBarra } from '@/components';
import { Aparecer } from '@/components/animacao';
import { ChevronDireita, ChevronEsquerda } from '@/components/diario/assets';
import { useAvisoMomento } from '@/components/diario/AvisoMomento';
import { Constelacao } from '@/components/diario/Constelacao';
import { BuscaDiario, ComeceAEscrever, FiltroDiario, GrupoIndice, ItemIndice, LinhaFiltros } from '@/components/diario/Indice';
import { Premo } from '@/components/diario/Premo';
import { SetaVoltar } from '@/components/onboarding/assets';
import { perguntaDeHoje, proximaPergunta, usePreferenciasDiario } from '@/data/diarioPreferencias';
import { emocaoPorId } from '@/data/emocoes';
import {
  apagarMomento,
  chaveDia,
  DIAS_SEMANA,
  diasAtras,
  MESES,
  momentoPorEm,
  nomeMes,
  restaurarMomento,
  temAudio,
  temFoto,
  useMomentos,
  type Momento,
} from '@/data/momentos';
import { radius, space, useTema } from '@/theme';

type FiltroId = 'tudo' | 'audio' | 'foto' | string;

/**
 * Aba Diário. Abre no Índice (Figma 752:6430 "Caderno · Índice · nova página · hoje no topo");
 * o botão de controles troca para a linha do tempo (760:5986 "Constelação · Semana").
 * Depois de guardar um momento, chega aqui com `guardado` e mostra "Sua linha do tempo"
 * (760:6257) com o momento novo destacado e o aviso com "Desfazer".
 */
export default function Diario() {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const espacoBarra = useEspacoBarra();
  const momentos = useMomentos();
  const [prefs, mudarPrefs] = usePreferenciasDiario();
  const { guardado } = useLocalSearchParams<{ guardado?: string }>();
  const [aviso, mostrarAviso] = useAvisoMomento();

  const [opcoes, setOpcoes] = useState(false);
  const [filtro, setFiltro] = useState<FiltroId>('tudo');
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [diasLinha, setDiasLinha] = useState(7);

  // Chegou de "Guardar momento": mostra o aviso uma vez, com o desfazer.
  const destaque = guardado ? Number(guardado) : null;
  useEffect(() => {
    if (!destaque) return;
    const m = momentoPorEm(destaque);
    if (!m) return;
    mostrarAviso('Momento guardado', m, () => {
      apagarMomento(m.em);
      mostrarAviso('Momento desfeito', m, () => restaurarMomento(m));
    });
  }, [destaque, mostrarAviso]);

  const linhaDoTempo = !!destaque || prefs.visao === 'linha';
  const abrirDia = (chave: string) => router.push({ pathname: '/diario/dia', params: { data: chave } });
  const abrirNovo = (params: Record<string, string> = {}) => router.push({ pathname: '/diario/novo', params });

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'left', 'right']}>
      {linhaDoTempo ? (
        <View style={styles.tela}>
          <View style={styles.margem}>
            {destaque ? (
              <View style={styles.cabecalho}>
                <Pressable
                  onPress={() => router.setParams({ guardado: undefined })}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
                  style={styles.voltar}
                >
                  <SetaVoltar width={7.06} height={12.71} corTraco={cores.icon.primary} />
                </Pressable>
                <Texto estilo="Texto/Botões e rótulos" style={styles.centro}>
                  Sua linha do tempo
                </Texto>
                <View style={styles.voltar} />
              </View>
            ) : (
              <BuscaDiario onPress={() => router.push('/diario/busca')} onControles={() => setOpcoes(true)} />
            )}
          </View>
          <ScrollView contentContainerStyle={{ paddingTop: space[24], paddingBottom: espacoBarra + 160 }} showsVerticalScrollIndicator={false}>
            <Constelacao
              momentos={momentos}
              largura={width}
              dias={diasLinha}
              destaque={destaque}
              onAbrirDia={abrirDia}
              onMaisDias={diasLinha < 60 ? () => setDiasLinha((d) => d + 7) : undefined}
            />
          </ScrollView>
          <Esmaecer altura={257} cor={cores.bg.base} />
        </View>
      ) : (
        <Indice
          momentos={momentos}
          filtro={filtro}
          setFiltro={setFiltro}
          mes={mes}
          setMes={setMes}
          semTexto={prefs.semTexto}
          pergunta={perguntaDeHoje(prefs)}
          onTrocarPergunta={() => mudarPrefs({ pergunta: proximaPergunta(prefs) })}
          onOpcoes={() => setOpcoes(true)}
          onAbrirDia={abrirDia}
          onNovo={abrirNovo}
        />
      )}

      {/* Registrar emoção (Figma 760:7248): action/secondary, Premo · Vazio e o rótulo */}
      {!destaque ? (
        <Pressable
          onPress={() => abrirNovo()}
          accessibilityRole="button"
          accessibilityLabel="Registrar emoção"
          style={({ pressed }) => [
            styles.registrar,
            { bottom: espacoBarra + space[24], backgroundColor: pressed ? cores.action.secondary.pressed : cores.action.secondary.default },
          ]}
        >
          <Premo tamanho={42} />
          <Texto estilo="Texto/Botões e rótulos" cor={cores.text['on-secondary']}>
            Registrar emoção
          </Texto>
        </Pressable>
      ) : null}

      {aviso}

      <Folha visivel={opcoes} onFechar={() => setOpcoes(false)} titulo="Ver diário como" descricao="Lista com tudo o que você escreveu, ou a linha do tempo dos seus dias.">
        <View style={styles.opcoesVisao}>
          <Filtro rotulo="Lista" ativo={prefs.visao === 'lista'} onPress={() => mudarPrefs({ visao: 'lista' })} />
          <Filtro rotulo="Linha do tempo" ativo={prefs.visao === 'linha'} onPress={() => mudarPrefs({ visao: 'linha' })} />
        </View>
        <View style={styles.opcaoLinha}>
          <View style={styles.flex}>
            <Texto estilo="Texto/Médio">Mostrar check-ins sem texto</Texto>
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              Emoções registradas no Início e nas pausas
            </Texto>
          </View>
          <Alternancia rotulo="Mostrar check-ins sem texto" ligado={prefs.semTexto} onMudar={(v) => mudarPrefs({ semTexto: v })} />
        </View>
      </Folha>
    </SafeAreaView>
  );
}

/** "Esmaecer" do Figma: degradê de transparente para bg/base no pé da linha do tempo. */
function Esmaecer({ altura, cor }: { altura: number; cor: string }) {
  return (
    <View pointerEvents="none" style={[styles.esmaecer, { height: altura }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="esmaecer" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={cor} stopOpacity={0} />
            <Stop offset="0.45" stopColor={cor} stopOpacity={1} />
            <Stop offset="1" stopColor={cor} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#esmaecer)" />
      </Svg>
    </View>
  );
}

function Indice({
  momentos,
  filtro,
  setFiltro,
  mes,
  setMes,
  semTexto,
  pergunta,
  onTrocarPergunta,
  onOpcoes,
  onAbrirDia,
  onNovo,
}: {
  momentos: Momento[];
  filtro: FiltroId;
  setFiltro: (f: FiltroId) => void;
  mes: { ano: number; mes: number };
  setMes: (m: { ano: number; mes: number }) => void;
  semTexto: boolean;
  pergunta: string;
  onTrocarPergunta: () => void;
  onOpcoes: () => void;
  onAbrirDia: (chave: string) => void;
  onNovo: (params?: Record<string, string>) => void;
}) {
  const { cores } = useTema();
  const espacoBarra = useEspacoBarra();
  const hoje = new Date();
  const esteMes = mes.ano === hoje.getFullYear() && mes.mes === hoje.getMonth();

  const doMes = useMemo(
    () =>
      momentos.filter((m) => {
        const d = new Date(m.em);
        return d.getFullYear() === mes.ano && d.getMonth() === mes.mes && (semTexto || !!m.texto || !!m.anexos?.length);
      }),
    [momentos, mes, semTexto],
  );

  // emoções do mês viram filtros, das mais frequentes para as menos
  const emocoesDoMes = useMemo(() => {
    const conta = new Map<string, number>();
    doMes.forEach((m) => conta.set(m.id, (conta.get(m.id) ?? 0) + 1));
    return [...conta.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [doMes]);

  const filtrados = doMes.filter((m) =>
    filtro === 'tudo' ? true : filtro === 'audio' ? temAudio(m) : filtro === 'foto' ? temFoto(m) : m.id === filtro,
  );

  const grupos = useMemo(() => {
    const g: { rotulo: string; itens: Momento[] }[] = [];
    const add = (rotulo: string, m: Momento) => {
      const ultimo = g[g.length - 1];
      if (ultimo?.rotulo === rotulo) ultimo.itens.push(m);
      else g.push({ rotulo, itens: [m] });
    };
    for (const m of filtrados) {
      const n = diasAtras(m.em);
      add(n === 0 ? 'Hoje' : n === 1 ? 'Ontem' : n < 7 ? 'Esta semana' : esteMes ? `Mais cedo em ${MESES[mes.mes]}` : nomeMes(mes.mes), m);
    }
    return g;
  }, [filtrados, esteMes, mes.mes]);

  const mudarMes = (delta: number) => {
    const d = new Date(mes.ano, mes.mes + delta, 1);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() });
    setFiltro('tudo');
  };

  const filtroValido = filtro === 'tudo' || filtro === 'audio' || filtro === 'foto' || emocoesDoMes.includes(filtro);
  const recente = filtrados[0]?.em;

  return (
    <ScrollView
      contentContainerStyle={[styles.margem, { paddingBottom: espacoBarra + 120 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topo}>
        <BuscaDiario onPress={() => router.push('/diario/busca')} onControles={onOpcoes} />

        {/* Página de hoje (Figma 752:6643) */}
        <Aparecer deslocamento={8} duracao={600}>
          <View style={[styles.pagina, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
            <View style={styles.paginaTopo}>
              <Texto estilo="Legenda/Pequena" cor={cores.text.accent}>
                Hoje · {DIAS_SEMANA[hoje.getDay()]}, {hoje.getDate()}
              </Texto>
              <Pressable onPress={onTrocarPergunta} hitSlop={10} accessibilityRole="button" accessibilityLabel="Outra pergunta">
                <Icone nome="sincronizar-setas" cor={cores.action.primary.default} />
              </Pressable>
            </View>
            <Pressable onPress={() => onNovo({ pergunta })} accessibilityRole="button">
              <Texto estilo="Títulos/Pequeno">{pergunta}</Texto>
            </Pressable>
            <ComeceAEscrever
              onEscrever={() => onNovo({ pergunta })}
              onAudio={() => onNovo({ pergunta, acao: 'audio' })}
              onFoto={() => onNovo({ pergunta, acao: 'foto' })}
            />
          </View>
        </Aparecer>
      </View>

      <LinhaFiltros>
        <FiltroDiario rotulo="Tudo" ativo={filtro === 'tudo' || !filtroValido} onPress={() => setFiltro('tudo')} />
        <FiltroDiario rotulo="Com áudio" ativo={filtro === 'audio'} onPress={() => setFiltro(filtro === 'audio' ? 'tudo' : 'audio')} />
        <FiltroDiario rotulo="Com foto" ativo={filtro === 'foto'} onPress={() => setFiltro(filtro === 'foto' ? 'tudo' : 'foto')} />
        {emocoesDoMes.map((id) => (
          <FiltroDiario
            key={id}
            rotulo={emocaoPorId(id)?.nome ?? id}
            ativo={filtro === id}
            onPress={() => setFiltro(filtro === id ? 'tudo' : id)}
          />
        ))}
      </LinhaFiltros>

      <View style={styles.mes}>
        <Texto estilo="Títulos/Médio">{nomeMes(mes.mes)}{mes.ano !== hoje.getFullYear() ? ` de ${mes.ano}` : ''}</Texto>
        <View style={styles.setas}>
          <Pressable onPress={() => mudarMes(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mês anterior">
            <ChevronEsquerda width={24} height={24} corTraco={cores.icon.primary} />
          </Pressable>
          <Pressable
            onPress={() => mudarMes(1)}
            disabled={esteMes}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            accessibilityState={{ disabled: esteMes }}
          >
            <ChevronDireita width={24} height={24} corTraco={esteMes ? cores.text.disabled : cores.icon.primary} />
          </Pressable>
        </View>
      </View>

      <Aparecer key={`${mes.ano}-${mes.mes}-${filtro}`} deslocamento={6} duracao={400} style={styles.lista}>
        {grupos.length ? (
          grupos.map((g) => (
            <View key={g.rotulo} style={styles.lista}>
              <GrupoIndice rotulo={g.rotulo} />
              {g.itens.map((m) => (
                <ItemIndice key={m.em} momento={m} recente={m.em === recente && diasAtras(m.em) === 0} onPress={() => onAbrirDia(chaveDia(m.em))} />
              ))}
            </View>
          ))
        ) : (
          <View style={styles.vazio}>
            <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.centro}>
              {filtro !== 'tudo' && filtroValido
                ? 'Nenhum momento com esse filtro neste mês.'
                : esteMes
                  ? 'Nenhum momento neste mês ainda. Que tal começar pela página de hoje?'
                  : `Nenhum momento em ${MESES[mes.mes]}.`}
            </Texto>
          </View>
        )}
      </Aparecer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1 },
  margem: { paddingHorizontal: space[24] },
  topo: { paddingTop: space[12], gap: 18, marginBottom: 25 },
  cabecalho: { height: 48, flexDirection: 'row', alignItems: 'center' },
  voltar: { width: 44, height: 44, justifyContent: 'center' },
  centro: { flex: 1, textAlign: 'center' },
  pagina: { gap: space[20], padding: space[16], borderRadius: 20, borderWidth: 1 },
  paginaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 48, marginBottom: space[16] },
  setas: { flexDirection: 'row', gap: 10 },
  lista: { gap: 9 },
  vazio: { paddingVertical: space[40] },
  registrar: {
    position: 'absolute',
    right: space[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: space[8],
    paddingRight: 22,
    paddingVertical: space[8],
    borderRadius: radius.full,
  },
  esmaecer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  opcoesVisao: { flexDirection: 'row', gap: space[8] },
  opcaoLinha: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
});
