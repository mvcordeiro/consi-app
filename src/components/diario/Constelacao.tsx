import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { chaveDia, diaCurto, emocoesDoDia, plural, type Momento } from '@/data/momentos';
import { borderWidth, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { Texto } from '../Texto';
import { Premo } from './Premo';

/** Altura de cada dia na trilha (Figma 760:5986): com momentos ~170 px, sem registro ~90 px. */
const ALTURA_CHEIO = 170;
const ALTURA_VAZIO = 90;
/** Balão de hoje e o anel tracejado em action/secondary ao redor (150 px). */
const LADO_HOJE = 108;
const ANEL_HOJE = 150;
const LADO_SEM_REGISTRO = 40;
/**
 * Satélites: as outras emoções do dia em volta da central (Figma 760:5986), no máximo 4,
 * para o dia ter até 5 balões (EMOCOES_POR_DIA). Ordem: das mais repetidas para as menos.
 */
const LUGARES_SATELITE = [
  { x: 0.65, y: -0.56 },
  { x: -0.77, y: -0.42 },
  { x: 0.62, y: 0.6 },
  { x: -0.66, y: 0.58 },
];

type Dia = {
  chave: string;
  data: Date;
  momentos: Momento[];
  /** Até 5 emoções, sem repetir; a primeira é a central. */
  emocoes: string[];
  cx: number;
  cy: number;
  lado: number;
  altura: number;
  /** De que lado o balão está: o rótulo vai do outro. */
  posicao: 'esquerda' | 'direita' | 'centro';
};

/**
 * Constelação · Semana (Figma 760:5986): a linha do tempo do Diário. Cada dia é um balão
 * da emoção mais sentida, maior quanto mais momentos; os outros momentos orbitam em volta.
 * Uma trilha pontilhada liga os dias, de hoje (no topo) para trás. Dias sem registro
 * são um círculo tracejado vazio. Cada dia mostra até 5 emoções (emocoesDoDia): a central é a
 * mais repetida (ou a mais recente, se nenhuma se repete). Só a central de hoje tem o anel tracejado.
 */
export function Constelacao({
  momentos,
  largura,
  dias,
  onAbrirDia,
  onMaisDias,
}: {
  momentos: Momento[];
  largura: number;
  /** Quantos dias mostrar, contando hoje. */
  dias: number;
  onAbrirDia: (chave: string) => void;
  onMaisDias?: () => void;
}) {
  const { cores } = useTema();

  const { lista, alturaTotal } = useMemo(() => {
    const porDia = new Map<string, Momento[]>();
    for (const m of momentos) {
      const k = chaveDia(m.em);
      porDia.set(k, [...(porDia.get(k) ?? []), m]);
    }
    const out: Dia[] = [];
    let y = 0;
    let alterna = 0;
    for (let i = 0; i < dias; i++) {
      const data = new Date();
      data.setHours(0, 0, 0, 0);
      data.setDate(data.getDate() - i);
      const chave = chaveDia(data);
      const doDia = porDia.get(chave) ?? [];
      const cheio = doDia.length > 0;
      const altura = cheio ? ALTURA_CHEIO : ALTURA_VAZIO;
      // hoje à direita; os dias com momentos alternam de lado e os vazios ficam no meio
      const posicao: Dia['posicao'] = !cheio ? 'centro' : alterna++ % 2 === 0 ? 'direita' : 'esquerda';
      const cx = posicao === 'direita' ? largura * 0.72 : posicao === 'esquerda' ? largura * 0.26 : largura * 0.5;
      const lado = !cheio ? LADO_SEM_REGISTRO : i === 0 ? LADO_HOJE : doDia.length >= 3 ? 84 : doDia.length === 2 ? 76 : 64;
      out.push({ chave, data, momentos: doDia, emocoes: emocoesDoDia(doDia), cx, cy: y + altura / 2, lado, altura, posicao });
      y += altura;
    }
    return { lista: out, alturaTotal: y };
  }, [momentos, dias, largura]);

  // trilha pontilhada: entra pelo topo e liga o centro de cada dia ao próximo com uma curva
  const trilha = useMemo(() => {
    if (!lista.length) return '';
    let d = `M ${largura * 0.5} 0 C ${largura * 0.5} ${lista[0].cy * 0.5}, ${lista[0].cx} ${lista[0].cy * 0.5}, ${lista[0].cx} ${lista[0].cy}`;
    for (let i = 1; i < lista.length; i++) {
      const a = lista[i - 1];
      const b = lista[i];
      const meio = (a.cy + b.cy) / 2;
      d += ` C ${a.cx} ${meio}, ${b.cx} ${meio}, ${b.cx} ${b.cy}`;
    }
    return d;
  }, [lista, largura]);

  return (
    <View>
      <View style={{ height: alturaTotal }}>
        <Svg width={largura} height={alturaTotal} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={trilha} stroke={cores.text.accent} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="0.1 9" fill="none" />
        </Svg>
        {lista.map((dia, i) => (
          <DiaNaTrilha key={dia.chave} dia={dia} hoje={i === 0} indice={i} largura={largura} onPress={() => onAbrirDia(dia.chave)} />
        ))}
      </View>
      {onMaisDias ? (
        <View style={styles.mais}>
          <Botao rotulo="Ver dias anteriores" estilo="secundario" onPress={onMaisDias} />
        </View>
      ) : null}
    </View>
  );
}

function DiaNaTrilha({
  dia,
  hoje,
  indice,
  largura,
  onPress,
}: {
  dia: Dia;
  hoje: boolean;
  indice: number;
  largura: number;
  onPress: () => void;
}) {
  const { cores } = useTema();
  const cheio = dia.momentos.length > 0;
  // os dias mais antigos vão apagando (Figma: 100% hoje, 85%, 72%… até 50%)
  const opacidade = hoje ? 1 : Math.max(0.5, 1 - indice * 0.12);
  const [central, ...satelites] = dia.emocoes;
  const ladoSatelite = hoje ? 46 : 40;
  // coordenadas dentro da faixa do dia (cada dia só recebe os toques da própria faixa)
  const cy = dia.altura / 2;

  const rotulo = (
    <View style={styles.rotulo}>
      {hoje ? (
        <Texto estilo="Legenda/Pequena" cor={cores.action.secondary.default} style={styles.hoje}>
          HOJE
        </Texto>
      ) : null}
      <Texto estilo="Títulos/Pequeno" cor={cheio ? cores.text.primary : cores.text.tertiary}>
        {diaCurto(dia.data)}
      </Texto>
      <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary}>
        {cheio ? plural(dia.momentos.length, 'momento', 'momentos') : 'sem registro'}
      </Texto>
    </View>
  );

  // o rótulo fica do lado oposto ao balão; nos dias vazios, à esquerda do círculo
  const larguraRotulo = largura * 0.44;
  const rotuloX =
    dia.posicao === 'esquerda' ? dia.cx + dia.lado / 2 + space[24] : dia.posicao === 'direita' ? space[24] : dia.cx - LADO_SEM_REGISTRO / 2 - space[12] - larguraRotulo;

  return (
    <Aparecer atraso={indice * 90} deslocamento={8} duracao={700} style={[styles.faixa, { top: dia.cy - dia.altura / 2, height: dia.altura }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${diaCurto(dia.data)}, ${cheio ? plural(dia.momentos.length, 'momento', 'momentos') : 'sem registro'}`}
        style={StyleSheet.absoluteFill}
      >
        <View
          style={[
            styles.rotuloPos,
            {
              left: rotuloX,
              width: larguraRotulo,
              top: cy - (hoje ? 40 : 22) - (dia.posicao === 'centro' ? -24 : 0),
              alignItems: dia.posicao === 'centro' ? 'flex-end' : 'flex-start',
            },
          ]}
        >
          {dia.posicao === 'centro' ? <View style={styles.direita}>{rotulo}</View> : rotulo}
        </View>

        {cheio ? (
          <View style={{ opacity: opacidade }} pointerEvents="none">
            {/* o anel tracejado é só da emoção central de hoje */}
            {hoje ? (
              <AnelTracejado lado={ANEL_HOJE} cor={cores.action.secondary.default} fundo={cores.bg.raised} x={dia.cx} y={cy} />
            ) : null}
            <View style={[styles.balao, { left: dia.cx - dia.lado / 2, top: cy - dia.lado / 2 }]}>
              <Premo id={central} tamanho={dia.lado} flutuar={hoje} />
            </View>
            {satelites.map((id, i) => {
              const p = LUGARES_SATELITE[i];
              // nos balões da esquerda, os satélites espelham para não cobrir o rótulo
              const x = dia.cx + (dia.posicao === 'esquerda' ? -p.x : p.x) * dia.lado;
              const y = cy + p.y * dia.lado;
              return (
                <View key={id} style={[styles.balao, { left: x - ladoSatelite / 2, top: y - ladoSatelite / 2 }]}>
                  <Premo id={id} tamanho={ladoSatelite} flutuar={hoje} fase={400 * (i + 1)} />
                </View>
              );
            })}
          </View>
        ) : (
          <View
            pointerEvents="none"
            style={[
              styles.semRegistro,
              {
                left: dia.cx - LADO_SEM_REGISTRO / 2,
                top: cy - LADO_SEM_REGISTRO / 2,
                borderColor: cores.text.tertiary,
              },
            ]}
          />
        )}
      </Pressable>
    </Aparecer>
  );
}

/** Anel tracejado em volta da emoção central de hoje (o "Hoje · destaque" do Figma). */
function AnelTracejado({ lado, cor, fundo, x, y }: { lado: number; cor: string; fundo?: string; x: number; y: number }) {
  const r = lado / 2 - 1;
  return (
    <Svg width={lado} height={lado} style={[styles.balao, { left: x - lado / 2, top: y - lado / 2 }]}>
      <Circle cx={lado / 2} cy={lado / 2} r={r} stroke={cor} strokeWidth={1.5} strokeDasharray="6 5" fill={fundo ?? 'none'} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  faixa: { position: 'absolute', left: 0, right: 0 },
  balao: { position: 'absolute' },
  rotuloPos: { position: 'absolute' },
  rotulo: { gap: 2 },
  direita: { alignItems: 'flex-start' },
  hoje: { letterSpacing: 0.96, marginBottom: 5 },
  semRegistro: {
    position: 'absolute',
    width: LADO_SEM_REGISTRO,
    height: LADO_SEM_REGISTRO,
    borderRadius: LADO_SEM_REGISTRO / 2,
    borderWidth: borderWidth.thin,
    borderStyle: 'dashed',
  },
  mais: { paddingHorizontal: space[24], paddingTop: space[16] },
});
