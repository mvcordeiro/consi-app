import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { vibrarSelecao } from '@/data/haptica';
import { votar } from '@/data/nuvem/sugestoes';
import type { Placar, ValorVoto } from '@/data/nuvem/tipos';
import { size, space, useTema } from '@/theme';

import { Texto } from '../Texto';
import { mensagemErro } from './rotulos';

type Votavel = Placar & { id: string; meuVoto: ValorVoto };

/** Placar que o servidor vai devolver, calculado antes, para a tela responder na hora. */
function placarOtimista(s: Votavel, novo: ValorVoto): Placar {
  const pos = s.votosPos - (s.meuVoto === 1 ? 1 : 0) + (novo === 1 ? 1 : 0);
  const neg = s.votosNeg - (s.meuVoto === -1 ? 1 : 0) + (novo === -1 ? 1 : 0);
  return { votosPos: pos, votosNeg: neg, pontos: pos - neg };
}

/** 950 → "950", 1234 → "1,2 mil", 4000 → "4 mil". */
export function pontosCurtos(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return String(n);
  const mil = n / 1000;
  return `${mil.toLocaleString('pt-BR', { maximumFractionDigits: abs < 10000 ? 1 : 0 })} mil`;
}

/** Seta cheia (estilo "upvote"): para cima ou para baixo. */
function Seta({ cima, cor }: { cima: boolean; cor: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d={cima ? 'M10 2 L18 11 H13 V18 H7 V11 H2 Z' : 'M10 18 L2 9 H7 V2 H13 V9 H18 Z'}
        fill={cor}
        stroke={cor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * ↑ placar ↓ numa linha, sem caixas. Neutro: setas e número em cinza. Votou a favor: seta de
 * cima e número na cor de ação; contra: seta de baixo e número em vermelho. Tocar no voto que já é
 * seu tira o voto. Atualiza na hora (otimista) e acerta com o servidor; se falhar, volta ao que era
 * e chama `onErro`. Desligado (sem toque, mais apagado) na própria sugestão e nas não publicadas.
 */
export function BotoesVoto({
  sugestao,
  onMudar,
  onErro,
  desligado = false,
}: {
  sugestao: Votavel;
  onMudar: (s: Placar & { meuVoto: ValorVoto }) => void;
  onErro: (mensagem: string) => void;
  desligado?: boolean;
}) {
  const { cores } = useTema();
  const [ocupado, setOcupado] = useState(false);
  const corA = cores.action.primary.default;
  const corContra = cores.feedback.error;
  const neutro = desligado ? cores.text.disabled : cores.icon.secondary;
  const corNumero = sugestao.meuVoto === 1 ? corA : sugestao.meuVoto === -1 ? corContra : desligado ? cores.text.disabled : cores.text.secondary;

  const tocar = async (valor: 1 | -1) => {
    if (ocupado || desligado) return;
    const novo: ValorVoto = sugestao.meuVoto === valor ? 0 : valor;
    const antes = { votosPos: sugestao.votosPos, votosNeg: sugestao.votosNeg, pontos: sugestao.pontos, meuVoto: sugestao.meuVoto };
    vibrarSelecao();
    onMudar({ ...placarOtimista(sugestao, novo), meuVoto: novo });
    setOcupado(true);
    try {
      const placar = await votar(sugestao.id, novo);
      onMudar({ ...placar, meuVoto: novo });
    } catch (e) {
      onMudar(antes);
      onErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  };

  const botao = (valor: 1 | -1) => {
    const ativo = sugestao.meuVoto === valor;
    return (
      <Pressable
        onPress={() => tocar(valor)}
        disabled={desligado}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={valor === 1 ? 'Votar a favor' : 'Votar contra'}
        accessibilityState={{ selected: ativo, disabled: desligado }}
        style={({ pressed }) => [styles.botao, pressed && { opacity: 0.6 }]}
      >
        <Seta cima={valor === 1} cor={ativo ? (valor === 1 ? corA : corContra) : neutro} />
      </Pressable>
    );
  };

  return (
    <View style={styles.grupo}>
      {botao(1)}
      <Texto
        estilo="Texto/Botões e rótulos"
        cor={corNumero}
        style={styles.placar}
        accessibilityLabel={`${sugestao.pontos} pontos: ${sugestao.votosPos} a favor e ${sugestao.votosNeg} contra`}
      >
        {pontosCurtos(sugestao.pontos)}
      </Texto>
      {botao(-1)}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  botao: { width: size['touch-target'] - 8, height: size['touch-target'] - 8, alignItems: 'center', justifyContent: 'center' },
  placar: { minWidth: 24, textAlign: 'center' },
});
