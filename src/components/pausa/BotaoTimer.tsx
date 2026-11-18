import { Animated, StyleSheet, View } from 'react-native';

import { borderWidth, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

type Props = {
  /** Quanto da espera já passou (0 a 1). */
  progresso: Animated.Value;
  /** Segundos que faltam (mostrados no botão). */
  segundos: number;
  pronto: boolean;
  /**
   * Na pausa, "Continuar" preenchido (Figma 638:4480). Depois do check-in, em contorno como em 638:5433,
   * mas com "Quero abrir meu aplicativo" no lugar de "Sim, quero continuar" (pedido do produto: era confuso).
   */
  variante: 'continuar' | 'abrir';
  onContinuar: () => void;
};

/**
 * Botão de continuar com o timer dentro (Figma 638:4351 / 638:4417): contorno border/focus,
 * o preenchimento bg/raised cresce da esquerda conforme a espera passa, com o relógio e os
 * segundos em text/accent. Quando a espera acaba, vira o botão de continuar.
 */
export function BotaoTimer({ progresso, segundos, pronto, variante, onContinuar }: Props) {
  const { cores } = useTema();

  if (pronto) {
    return (
      <Aparecer deslocamento={0} escalaInicial={0.97} duracao={400}>
        {variante === 'continuar' ? (
          <Botao rotulo="Continuar" corRotulo={cores.icon.primary} onPress={onContinuar} />
        ) : (
          <Botao rotulo="Quero abrir meu aplicativo" estilo="secundario" corRotulo={cores.text.accent} onPress={onContinuar} />
        )}
      </Aparecer>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Você poderá continuar em ${segundos} segundos`}
      style={[styles.botao, { borderColor: cores.border.focus }]}
    >
      <Animated.View
        style={[
          styles.preenchimento,
          {
            backgroundColor: cores.bg.raised,
            borderColor: cores.border.focus,
            width: progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }),
            // sem o fiapo da borda antes de começar a encher
            opacity: progresso.interpolate({ inputRange: [0, 0.03], outputRange: [0, 1], extrapolate: 'clamp' }),
          },
        ]}
      />
      {/* Num View: na web, o preenchimento absoluto seria pintado por cima do SVG. */}
      <View style={styles.conteudo}>
        <Icone nome="relogio" tamanho={24} cor={cores.text.accent} />
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.accent}>
          {segundos}s
        </Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  botao: {
    height: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[20],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  // No Figma o preenchimento é outro botão (bg/raised + borda border/focus) por baixo.
  preenchimento: {
    position: 'absolute',
    left: -borderWidth.thin,
    top: -borderWidth.thin,
    bottom: -borderWidth.thin,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
});
