import { type ReactNode } from 'react';
import { Image, LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { emocaoPorId } from '@/data/emocoes';
import { temIconePorEmocao } from '@/data/iconeEmocao';
import {
  alternarSecao,
  definirPreferencias,
  moverSecao,
  NOMES_SECOES,
  ordemDasAbas,
  TAMANHOS_TEXTO,
  usePreferencias,
  type AbaInicial,
  type Aparencia,
  type Movimento,
  type TamanhoTexto,
} from '@/data/preferencias';
import { borderWidth, radius, space, useTema } from '@/theme';

import { Alternancia } from '../Alternancia';
import { EscalaPassos } from '../EscalaPassos';
import { iconesDasAbas } from '../BarraNavegacao';
import { Filtro } from '../Filtro';
import { BalaoEmocao } from '../home/BalaoEmocao';
import { Texto } from '../Texto';
import { Ajuste, Divisoria } from './Cartao';
import { ListaArrastavel } from './ListaArrastavel';

const iconeConsi = require('../../../assets/icon.png');

function Opcoes<T extends string>({ lista, atual, onEscolher }: { lista: [T, string][]; atual: T; onEscolher: (v: T) => void }) {
  return (
    <View style={styles.opcoes} accessibilityRole="radiogroup">
      {lista.map(([v, rotulo]) => (
        <Filtro key={v} rotulo={rotulo} ativo={atual === v} onPress={() => onEscolher(v)} />
      ))}
    </View>
  );
}

// ─── Escolha lado a lado ────────────────────────────────────────────────────
/** Botão de rádio: anel border/focus e, escolhido, o miolo em action/primary. */
function Radio({ ativo }: { ativo: boolean }) {
  const { cores } = useTema();
  return (
    <View style={[styles.radio, { borderColor: ativo ? cores.action.primary.default : cores.border.focus }]}>
      {ativo ? <View style={[styles.radioMiolo, { backgroundColor: cores.action.primary.default }]} /> : null}
    </View>
  );
}

/**
 * Uma opção de uma escolha lado a lado: a ilustração num quadrado em cima, o nome curto embaixo
 * e o rádio. A escolhida ganha a borda action/primary.
 */
function CartaoEscolha({
  rotulo,
  ativo,
  onPress,
  children,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: ativo }}
      accessibilityLabel={rotulo}
      style={({ pressed }) => [
        styles.cartao,
        {
          borderColor: ativo ? cores.action.primary.default : cores.border.subtle,
          backgroundColor: cores.bg.raised,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.quadro, { backgroundColor: cores.bg.sunken }]}>{children}</View>
      <Texto estilo="Texto/Botões e rótulos" numberOfLines={1}>
        {rotulo}
      </Texto>
      <Radio ativo={ativo} />
    </Pressable>
  );
}

// ─── Ícones da aparência (traço simples, na cor do texto) ───────────────────
function IconeSol({ cor }: { cor: string }) {
  const raios = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      <Circle cx={14} cy={14} r={5} stroke={cor} strokeWidth={1.6} fill="none" />
      {raios.map((a) => (
        <Line
          key={a}
          x1={14 + Math.cos(a) * 8.5}
          y1={14 + Math.sin(a) * 8.5}
          x2={14 + Math.cos(a) * 12}
          y2={14 + Math.sin(a) * 12}
          stroke={cor}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

function IconeLua({ cor }: { cor: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      <Path
        d="M19.5 18.6A8.5 8.5 0 0 1 10.4 5.2a9 9 0 1 0 12.4 12.3 8.4 8.4 0 0 1-3.3 1.1Z"
        stroke={cor}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function IconeCelular({ cor }: { cor: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      <Rect x={8} y={3.5} width={12} height={21} rx={2.6} stroke={cor} strokeWidth={1.6} fill="none" />
      <Path d="M8 15.5c3-2 9-2 12 0V22a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 8 22Z" fill={cor} opacity={0.35} />
      <Line x1={12.5} y1={6.5} x2={15.5} y2={6.5} stroke={cor} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Tamanho do texto: 5 marcas ─────────────────────────────────────────────
/** Escala de 5 marcas para o tamanho do texto, com um exemplo em cima que muda na hora. */
function TamanhoDoTexto() {
  const { cores } = useTema();
  const { tamanhoTexto } = usePreferencias();
  const indice = Math.max(0, TAMANHOS_TEXTO.indexOf(tamanhoTexto));

  return (
    <View style={styles.tamanho}>
      <View style={[styles.exemplo, { backgroundColor: cores.bg.raised, borderColor: cores.border.subtle }]}>
        <Texto estilo="Títulos/Pequeno">Um dia de cada vez</Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          É assim que os textos do Consi vão aparecer.
        </Texto>
      </View>
      <EscalaPassos
        quantidade={TAMANHOS_TEXTO.length}
        indice={indice}
        onMudar={(i) => definirPreferencias({ tamanhoTexto: TAMANHOS_TEXTO[i] as TamanhoTexto })}
        rotulo="Tamanho do texto"
        inicio={
          <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
            A
          </Texto>
        }
        fim={
          <Texto estilo="Títulos/Pequeno" cor={cores.text.secondary}>
            A
          </Texto>
        }
      />
    </View>
  );
}

// ─── Abrir o app em: a barra de navegação ───────────────────────────────────
const ESCOLHIVEIS: AbaInicial[] = ['index', 'hobbies', 'diario'];
const NOMES_ABAS: Record<string, string> = {
  index: 'Início',
  hobbies: 'Hobbies',
  diario: 'Diário',
  social: 'Social',
  ajustes: 'Ajustes',
};

/**
 * A barra de navegação em miniatura: tocar em Início, Hobbies ou Diário faz dela a aba em que o
 * app abre, e ela vai para o meio da barra (a de verdade também muda). Social e Ajustes aparecem
 * apagados, só para a barra ficar igual à real.
 */
function AbrirEm() {
  const { cores } = useTema();
  const { abaInicial } = usePreferencias();
  const escolher = (a: AbaInicial) => {
    if (a === abaInicial) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    definirPreferencias({ abaInicial: a });
  };
  return (
    <View style={styles.abrirEm}>
      <View style={[styles.barra, { backgroundColor: cores.bg.raised }]} accessibilityRole="radiogroup">
        {ordemDasAbas(abaInicial).map((aba) => {
          const Icone = iconesDasAbas[aba];
          const escolhivel = ESCOLHIVEIS.includes(aba as AbaInicial);
          const ativo = aba === abaInicial;
          return (
            <Pressable
              key={aba}
              disabled={!escolhivel}
              onPress={() => escolher(aba as AbaInicial)}
              accessibilityRole="radio"
              accessibilityState={{ checked: ativo, disabled: !escolhivel }}
              accessibilityLabel={NOMES_ABAS[aba]}
              style={[styles.itemBarra, { opacity: escolhivel ? 1 : 0.35 }]}
            >
              <View
                style={[styles.fundoItem, { backgroundColor: ativo ? cores.action.primary.pressed : 'transparent' }]}
              >
                {Icone ? (
                  <Icone
                    width={22}
                    height={22}
                    corTraco={ativo ? cores.action.primary.default : cores.action.neutral.default}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
        O Consi abre em {NOMES_ABAS[abaInicial]}. Toque em outra aba para trocar.
      </Texto>
    </View>
  );
}

/**
 * Ajustes → Personalizar: aparência, tamanho do texto, reduzir movimento, vibração, ícone do
 * app e a aba em que o app abre. Tudo fica só neste celular (src/data/preferencias.ts) e vale na hora.
 */
export function Personalizar() {
  const { cores } = useTema();
  const prefs = usePreferencias();
  const alegria = emocaoPorId('alegria');
  const corIcone = cores.text.primary;
  const aparencias: [Aparencia, string, ReactNode][] = [
    ['sistema', 'Do celular', <IconeCelular key="s" cor={corIcone} />],
    ['light', 'Claro', <IconeSol key="l" cor={corIcone} />],
    ['dark', 'Escuro', <IconeLua key="d" cor={corIcone} />],
  ];
  return (
    <View>
      <Ajuste titulo="Aparência">
        <View style={styles.lado} accessibilityRole="radiogroup">
          {aparencias.map(([v, rotulo, icone]) => (
            <CartaoEscolha key={v} rotulo={rotulo} ativo={prefs.aparencia === v} onPress={() => definirPreferencias({ aparencia: v })}>
              {icone}
            </CartaoEscolha>
          ))}
        </View>
      </Ajuste>

      <Divisoria />

      <Ajuste titulo="Tamanho do texto">
        <TamanhoDoTexto />
      </Ajuste>

      <Divisoria />

      <Ajuste titulo="Reduzir movimento" descricao="Balões parados e transições mais curtas.">
        <Opcoes<Movimento>
          lista={[
            ['sistema', 'Do celular'],
            ['reduzido', 'Ligado'],
            ['normal', 'Desligado'],
          ]}
          atual={prefs.movimento}
          onEscolher={(movimento) => definirPreferencias({ movimento })}
        />
      </Ajuste>

      <Divisoria />

      <Ajuste
        titulo="Vibração"
        descricao="Toques leves ao arrastar, revelar drops e confirmar."
        acessorio={
          <Alternancia rotulo="Vibração" ligado={prefs.vibracao} onMudar={(vibracao) => definirPreferencias({ vibracao })} />
        }
      />

      <Divisoria />

      {temIconePorEmocao ? (
        <>
          <Ajuste titulo="Ícone do app">
            <View style={styles.lado} accessibilityRole="radiogroup">
              <CartaoEscolha
                rotulo="Consi"
                ativo={!prefs.iconePorEmocao}
                onPress={() => definirPreferencias({ iconePorEmocao: false })}
              >
                <Image source={iconeConsi} style={styles.iconeApp} />
              </CartaoEscolha>
              <CartaoEscolha
                rotulo="Sua emoção"
                ativo={prefs.iconePorEmocao}
                onPress={() => definirPreferencias({ iconePorEmocao: true })}
              >
                <View style={[styles.iconeApp, styles.iconeEmocao, { backgroundColor: cores.bg.base }]}>
                  {alegria ? (
                    <BalaoEmocao Svg={alegria.Svg} Textura={alegria.Textura} circulo={alegria.circulo} tamanho={30} flutuar={false} />
                  ) : null}
                </View>
              </CartaoEscolha>
            </View>
          </Ajuste>

          <Divisoria />
        </>
      ) : null}

      <Ajuste titulo="Abrir o app em">
        <AbrirEm />
      </Ajuste>
    </View>
  );
}

const ALTURA_LINHA = 56;

/** Ajustes → Seções do Início: mostrar/esconder e arrastar para mudar a ordem. */
export function SecoesInicio({ onArrastando }: { onArrastando: (a: boolean) => void }) {
  const { cores } = useTema();
  const { secoesHome } = usePreferencias();
  const visiveis = secoesHome.filter((s) => s.visivel).length;
  return (
    <View>
      <Ajuste
        titulo="Seções do Início"
        descricao={`Escolha o que aparece abaixo das emoções. Arraste para mudar a ordem. ${visiveis} de ${secoesHome.length} visíveis.`}
      />
      <ListaArrastavel
        itens={secoesHome}
        chave={(s) => s.id}
        altura={ALTURA_LINHA}
        rotuloAlca={(s) => `Reordenar ${NOMES_SECOES[s.id]}`}
        onMover={(s, para) => moverSecao(s.id, para)}
        onArrastando={onArrastando}
        renderizar={(s) => (
          <>
            <View style={styles.flex}>
              <Texto estilo="Texto/Botões e rótulos" cor={s.visivel ? cores.text.primary : cores.text.tertiary}>
                {NOMES_SECOES[s.id]}
              </Texto>
              {!s.visivel ? (
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                  Escondida
                </Texto>
              ) : null}
            </View>
            <Alternancia rotulo={`Mostrar ${NOMES_SECOES[s.id]}`} ligado={s.visivel} onMudar={() => alternarSecao(s.id)} />
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  flex: { flex: 1 },
  centro: { textAlign: 'center' },
  lado: { flexDirection: 'row', gap: space[12] },
  cartao: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: space[8],
    padding: space[12] - borderWidth.thick,
    paddingBottom: space[16] - borderWidth.thick,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thick,
  },
  quadro: {
    alignSelf: 'stretch',
    aspectRatio: 1.25,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: borderWidth.thick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMiolo: { width: 10, height: 10, borderRadius: radius.full },
  iconeApp: { width: 52, height: 52, borderRadius: 14 },
  iconeEmocao: { alignItems: 'center', justifyContent: 'center' },
  tamanho: { gap: space[16] },
  exemplo: { gap: space[4], padding: space[16], borderRadius: radius.md, borderWidth: borderWidth.thin },
  abrirEm: { gap: space[12] },
  barra: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
  },
  itemBarra: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fundoItem: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
