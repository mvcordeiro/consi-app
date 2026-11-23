import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Animated, LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';

import {
  apagarCheckin,
  DIAS_GUARDADOS,
  editarCheckin,
  emocoes,
  restaurarCheckin,
  emocaoPorId,
  emocoesDaSemana,
  horaMinuto,
  inicioDoDia,
  mesmoDia,
  type Emocao,
  type RegistroEmocao,
} from '@/data/emocoes';
import { appPorId, useGrupos } from '@/data/gruposHome';
import { hobbyInfo, type HobbyId } from '@/data/catalogo';
import { resistenciasDaSemana, type Resistencia } from '@/data/pausa';
import { borderWidth, radius, space, useTema, type Cores } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { DiaCalendario } from '../DiaCalendario';
import { Filtro } from '../Filtro';
import { Folha } from '../Folha';
import { IconeHobby } from '../hobbies/IconeHobby';
import { Icone, type NomeIcone } from '../Icone';
import { IconeApp } from '../IconeApp';
import { ABA_A, AbaArraste, BordasArraste, sairPeloLado, useArrasteLateral, useLarguraTela, voltarAoLugar } from '../hobbies/Arraste';
import { Texto } from '../Texto';
import { BalaoEmocao } from './BalaoEmocao';

/** Abreviações como no Figma (sem acento, como "SAB"). */
const SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
/** Momentos por dia antes do "Ver mais" (e quantos cada toque mostra a mais). */
const POR_VEZ = 7;
const LADO_MARCADOR = 38;

type Dia = { id: string; data: Date };
type FiltroSemana = 'tudo' | 'emocoes' | 'escolhas';

/** Os últimos 7 dias, terminando hoje (à direita). */
function ultimosDias(): Dia[] {
  return Array.from({ length: DIAS_GUARDADOS }, (_, i) => {
    const data = inicioDoDia(DIAS_GUARDADOS - 1 - i);
    return { id: data.toDateString(), data };
  });
}

/**
 * Tom de cada emoção na linha do tempo: as agradáveis em success, as difíceis em warning e as
 * ambíguas (tédio, desejo) no neutro. Só uma pista visual para ler o dia de relance, sem
 * julgar a emoção: o nome está sempre escrito ao lado.
 */
const AGRADAVEIS = new Set(['satisfeito', 'alegria', 'orgulho', 'admiracao', 'fascinacao', 'esperanca']);
const DIFICEIS = new Set(['tristeza', 'vergonha', 'medo', 'repulsa', 'raiva', 'desprezo']);
type Tom = 'agradavel' | 'dificil' | 'neutro' | 'naoAbriu' | 'saiu';

function fundoDoTom(c: Cores, t: Tom) {
  if (t === 'agradavel' || t === 'naoAbriu') return c.bg['success-subtle'];
  if (t === 'dificil') return c.bg['warning-subtle'];
  if (t === 'saiu') return c.bg['info-subtle'];
  return c.bg.sunken;
}
const tomDaEmocao = (id: string): Tom => (AGRADAVEIS.has(id) ? 'agradavel' : DIFICEIS.has(id) ? 'dificil' : 'neutro');

/** Manhã (até 12 h), Tarde (até 18 h) ou Noite: separa a linha do tempo do dia. */
function periodo(em: number) {
  const h = new Date(em).getHours();
  return h < 5 ? 'Madrugada' : h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite';
}

/**
 * V2 - Momentos / Feed — seletor dos últimos 7 dias e, embaixo, a linha do tempo do dia (do mais
 * recente para o mais antigo), dividida em Manhã / Tarde / Noite, com a hora sempre à esquerda.
 * Dois tipos de momento, que dá para filtrar:
 * - Emoções (check-ins): marcador redondo com o balão, no tom da emoção (agradável, difícil, neutra).
 * - Escolhas da pausa: marcador quadrado com o que a pessoa fez, e o que veio logo depois:
 *     "Instagram ficou para depois" · "Sentiu Fascinação" / "Trocou por Música"
 *     "Parou de usar Instagram" (quando já estava usando o app)
 *   O check-in ligado a uma escolha não aparece de novo como momento próprio.
 * Mostra 7 momentos por vez, com "Ver mais".
 */
export function SuaSemana({
  margem,
  onArrastando,
  onAviso,
}: {
  /** Margem lateral da página: as abas de feedback do arraste ficam na borda da tela. */
  margem: number;
  /** Avisa enquanto um check-in está sendo arrastado (para travar a rolagem da Home). */
  onArrastando: (a: boolean) => void;
  /** Aviso com ação (o "Desfazer" do apagar). */
  onAviso: (texto: string, acao?: { rotulo: string; onPress: () => void }) => void;
}) {
  const { cores } = useTema();
  const [registros, setRegistros] = useState<RegistroEmocao[]>([]);
  // "Dessa vez não abro" na pausa (só leitura aqui).
  const [resistencias, setResistencias] = useState<Resistencia[]>([]);
  // Check-in sendo editado (troca de emoção, pela folha).
  const [editando, setEditando] = useState<RegistroEmocao | null>(null);
  const [filtro, setFiltro] = useState<FiltroSemana>('tudo');
  const [mostrando, setMostrando] = useState(POR_VEZ);

  const apagar = (r: RegistroEmocao) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRegistros((l) => l.filter((x) => x.em !== r.em));
    apagarCheckin(r.em);
    onAviso('Check-in apagado', {
      rotulo: 'Desfazer',
      onPress: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        restaurarCheckin(r).then(setRegistros);
      },
    });
  };

  const trocarEmocao = (id: string) => {
    if (!editando) return;
    editarCheckin(editando.em, id).then(setRegistros);
    setEditando(null);
    onAviso(`Check-in atualizado · ${emocaoPorId(id)?.nome ?? ''}`);
  };
  const [dias, setDias] = useState(ultimosDias);
  const hoje = dias[dias.length - 1].id;
  const [diaId, setDiaId] = useState<string | null>(null);

  // Na volta para a Home: relê os check-ins (um novo pode ter sido feito) e vira o dia se precisar.
  useFocusEffect(
    useCallback(() => {
      emocoesDaSemana().then(setRegistros);
      resistenciasDaSemana().then(setResistencias);
      setDias((atual) => {
        const novos = ultimosDias();
        return novos[novos.length - 1].id === atual[atual.length - 1].id ? atual : novos;
      });
    }, []),
  );

  const dia = dias.find((d) => d.id === diaId) ?? dias[dias.length - 1];
  const escolherDia = (id: string) => {
    setDiaId(id);
    setMostrando(POR_VEZ);
  };
  const escolherFiltro = (f: FiltroSemana) => {
    setFiltro(f);
    setMostrando(POR_VEZ);
  };
  // Check-ins que já fazem parte de uma escolha da pausa ("… e sentiu X").
  const ligados = useMemo(() => new Set(resistencias.map((r) => r.checkinEm).filter(Boolean)), [resistencias]);
  const checkins = useMemo(
    () =>
      registros
        .filter((r) => mesmoDia(new Date(r.em), dia.data) && !ligados.has(r.em))
        .map((r) => ({ r, e: emocaoPorId(r.id) }))
        .filter((x): x is { r: RegistroEmocao; e: Emocao } => !!x.e),
    [registros, dia, ligados],
  );
  const escolhas = useMemo(
    () => resistencias.filter((r) => mesmoDia(new Date(r.em), dia.data)),
    [resistencias, dia],
  );
  // Check-ins e escolhas juntos, do mais recente para o mais antigo.
  const todos = useMemo(
    () =>
      [
        ...checkins.map((c) => ({ tipo: 'checkin' as const, em: c.r.em, c })),
        ...escolhas.map((r) => ({ tipo: 'escolha' as const, em: r.em, r })),
      ].sort((a, b) => b.em - a.em),
    [checkins, escolhas],
  );
  const itens = todos.filter((i) => filtro === 'tudo' || (filtro === 'emocoes') === (i.tipo === 'checkin'));
  const visiveis = itens.slice(0, mostrando);
  const total = todos.length;

  return (
    <View style={styles.secao}>
      <View style={styles.topo}>
        <Texto estilo="Títulos/Médio">Sua semana</Texto>
        <View style={styles.dias}>
          {dias.map((d) => (
            <DiaCalendario
              key={d.id}
              semana={SEMANA[d.data.getDay()]}
              dia={d.data.getDate()}
              selecionado={d.id === dia.id}
              onPress={() => escolherDia(d.id)}
            />
          ))}
        </View>
      </View>
      <Aparecer key={`${dia.id}-${total}-${filtro}`} deslocamento={6} duracao={400} style={styles.momentos}>
        {total > 0 ? (
          <>
            <View style={styles.filtros}>
              <Filtro rotulo="Tudo" ativo={filtro === 'tudo'} onPress={() => escolherFiltro('tudo')} />
              <Filtro rotulo="Emoções" ativo={filtro === 'emocoes'} onPress={() => escolherFiltro('emocoes')} />
              <Filtro rotulo="Escolhas" ativo={filtro === 'escolhas'} onPress={() => escolherFiltro('escolhas')} />
            </View>
            {visiveis.length ? (
              <View>
                {visiveis.map((i, n) => {
                  const p = periodo(i.em);
                  const novoPeriodo = n === 0 || periodo(visiveis[n - 1].em) !== p;
                  const ultimo = n === visiveis.length - 1;
                  return (
                    <View key={`${i.tipo}${i.em}`}>
                      {novoPeriodo ? (
                        <Texto
                          estilo="Legenda/Pequena"
                          cor={cores.text.tertiary}
                          style={[styles.periodo, n > 0 && styles.periodoMeio]}
                        >
                          {p.toUpperCase()}
                        </Texto>
                      ) : null}
                      {i.tipo === 'checkin' ? (
                        <CardCheckin
                          registro={i.c.r}
                          emocao={i.c.e}
                          margem={margem}
                          linha={!ultimo}
                          onArrastando={onArrastando}
                          onApagar={() => apagar(i.c.r)}
                          onEditar={() => setEditando(i.c.r)}
                        />
                      ) : (
                        <CardEscolha
                          escolha={i.r}
                          linha={!ultimo}
                          checkin={i.r.checkinEm ? registros.find((x) => x.em === i.r.checkinEm) : undefined}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                {filtro === 'emocoes' ? 'NENHUMA EMOÇÃO REGISTRADA NESTE DIA' : 'NENHUMA ESCOLHA NA PAUSA NESTE DIA'}
              </Texto>
            )}
            {itens.length > mostrando ? (
              <Botao
                rotulo={`Ver mais (${itens.length - mostrando})`}
                estilo="secundario"
                onPress={() => setMostrando((m) => m + POR_VEZ)}
              />
            ) : null}
            {visiveis.some((i) => i.tipo === 'checkin') ? (
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
                Arraste uma emoção para esquerda para apagar, direita para editar.
              </Texto>
            ) : null}
          </>
        ) : (
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {dia.id === hoje
              ? 'NENHUM CHECK-IN HOJE. ESCOLHA UMA EMOÇÃO NO TOPO DA TELA.'
              : 'NENHUM MOMENTO REGISTRADO NESTE DIA'}
          </Texto>
        )}
      </Aparecer>
      <Folha
        visivel={!!editando}
        onFechar={() => setEditando(null)}
        titulo="Editar check-in"
        descricao={editando ? `Como você estava às ${horaMinuto(editando.em)}?` : undefined}
      >
        <View style={styles.grade}>
          {emocoes.map((e) => {
            const atual = e.id === editando?.id;
            return (
              <Pressable
                key={e.id}
                onPress={() => trocarEmocao(e.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: atual }}
                accessibilityLabel={e.nome}
                style={({ pressed }) => [
                  styles.opcao,
                  { backgroundColor: atual ? cores.action.primary.default : cores.bg.sunken, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <BalaoEmocao Svg={e.Svg} Textura={e.Textura} circulo={e.circulo} tamanho={36} flutuar={false} />
                <Texto
                  estilo="Legenda/Pequena"
                  cor={atual ? cores.text['on-primary'] : cores.text.primary}
                  numberOfLines={1}
                >
                  {e.nome}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      </Folha>
    </View>
  );
}

/**
 * Uma linha da linha do tempo: a hora à esquerda, o marcador (redondo para emoções, quadrado
 * para escolhas) ligado ao próximo por um traço, e o conteúdo num card.
 */
function LinhaDoTempo({
  hora,
  marcador,
  linha,
  children,
}: {
  hora: string;
  marcador: ReactNode;
  /** Traço até o próximo momento (não no último). */
  linha: boolean;
  children: ReactNode;
}) {
  const { cores } = useTema();
  return (
    <View style={styles.linhaTempo}>
      <Texto estilo="Texto/Botões e rótulos" style={styles.hora}>
        {hora}
      </Texto>
      <View style={styles.trilho}>
        {marcador}
        {linha ? <View style={[styles.traco, { backgroundColor: cores.border.subtle }]} /> : null}
      </View>
      <View style={[styles.conteudoLinha, linha && styles.comEspaco]}>{children}</View>
    </View>
  );
}

function MarcadorEmocao({ emocao }: { emocao: Emocao }) {
  const { cores } = useTema();
  return (
    <View style={[styles.marcador, styles.redondo, { backgroundColor: fundoDoTom(cores, tomDaEmocao(emocao.id)) }]}>
      <BalaoEmocao Svg={emocao.Svg} Textura={emocao.Textura} circulo={emocao.circulo} tamanho={22} flutuar={false} />
    </View>
  );
}

function MarcadorEscolha({ tom, icone }: { tom: Tom; icone: NomeIcone }) {
  const { cores } = useTema();
  return (
    <View style={[styles.marcador, styles.quadrado, { backgroundColor: fundoDoTom(cores, tom) }]}>
      <Icone nome={icone} tamanho={16} cor={cores.text.primary} />
    </View>
  );
}

/**
 * Momento de check-in: a emoção como título e "Check-in" embaixo. Arrastar para a esquerda apaga
 * e para a direita edita, com as mesmas bordas e abas laterais de "Suas atividades" (lixeira em
 * feedback/error, lápis em feedback/success).
 */
function CardCheckin({
  registro,
  emocao,
  margem,
  linha,
  onArrastando,
  onApagar,
  onEditar,
}: {
  registro: RegistroEmocao;
  emocao: Emocao;
  margem: number;
  linha: boolean;
  onArrastando: (a: boolean) => void;
  onApagar: () => void;
  onEditar: () => void;
}) {
  const { cores } = useTema();
  const largura = useLarguraTela();
  const [altura, setAltura] = useState(0);
  const hora = horaMinuto(registro.em);
  const arraste = useArrasteLateral({
    onArrastando,
    onSoltar: (lado, pan) => {
      if (lado === 'esquerda') sairPeloLado(pan, 'esquerda', largura, onApagar);
      else {
        voltarAoLugar(pan);
        onEditar();
      }
    },
  });
  const giro = arraste.pan.interpolate({ inputRange: [-96, 0, 96], outputRange: ['-2deg', '0deg', '2deg'] });
  const topoAba = (altura - ABA_A) / 2;

  return (
    <View style={{ marginHorizontal: -margem }}>
      <Animated.View
        {...arraste.handlers}
        onLayout={(e) => setAltura(e.nativeEvent.layout.height)}
        style={{ marginHorizontal: margem, transform: [{ translateX: arraste.pan }, { rotate: giro }] }}
      >
        <LinhaDoTempo hora={hora} linha={linha} marcador={<MarcadorEmocao emocao={emocao} />}>
          <View
            accessible
            accessibilityLabel={`Às ${hora}, check-in: ${emocao.nome}`}
            accessibilityActions={[
              { name: 'delete', label: 'Apagar' },
              { name: 'activate', label: 'Editar' },
            ]}
            onAccessibilityAction={(ev) => (ev.nativeEvent.actionName === 'delete' ? onApagar() : onEditar())}
            style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.subtle }]}
          >
            <Texto estilo="Texto/Botões e rótulos">{emocao.nome}</Texto>
            <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
              Check-in
            </Texto>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bordas]}>
              <BordasArraste progressoEsq={arraste.progressoEsq} progressoDir={arraste.progressoDir} />
            </View>
          </View>
        </LinhaDoTempo>
      </Animated.View>
      <AbaArraste
        lado="esquerda"
        progresso={arraste.progressoEsq}
        cor={cores.feedback.error}
        icone="lixeira"
        corIcone={cores.bg['error-subtle']}
        topo={topoAba}
      />
      <AbaArraste
        lado="direita"
        progresso={arraste.progressoDir}
        cor={cores.feedback.success}
        icone="lapis"
        corIcone={cores.bg['success-subtle']}
        topo={topoAba}
      />
    </View>
  );
}

/**
 * Escolha da pausa: "Instagram ficou para depois" (não abriu) ou "Parou de usar Instagram"
 * (já estava usando o app), sem artigo antes do nome do app. Embaixo, o que veio logo depois,
 * se houve: "Sentiu Fascinação" (check-in na mesma pausa) ou "Trocou por Música" (hobby).
 * Só leitura, sem arraste.
 */
function CardEscolha({ escolha, checkin, linha }: { escolha: Resistencia; checkin?: RegistroEmocao; linha: boolean }) {
  const { cores } = useTema();
  const grupos = useGrupos();
  const hora = horaMinuto(escolha.em);
  const app = escolha.app ? appPorId(escolha.app) : undefined;
  const nomeApp = app?.nome ?? grupos.find((g) => g.id === escolha.grupo)?.nome ?? 'O app';
  const saiu = !!escolha.depoisDeUsar;
  const emocao = checkin ? emocaoPorId(checkin.id) : undefined;
  const hobby = escolha.hobby ? hobbyInfo(escolha.hobby as HobbyId) : undefined;
  const titulo = saiu ? `Parou de usar ${nomeApp}` : `${nomeApp} ficou para depois`;
  const depois = emocao ? `Sentiu ${emocao.nome}` : hobby ? `Trocou por ${hobby.nome}` : saiu ? 'Saiu do app' : 'Não abriu';
  return (
    <LinhaDoTempo
      hora={hora}
      linha={linha}
      marcador={<MarcadorEscolha tom={saiu ? 'saiu' : 'naoAbriu'} icone={saiu ? 'pedestre' : 'cadeado'} />}
    >
      <View
        accessible
        accessibilityLabel={`Às ${hora}, ${titulo}. ${depois}`}
        style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.subtle }]}
      >
        <View style={styles.tituloEscolha}>
          {app ? <IconeApp app={app} lado={16} /> : null}
          <Texto estilo="Texto/Botões e rótulos" style={styles.encolher}>
            {titulo}
          </Texto>
        </View>
        <View style={styles.tituloEscolha}>
          {emocao ? (
            <BalaoEmocao Svg={emocao.Svg} Textura={emocao.Textura} circulo={emocao.circulo} tamanho={14} flutuar={false} />
          ) : hobby && escolha.hobby ? (
            <IconeHobby hobby={escolha.hobby as HobbyId} caixa={14} cor={cores.text.secondary} />
          ) : null}
          <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
            {depois}
          </Texto>
        </View>
      </View>
    </LinhaDoTempo>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[32] },
  topo: { gap: space[12] },
  dias: { flexDirection: 'row', gap: space[8] },
  momentos: { gap: space[16] },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  periodo: { marginBottom: space[8] },
  periodoMeio: { marginTop: space[4] },
  centro: { textAlign: 'center' },
  linhaTempo: { flexDirection: 'row', gap: space[12] },
  hora: { width: 44, paddingTop: 6, fontVariant: ['tabular-nums'] },
  trilho: { width: LADO_MARCADOR, alignItems: 'center' },
  traco: { flex: 1, width: borderWidth.thin, marginVertical: space[4] },
  marcador: { width: LADO_MARCADOR, height: LADO_MARCADOR, alignItems: 'center', justifyContent: 'center' },
  redondo: { borderRadius: radius.full },
  quadrado: { borderRadius: radius.sm },
  conteudoLinha: { flex: 1, minWidth: 0 },
  comEspaco: { paddingBottom: space[12] },
  tituloEscolha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  encolher: { flexShrink: 1 },
  // as bordas do arraste usam radius.card; aqui o card é radius.md
  bordas: { borderRadius: radius.md, overflow: 'hidden' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  opcao: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: space[4],
    paddingVertical: space[8],
    borderRadius: radius.md,
  },
  card: {
    gap: space[2],
    paddingHorizontal: space[12] - borderWidth.thin,
    paddingVertical: space[8],
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
  },
});
