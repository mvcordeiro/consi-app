import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Alternancia, Filtro, Folha, Icone, Texto, useEspacoBarra } from '@/components';
import { Aparecer } from '@/components/animacao';
import { ChevronDireita, ChevronEsquerda } from '@/components/diario/assets';
import { useAvisoMomento } from '@/components/diario/AvisoMomento';
import { useAvisoPendente } from '@/components/diario/avisoPendente';
import { Constelacao } from '@/components/diario/Constelacao';
import { BuscaDiario, ComeceAEscrever, GrupoIndice, ItemIndice } from '@/components/diario/Indice';
import { AjustesLembreteDiario } from '@/components/diario/LembreteDiario';
import { Premo } from '@/components/diario/Premo';
import { perguntaDeHoje, proximaPergunta, usePreferenciasDiario } from '@/data/diarioPreferencias';
import {
  apagarMomento,
  DIAS_SEMANA,
  diasAtras,
  MESES,
  momentoPorEm,
  nomeMes,
  restaurarMomento,
  useMomentos,
  type Momento,
} from '@/data/momentos';
import { radius, space, useTema } from '@/theme';

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
  // o aviso sobe acima do botão "Registrar emoção"
  const [aviso, mostrarAviso] = useAvisoMomento(70);

  const [opcoes, setOpcoes] = useState(false);
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [diasLinha, setDiasLinha] = useState(7);

  // Chegou de "Guardar momento": fica na visão escolhida (lista ou linha do tempo), com o
  // momento novo destacado e o aviso com desfazer. Cada momento guardado avisa uma vez só.
  const destaque = guardado ? Number(guardado) : null;
  const [avisado, setAvisado] = useState<number | null>(null);
  useEffect(() => {
    if (!destaque || destaque === avisado) return;
    const m = momentoPorEm(destaque);
    if (!m) return;
    const t = setTimeout(() => {
      setAvisado(destaque);
      mostrarAviso('Momento guardado', m, () => {
        apagarMomento(m.em);
        mostrarAviso('Momento desfeito', m, () => restaurarMomento(m));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [destaque, avisado, mostrarAviso]);
  // voltando de uma entrada apagada na edição
  useAvisoPendente(useCallback((a) => mostrarAviso(a.titulo, a.momento, a.desfazer), [mostrarAviso]));

  const linhaDoTempo = prefs.visao === 'linha';
  const abrirDia = (chave: string) => router.push({ pathname: '/diario/dia', params: { data: chave } });
  const abrirNovo = (params: Record<string, string> = {}) => router.push({ pathname: '/diario/novo', params });
  // A "Página de hoje" com a pergunta do dia: no topo da lista e da linha do tempo.
  const pergunta = perguntaDeHoje(prefs);
  const paginaDeHoje = (
    <PaginaDeHoje
      pergunta={pergunta}
      onTrocarPergunta={() => mudarPrefs({ pergunta: proximaPergunta(prefs) })}
      onNovo={abrirNovo}
    />
  );

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'left', 'right']}>
      {linhaDoTempo ? (
        <View style={styles.tela}>
          <View style={[styles.margem, styles.topo]}>
            <BuscaDiario onPress={() => router.push('/diario/busca')} onControles={() => setOpcoes(true)} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: espacoBarra + 160 }} showsVerticalScrollIndicator={false}>
            <View style={[styles.margem, styles.paginaLinha]}>{paginaDeHoje}</View>
            <Constelacao
              momentos={momentos}
              largura={width}
              dias={diasLinha}
              onAbrirDia={abrirDia}
              onMaisDias={diasLinha < 60 ? () => setDiasLinha((d) => d + 7) : undefined}
            />
          </ScrollView>
          <Esmaecer altura={257} cor={cores.bg.base} />
        </View>
      ) : (
        <Indice
          momentos={momentos}
          mes={mes}
          setMes={setMes}
          semTexto={prefs.semTexto}
          pagina={paginaDeHoje}
          onOpcoes={() => setOpcoes(true)}
          onAbrirMomento={(em) => router.push({ pathname: '/diario/momento', params: { em: String(em) } })}
        />
      )}

      {/* Registrar emoção (Figma 760:7248): Premo · Vazio e o rótulo. A ação principal da tela,
          então usa action/primary e text/on-primary como o Botão primário (laranja no Light, azul
          no Dark); o action/secondary do Figma invertia as cores dos dois temas. */}
      <Pressable
        onPress={() => abrirNovo()}
        accessibilityRole="button"
        accessibilityLabel="Registrar emoção"
        style={({ pressed }) => [
          styles.registrar,
          { bottom: espacoBarra + space[24], backgroundColor: pressed ? cores.action.primary.pressed : cores.action.primary.default },
        ]}
      >
        <Premo tamanho={42} />
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text['on-primary']}>
          Registrar emoção
        </Texto>
      </Pressable>

      {aviso}

      <Folha visivel={opcoes} onFechar={() => setOpcoes(false)} titulo="Ver diário como" descricao="Lista com tudo o que você escreveu, ou a linha do tempo dos seus dias.">
        <View style={styles.opcoesVisao}>
          <Filtro rotulo="Lista" ativo={prefs.visao === 'lista'} onPress={() => mudarPrefs({ visao: 'lista' })} />
          <Filtro rotulo="Linha do tempo" ativo={prefs.visao === 'linha'} onPress={() => mudarPrefs({ visao: 'linha' })} />
        </View>
        <AjustesLembreteDiario />
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

/** Página de hoje (Figma 752:6643): a data, a pergunta do dia (as setas trocam) e os atalhos para escrever. */
function PaginaDeHoje({
  pergunta,
  onTrocarPergunta,
  onNovo,
}: {
  pergunta: string;
  onTrocarPergunta: () => void;
  onNovo: (params?: Record<string, string>) => void;
}) {
  const { cores } = useTema();
  const hoje = new Date();
  return (
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
  );
}

function Indice({
  momentos,
  mes,
  setMes,
  semTexto,
  pagina,
  onOpcoes,
  onAbrirMomento,
}: {
  momentos: Momento[];
  mes: { ano: number; mes: number };
  setMes: (m: { ano: number; mes: number }) => void;
  semTexto: boolean;
  /** A Página de hoje. */
  pagina: ReactNode;
  onOpcoes: () => void;
  /** No Índice, tocar abre o próprio momento (o dia aberto é da linha do tempo). */
  onAbrirMomento: (em: number) => void;
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

  const filtrados = doMes;

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
  };

  const recente = filtrados[0]?.em;

  return (
    <ScrollView
      contentContainerStyle={[styles.margem, { paddingBottom: espacoBarra + 120 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topo}>
        <BuscaDiario onPress={() => router.push('/diario/busca')} onControles={onOpcoes} />

        {pagina}
      </View>

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

      <Aparecer key={`${mes.ano}-${mes.mes}`} deslocamento={6} duracao={400} style={styles.lista}>
        {grupos.length ? (
          grupos.map((g) => (
            <View key={g.rotulo} style={styles.lista}>
              <GrupoIndice rotulo={g.rotulo} />
              {g.itens.map((m) => (
                <ItemIndice key={m.em} momento={m} recente={m.em === recente && diasAtras(m.em) === 0} onPress={() => onAbrirMomento(m.em)} />
              ))}
            </View>
          ))
        ) : (
          <View style={styles.vazio}>
            <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.centro}>
              {esteMes
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
  centro: { flex: 1, textAlign: 'center' },
  pagina: { gap: space[20], padding: space[16], borderRadius: 20, borderWidth: 1 },
  // na linha do tempo, a Página de hoje fica entre a busca e a constelação
  paginaLinha: { paddingTop: 18, paddingBottom: space[32] },
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
