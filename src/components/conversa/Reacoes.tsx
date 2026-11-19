import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { reacaoPorId, reacoes, type ReacaoId } from '@/data/catalogo';
import { elevacaoPorModo, radius, space, useTema } from '@/theme';

import { vibrar } from '../hobbies/Arraste';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

const nativo = Platform.OS !== 'web';
const LARGURA_PAINEL = 6 * 48 + 2 * space[8];

export type Ancora = { x: number; y: number; largura: number; altura: number };

/**
 * Painel de reações (segurar no comentário): aparece logo abaixo do comentário, com um véu leve,
 * e os seis rostos do Design System entram um a um com mola. Tocar escolhe; tocar na mesma tira.
 */
export function PainelReacoes({
  ancora,
  atual,
  onEscolher,
  onFechar,
}: {
  ancora: Ancora | null;
  atual?: ReacaoId;
  onEscolher: (r: ReacaoId | null) => void;
  onFechar: () => void;
}) {
  const { cores, modo } = useTema();
  const { width, height } = useWindowDimensions();
  const [entrada] = useState(() => reacoes.map(() => new Animated.Value(0)));
  const [painel] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!ancora) return;
    painel.setValue(0);
    entrada.forEach((v) => v.setValue(0));
    Animated.parallel([
      Animated.timing(painel, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }),
      Animated.stagger(
        35,
        entrada.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: nativo, speed: 18, bounciness: 12 })),
      ),
    ]).start();
  }, [ancora, entrada, painel]);

  if (!ancora) return null;

  // Abaixo do comentário; se não couber, acima.
  const alturaPainel = 64;
  const abaixo = ancora.y + ancora.altura + space[8];
  const top = abaixo + alturaPainel > height - space[48] ? ancora.y - alturaPainel - space[8] : abaixo;
  const left = Math.min(Math.max(space[16], ancora.x + space[16]), width - LARGURA_PAINEL - space[16]);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onFechar} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: cores.bg.scrim, opacity: 0.4 }]} onPress={onFechar} accessibilityLabel="Fechar reações" />
      <Animated.View
        style={[
          styles.painel,
          elevacaoPorModo[modo][3],
          {
            top,
            left,
            backgroundColor: cores.bg.raised,
            borderColor: cores.border.subtle,
            opacity: painel,
            transform: [
              { translateY: painel.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
              { scale: painel.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            ],
          },
        ]}
      >
        {reacoes.map((r, i) => {
          const escolhida = atual === r.id;
          return (
            <Animated.View
              key={r.id}
              style={{
                opacity: entrada[i],
                transform: [
                  { translateY: entrada[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                  { scale: entrada[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                ],
              }}
            >
              <Pressable
                onPress={() => {
                  vibrar('toque');
                  onEscolher(escolhida ? null : r.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={r.rotulo}
                accessibilityState={{ selected: escolhida }}
                style={({ pressed }) => [
                  styles.reacao,
                  escolhida && { backgroundColor: cores.bg.selected },
                  pressed && styles.apertada,
                ]}
              >
                <Icone nome={r.icone} tamanho={28} />
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

/** Reações de um comentário, em pílulas com a contagem; a da pessoa fica destacada. */
export function ChipsReacoes({
  contagem,
  minha,
  onAlternar,
}: {
  contagem: Partial<Record<ReacaoId, number>>;
  minha?: ReacaoId;
  onAlternar: (r: ReacaoId) => void;
}) {
  const { cores } = useTema();
  const itens = (Object.keys(contagem) as ReacaoId[]).filter((r) => (contagem[r] ?? 0) > 0);
  if (!itens.length) return null;
  return (
    <View style={styles.chips}>
      {itens.map((r) => {
        const minhaEsta = r === minha;
        return (
          <Pressable
            key={r}
            onPress={() => onAlternar(r)}
            accessibilityRole="button"
            accessibilityLabel={`${reacaoPorId[r].rotulo}, ${contagem[r]}`}
            accessibilityState={{ selected: minhaEsta }}
            style={[
              styles.chip,
              {
                backgroundColor: minhaEsta ? cores.bg.selected : cores.bg.base,
                borderColor: minhaEsta ? 'transparent' : cores.border.subtle,
              },
            ]}
          >
            <Icone nome={reacaoPorId[r].icone} tamanho={16} />
            <Texto estilo="Legenda/Pequena">{contagem[r]}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  painel: {
    position: 'absolute',
    flexDirection: 'row',
    padding: space[8],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  reacao: { width: 48, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  apertada: { transform: [{ scale: 1.2 }] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    paddingHorizontal: space[8],
    height: 26,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
