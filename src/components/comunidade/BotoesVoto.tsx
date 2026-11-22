import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { vibrarSelecao } from '@/data/haptica';
import { votar } from '@/data/nuvem/sugestoes';
import type { Placar, ValorVoto } from '@/data/nuvem/tipos';
import { borderWidth, radius, size, space, useTema } from '@/theme';

import { Texto } from '../Texto';
import { mensagemErro } from './rotulos';

type Votavel = Placar & { id: string; meuVoto: ValorVoto };

/** Placar que o servidor vai devolver, calculado antes, para a tela responder na hora. */
function placarOtimista(s: Votavel, novo: ValorVoto): Placar {
  const pos = s.votosPos - (s.meuVoto === 1 ? 1 : 0) + (novo === 1 ? 1 : 0);
  const neg = s.votosNeg - (s.meuVoto === -1 ? 1 : 0) + (novo === -1 ? 1 : 0);
  return { votosPos: pos, votosNeg: neg, pontos: pos - neg };
}

/**
 * ▲ placar ▼. Tocar no voto que já é seu tira o voto. Atualiza na hora (otimista) e acerta com o
 * placar do servidor; se falhar, volta ao que era e chama `onErro` com a frase para o aviso.
 * Desligado para a própria sugestão e para as que ainda não foram publicadas.
 */
export function BotoesVoto({
  sugestao,
  onMudar,
  onErro,
  desligado = false,
  horizontal = false,
}: {
  sugestao: Votavel;
  onMudar: (s: Placar & { meuVoto: ValorVoto }) => void;
  onErro: (mensagem: string) => void;
  desligado?: boolean;
  horizontal?: boolean;
}) {
  const { cores } = useTema();
  const [ocupado, setOcupado] = useState(false);

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

  const seta = (valor: 1 | -1) => {
    const ativo = sugestao.meuVoto === valor;
    const cor = desligado ? cores.text.disabled : ativo ? cores.text['on-pressed'] : cores.icon.primary;
    return (
      <Pressable
        onPress={() => tocar(valor)}
        disabled={desligado}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={valor === 1 ? 'Votar a favor' : 'Votar contra'}
        accessibilityState={{ selected: ativo, disabled: desligado }}
        style={({ pressed }) => [
          styles.botao,
          {
            borderColor: ativo ? cores.action.primary.pressed : cores.border.default,
            backgroundColor: ativo ? cores.action.primary.pressed : pressed ? cores.bg.selected : 'transparent',
            opacity: desligado ? 0.6 : 1,
          },
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path
            d={valor === 1 ? 'M3 9 L7 5 L11 9' : 'M3 5 L7 9 L11 5'}
            stroke={cor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
    );
  };

  return (
    <View
      style={[styles.grupo, horizontal && styles.horizontal]}
      accessible={false}
      accessibilityLabel={`${sugestao.pontos} pontos`}
    >
      {seta(1)}
      <Texto
        estilo="Texto/Botões e rótulos"
        style={styles.placar}
        accessibilityLabel={`${sugestao.pontos} pontos, ${sugestao.votosPos} a favor e ${sugestao.votosNeg} contra`}
      >
        {sugestao.pontos}
      </Texto>
      {seta(-1)}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { alignItems: 'center', gap: space[4] },
  horizontal: { flexDirection: 'row', gap: space[8] },
  botao: {
    width: size['touch-target'] - 8,
    height: size['touch-target'] - 8,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placar: { minWidth: 28, textAlign: 'center' },
});
