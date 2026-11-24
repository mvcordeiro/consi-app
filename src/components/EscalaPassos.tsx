import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, useTema } from '@/theme';

import { Texto } from './Texto';

const LADO_PEGADOR = 24;
const LARGURA_ROTULO = 64;

/**
 * Controle deslizante de N marcas (como o tamanho do texto em Personalizar). Arrastar ou tocar
 * numa marca escolhe; acessível como "adjustable" (deslizar para cima/baixo no leitor de tela).
 * `inicio` e `fim` ficam nas pontas do trilho; `rotulos` (um por marca) ficam logo abaixo,
 * centrados em cada marca, e o escolhido ganha destaque.
 */
export function EscalaPassos({
  quantidade,
  indice,
  onMudar,
  rotulo,
  valorAcessivel,
  inicio,
  fim,
  rotulos,
}: {
  quantidade: number;
  indice: number;
  onMudar: (i: number) => void;
  rotulo: string;
  valorAcessivel?: string;
  inicio?: ReactNode;
  fim?: ReactNode;
  rotulos?: string[];
}) {
  const { cores } = useTema();
  const [largura, setLargura] = useState(0);
  const passos = quantidade - 1;
  const util = Math.max(1, largura - LADO_PEGADOR);
  const escolher = (i: number) => {
    const novo = Math.min(passos, Math.max(0, i));
    if (novo !== indice) onMudar(novo);
  };
  const escolherEm = (x: number) =>
    escolher(Math.round(Math.min(1, Math.max(0, (x - LADO_PEGADOR / 2) / util)) * passos));

  return (
    <View style={styles.linha}>
      {inicio}
      <View style={styles.coluna}>
        <View
          style={styles.trilho}
          onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={rotulo}
          accessibilityValue={valorAcessivel ? { text: valorAcessivel } : { min: 1, max: quantidade, now: indice + 1 }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => escolher(indice + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          // a página não rola enquanto o dedo está no controle
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => escolherEm(e.nativeEvent.locationX)}
          onResponderMove={(e) => escolherEm(e.nativeEvent.locationX)}
        >
          <View pointerEvents="none" style={[styles.linhaTrilho, { backgroundColor: cores.border.subtle }]} />
          {largura > 0
            ? Array.from({ length: quantidade }, (_, i) => (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[
                    styles.marca,
                    {
                      left: LADO_PEGADOR / 2 + (util * i) / passos - 4,
                      backgroundColor: i <= indice ? cores.action.primary.default : cores.border.focus,
                    },
                  ]}
                />
              ))
            : null}
          {largura > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.pegador,
                {
                  left: (util * indice) / passos,
                  backgroundColor: cores.action.primary.default,
                  borderColor: cores.bg.base,
                },
              ]}
            />
          ) : null}
        </View>
        {rotulos && largura > 0 ? (
          <View style={styles.rotulos} importantForAccessibility="no-hide-descendants">
            {rotulos.map((r, i) => (
              <Texto
                key={r}
                estilo="Legenda/Pequena"
                cor={i === indice ? cores.text.primary : cores.text.tertiary}
                // centrado na marca; o primeiro e o último encostam nas pontas para não vazar
                style={[
                  styles.rotulo,
                  i === 0
                    ? { left: 0, textAlign: 'left' }
                    : i === passos
                      ? { right: 0, textAlign: 'right' }
                      : { left: LADO_PEGADOR / 2 + (util * i) / passos - LARGURA_ROTULO / 2 },
                ]}
                onPress={() => escolher(i)}
              >
                {r}
              </Texto>
            ))}
          </View>
        ) : null}
      </View>
      {fim}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  coluna: { flex: 1 },
  trilho: { height: 40, justifyContent: 'center' },
  rotulos: { height: 18, marginTop: -space[8] },
  rotulo: { position: 'absolute', width: LARGURA_ROTULO, textAlign: 'center' },
  linhaTrilho: {
    position: 'absolute',
    left: LADO_PEGADOR / 2,
    right: LADO_PEGADOR / 2,
    height: 2,
    borderRadius: 1,
  },
  marca: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  pegador: {
    position: 'absolute',
    width: LADO_PEGADOR,
    height: LADO_PEGADOR,
    borderRadius: LADO_PEGADOR / 2,
    borderWidth: 3,
  },
});
