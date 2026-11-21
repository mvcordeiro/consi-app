import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { borderWidth, radius, space, useTema } from '@/theme';

import { Texto } from '../Texto';

/**
 * Peças comuns dos cartões de Ajustes. A hierarquia é sempre a mesma:
 * rótulo do cartão (Texto/Botões e rótulos, text/tertiary, caixa alta) →
 * título do ajuste (Títulos/Pequeno) → explicação (Texto/Pequeno, text/secondary) → controle.
 */
export function CartaoAjustes({ rotulo, children }: { rotulo?: string; children: ReactNode }) {
  const { cores } = useTema();
  return (
    <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
      {rotulo ? (
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary} accessibilityRole="header">
          {rotulo.toUpperCase()}
        </Texto>
      ) : null}
      {children}
    </View>
  );
}

/** Um ajuste: título, explicação opcional, controle à direita (`acessorio`) ou abaixo (`children`). */
export function Ajuste({
  titulo,
  descricao,
  acessorio,
  children,
}: {
  titulo: string;
  descricao?: string;
  acessorio?: ReactNode;
  children?: ReactNode;
}) {
  const { cores } = useTema();
  return (
    <View style={styles.ajuste}>
      <View style={styles.linha}>
        <Texto estilo="Títulos/Pequeno" style={styles.flex}>
          {titulo}
        </Texto>
        {acessorio}
      </View>
      {descricao ? (
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          {descricao}
        </Texto>
      ) : null}
      {children ? <View style={styles.controle}>{children}</View> : null}
    </View>
  );
}

export function Divisoria() {
  const { cores } = useTema();
  return <View style={[styles.divisoria, { backgroundColor: cores.border.subtle }]} />;
}

/** Linha que abre outra tela: título, explicação curta, valor ou selo à direita e "›". */
export function LinhaLink({
  titulo,
  descricao,
  valor,
  selo,
  onPress,
}: {
  titulo: string;
  descricao?: string;
  valor?: string;
  /** Ponto de "novo" (ex.: versão ainda não vista). */
  selo?: boolean;
  onPress: () => void;
}) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[titulo, valor, selo ? 'novo' : null].filter(Boolean).join(', ')}
      accessibilityHint={descricao}
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.flex}>
        <View style={styles.linha}>
          <Texto estilo="Títulos/Pequeno">{titulo}</Texto>
          {selo ? <View style={[styles.selo, { backgroundColor: cores.feedback.success }]} /> : null}
        </View>
        {descricao ? (
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            {descricao}
          </Texto>
        ) : null}
      </View>
      {valor ? (
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {valor}
        </Texto>
      ) : null}
      <Texto estilo="Títulos/Pequeno" cor={cores.icon.secondary}>
        ›
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: space[16], padding: space[16], borderRadius: radius.card },
  ajuste: { gap: space[8] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  controle: { marginTop: space[4], gap: space[8] },
  flex: { flex: 1 },
  divisoria: { height: borderWidth.thin },
  link: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: 44 },
  selo: { width: 8, height: 8, borderRadius: 4 },
});
