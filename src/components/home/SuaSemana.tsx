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
import { borderWidth, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { DiaCalendario } from '../DiaCalendario';
import { Etiqueta } from '../Etiqueta';
import { Folha } from '../Folha';
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
 * V2 - Momentos / Feed — seletor dos últimos 7 dias e os check-ins de cada dia.
 * Por enquanto registra só os check-ins de emoção da hero:
 * "Você fez check-in às 14:05 sentindo Alegria".
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
      setDias((atual) => {
        const novos = ultimosDias();
        return novos[novos.length - 1].id === atual[atual.length - 1].id ? atual : novos;
      });
    }, []),
  );

  const dia = dias.find((d) => d.id === diaId) ?? dias[dias.length - 1];
  const checkins = useMemo(
    () =>
      registros
        .filter((r) => mesmoDia(new Date(r.em), dia.data))
        .map((r) => ({ r, e: emocaoPorId(r.id) }))
        .filter((x): x is { r: RegistroEmocao; e: Emocao } => !!x.e),
    [registros, dia],
  );
  const total = checkins.length;

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
              {checkins.map(({ r, e }) => (
                <CardCheckin
                  key={r.em}
                  registro={r}
                  emocao={e}
                  margem={margem}
                  onArrastando={onArrastando}
                  onApagar={() => apagar(r)}
                  onEditar={() => setEditando(r)}
                />
              ))}
            </View>
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
              Arraste para esquerda para apagar, direita para editar.
            </Texto>
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
