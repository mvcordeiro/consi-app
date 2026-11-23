import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { borderWidth, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

type Props = {
  /** Quanto da espera já passou (0 a 1). Animado no driver nativo. */
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
 *
 * O preenchimento é uma pílula da largura do botão que desliza da esquerda (translateX no
 * driver nativo). Antes a largura era animada pelo JS e, com a pausa ocupada, ficava para trás:
 * o botão virava "Continuar" com 10 a 20% ainda vazio.
 */
export function BotaoTimer({ progresso, segundos, pronto, variante, onContinuar }: Props) {
  const { cores } = useTema();
  const [largura, setLargura] = useState(0);

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
      onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
      style={[styles.botao, { borderColor: cores.border.focus }]}
    >
      {largura > 0 ? (
        <Animated.View
          style={[
            styles.preenchimento,
            {
              width: largura,
              backgroundColor: cores.bg.raised,
              borderColor: cores.border.focus,
              transform: [
                {
                  translateX: progresso.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-largura, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
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
