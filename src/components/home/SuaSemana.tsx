import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { borderWidth, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { DiaCalendario } from '../DiaCalendario';
import { Etiqueta } from '../Etiqueta';
import { Folha } from '../Folha';
import { IconeHobby } from '../hobbies/IconeHobby';
import { Icone } from '../Icone';
import { IconeApp } from '../IconeApp';
import { ABA_A, AbaArraste, BordasArraste, sairPeloLado, useArrasteLateral, useLarguraTela, voltarAoLugar } from '../hobbies/Arraste';
import { Texto } from '../Texto';
import { IconeCheckin, IconeRelogio } from './assets';
import { BalaoEmocao } from './BalaoEmocao';

/** Abreviações como no Figma (sem acento, como "SAB"). */
const SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

type Dia = { id: string; data: Date };

/** Os últimos 7 dias, terminando hoje (à direita). */
function ultimosDias(): Dia[] {
  return Array.from({ length: DIAS_GUARDADOS }, (_, i) => {
    const data = inicioDoDia(DIAS_GUARDADOS - 1 - i);
    return { id: data.toDateString(), data };
  });
}

/**
 * V2 - Momentos / Feed — seletor dos últimos 7 dias e os momentos de cada dia, do mais recente
 * para o mais antigo: os check-ins de emoção ("Você fez check-in às 14:05 sentindo Alegria") e as
 * escolhas da pausa, que juntam o que veio logo depois:
 *   "Você não abriu Instagram às 12:58 e sentiu Fascinação"
 *   "Você não abriu Instagram às 12:32 e explorou Música"
 *   "Você saiu de Instagram às 13:32 e sentiu Cansaço" (quando já estava usando o app)
 * O check-in ligado a uma escolha não aparece de novo como card próprio.
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
  const itens = useMemo(
    () =>
      [
        ...checkins.map((c) => ({ tipo: 'checkin' as const, em: c.r.em, c })),
        ...escolhas.map((r) => ({ tipo: 'escolha' as const, em: r.em, r })),
      ].sort((a, b) => b.em - a.em),
    [checkins, escolhas],
  );
  const total = itens.length;

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
              onPress={() => setDiaId(d.id)}
            />
          ))}
        </View>
      </View>
      <Aparecer key={`${dia.id}-${total}`} deslocamento={6} duracao={400} style={styles.momentos}>
        {total > 0 ? (
          <>
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              {total} {total === 1 ? 'MOMENTO REGISTRADO' : 'MOMENTOS REGISTRADOS'}
            </Texto>
            <View style={styles.lista}>
              {itens.map((i) =>
                i.tipo === 'checkin' ? (
                  <CardCheckin
                    key={`c${i.em}`}
                    registro={i.c.r}
                    emocao={i.c.e}
                    margem={margem}
                    onArrastando={onArrastando}
                    onApagar={() => apagar(i.c.r)}
                    onEditar={() => setEditando(i.c.r)}
                  />
                ) : (
                  <CardEscolha
                    key={`r${i.em}`}
                    escolha={i.r}
                    checkin={i.r.checkinEm ? registros.find((x) => x.em === i.r.checkinEm) : undefined}
                  />
                ),
              )}
            </View>
            {checkins.length > 0 ? (
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
                Arraste um check-in para esquerda para apagar, direita para editar.
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
 * Momento de check-in — "Você fez check-in às 14:05 sentindo Alegria", em etiquetas que quebram
 * linha como no Figma. Arrastar para a esquerda apaga e para a direita edita, com as mesmas
 * bordas e abas laterais de "Suas atividades" (lixeira em feedback/error, lápis em feedback/success).
 */
function CardCheckin({
  registro,
  emocao,
  margem,
  onArrastando,
  onApagar,
  onEditar,
}: {
  registro: RegistroEmocao;
  emocao: Emocao;
  margem: number;
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
        <View
          accessible
          accessibilityLabel={`Você fez check-in às ${hora} sentindo ${emocao.nome}`}
          accessibilityActions={[
            { name: 'delete', label: 'Apagar' },
            { name: 'activate', label: 'Editar' },
          ]}
          onAccessibilityAction={(ev) => (ev.nativeEvent.actionName === 'delete' ? onApagar() : onEditar())}
          style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}
        >
          <Texto estilo="Texto/Botões e rótulos">Você</Texto>
          <Etiqueta rotulo="Fez check-in" tom="sucesso" icone={IconeCheckin} style={styles.etiqueta} />
          <Texto estilo="Texto/Botões e rótulos">às</Texto>
          <Etiqueta rotulo={hora} tom="info" icone={IconeRelogio} style={styles.etiqueta} />
          <Texto estilo="Texto/Botões e rótulos">sentindo</Texto>
          <Etiqueta
            rotulo={emocao.nome}
            style={styles.etiqueta}
            iconeNode={
              <BalaoEmocao Svg={emocao.Svg} Textura={emocao.Textura} circulo={emocao.circulo} tamanho={15} flutuar={false} />
            }
          />
        </View>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bordas]}>
          <BordasArraste progressoEsq={arraste.progressoEsq} progressoDir={arraste.progressoDir} />
        </View>
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
 * Escolha da pausa — "Você [Não abriu] [Instagram] às [12:58]" (ou "[Saiu] de [Instagram]", quando a
 * pessoa já estava usando o app), seguida do que veio logo depois, se houve: "e sentiu
 * [Fascinação]" (check-in na mesma pausa) ou "e explorou [Música]" (hobby no lugar do app).
 * Mesmas etiquetas do check-in; só leitura, sem arraste.
 */
function CardEscolha({ escolha, checkin }: { escolha: Resistencia; checkin?: RegistroEmocao }) {
  const { cores } = useTema();
  const grupos = useGrupos();
  const hora = horaMinuto(escolha.em);
  const app = escolha.app ? appPorId(escolha.app) : undefined;
  const nomeApp = app?.nome ?? grupos.find((g) => g.id === escolha.grupo)?.nome ?? 'um app';
  const acao = escolha.depoisDeUsar ? 'Saiu' : 'Não abriu';
  const emocao = checkin ? emocaoPorId(checkin.id) : undefined;
  const hobby = escolha.hobby ? hobbyInfo(escolha.hobby as HobbyId) : undefined;
  const depois = emocao ? ` e sentiu ${emocao.nome}` : hobby ? ` e explorou ${hobby.nome}` : '';
  return (
    <View
      accessible
      accessibilityLabel={`Você ${acao.toLowerCase()} ${escolha.depoisDeUsar ? 'de ' : ''}${nomeApp} às ${hora}${depois}`}
      style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}
    >
      <Texto estilo="Texto/Botões e rótulos">Você</Texto>
      <Etiqueta
        rotulo={acao}
        tom="sucesso"
        iconeNode={<Icone nome="rosto-positivo" tamanho={15} cor={cores.text.primary} />}
        style={styles.etiqueta}
      />
      {escolha.depoisDeUsar ? <Texto estilo="Texto/Botões e rótulos">de</Texto> : null}
      <Etiqueta
        rotulo={nomeApp}
        style={styles.etiqueta}
        iconeNode={app ? <IconeApp app={app} lado={15} /> : undefined}
      />
      <Texto estilo="Texto/Botões e rótulos">às</Texto>
      <Etiqueta rotulo={hora} tom="info" icone={IconeRelogio} style={styles.etiqueta} />
      {emocao ? (
        <>
          <Texto estilo="Texto/Botões e rótulos">e sentiu</Texto>
          <Etiqueta
            rotulo={emocao.nome}
            style={styles.etiqueta}
            iconeNode={
              <BalaoEmocao Svg={emocao.Svg} Textura={emocao.Textura} circulo={emocao.circulo} tamanho={15} flutuar={false} />
            }
          />
        </>
      ) : hobby && escolha.hobby ? (
        <>
          <Texto estilo="Texto/Botões e rótulos">e explorou</Texto>
          <Etiqueta
            rotulo={hobby.nome}
            style={styles.etiqueta}
            iconeNode={<IconeHobby hobby={escolha.hobby as HobbyId} caixa={15} cor={cores.text.primary} />}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[32] },
  topo: { gap: space[12] },
  dias: { flexDirection: 'row', gap: space[8] },
  momentos: { gap: space[12] },
  lista: { gap: space[8] },
  etiqueta: { alignSelf: 'center' },
  centro: { textAlign: 'center' },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[8],
    padding: space[12] - borderWidth.thin, // borda interna no Figma
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
  },
});
