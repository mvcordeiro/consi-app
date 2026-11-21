import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { HobbyId } from '@/data/catalogo';
import { borderWidth, radius, space, useTema } from '@/theme';

import { IconeHobby } from '../../hobbies/IconeHobby';
import { Texto } from '../../Texto';
import { IconeHobbies } from '../assets';

export { vibrar } from '../../hobbies/Arraste';
/** "Reduzir movimento": a escolha em Ajustes ou a do sistema. */
export { useMovimentoReduzido } from '@/data/preferencias';

/**
 * O que toda mecânica de revelar recebe. O resultado é sempre o mesmo: ao terminar a
 * interação, a mecânica chama `onRevelar` uma vez, e o Drops mostra a sugestão.
 */
export type PropsMecanica = {
  onRevelar: () => void;
  /** Trava a rolagem da Home enquanto um gesto está em andamento. */
  onArrastando: (a: boolean) => void;
  /** Hobby do próximo drop: o ícone do convite "Seu drop chegou!" por baixo das coberturas. */
  hobbyPrevia: HobbyId | null;
  /** Leitor de tela ou "reduzir movimento": as animações decorativas ficam paradas. */
  movimentoReduzido: boolean;
};

/** Garante que `onRevelar` só rode uma vez, mesmo com toques ou gestos repetidos. */
export function useUmaVez(fn: () => void) {
  const feito = useRef(false);
  const atual = useRef(fn);
  useEffect(() => {
    atual.current = fn;
  });
  return () => {
    if (feito.current) return;
    feito.current = true;
    atual.current();
  };
}

/** Casca do card escondido: o mesmo fundo, borda e raio do card "Puxe para revelar". */
export function Casca({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { cores } = useTema();
  return (
    <View style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }, style]}>
      {children}
    </View>
  );
}

/** Ícone + título + instrução do card escondido (o texto da instrução muda por mecânica). */
export function Cabeca({ instrucao }: { instrucao: string }) {
  const { cores } = useTema();
  return (
    <>
      <View style={[styles.iconeDrop, { backgroundColor: cores.action.primary.default }]}>
        <IconeHobbies width={24.01} height={23.66} corTraco={cores.text.primary} />
      </View>
      <Texto estilo="Títulos/Médio" style={styles.centro}>
        Seu próximo drop está escondido.
      </Texto>
      <Texto estilo="Texto/Pequeno" style={styles.centro}>
        {instrucao}
      </Texto>
    </>
  );
}

/**
 * O que fica "por baixo" nas mecânicas com cobertura (vidro, tampa, carta, bolhas): já o
 * convite "Seu drop chegou!", igual ao começo da Revelacao. Assim o gesto abre direto no
 * convite, e o convite leva direto ao drop, sem etapa no meio.
 */
export function Convite({ hobby }: { hobby: HobbyId | null }) {
  const { cores } = useTema();
  return (
    <View style={styles.convite}>
      <View style={[styles.iconeConvite, { backgroundColor: cores.action.primary.default }]}>
        {hobby ? (
          <IconeHobby hobby={hobby} caixa={28} cor={cores.text.primary} />
        ) : (
          <IconeHobbies width={28} height={28} corTraco={cores.text.primary} />
        )}
      </View>
      <Texto estilo="Títulos/Médio" style={styles.centro}>
        Seu drop chegou!
      </Texto>
    </View>
  );
}

/**
 * Alternativa sem gesto: um link sempre visível que revela o drop com um toque só
 * (para quem não consegue ou não quer fazer o gesto, e para leitores de tela).
 */
export function RevelarSemGesto({ onRevelar }: { onRevelar: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onRevelar}
      accessibilityRole="button"
      accessibilityLabel="Revelar o drop sem fazer o gesto"
      hitSlop={12}
      style={({ pressed }) => [styles.semGesto, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Texto estilo="Texto/Botões e rótulos" cor={cores.text.link} style={styles.centro}>
        Revelar sem gesto
      </Texto>
    </Pressable>
  );
}

export const ICONE_DROP = 52;

const styles = StyleSheet.create({
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  card: {
    alignItems: 'center',
    gap: space[16],
    // borda interna no Figma: desconta 1 px do padding
    paddingHorizontal: space[24] - borderWidth.thin,
    paddingVertical: 22 - borderWidth.thin,
    borderRadius: radius.xl,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  iconeDrop: {
    width: ICONE_DROP,
    height: ICONE_DROP,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convite: { alignItems: 'center', gap: space[16], alignSelf: 'stretch' },
  iconeConvite: {
    width: ICONE_DROP + 12,
    height: ICONE_DROP + 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semGesto: { alignSelf: 'center', paddingVertical: space[8], paddingHorizontal: space[16] },
});
