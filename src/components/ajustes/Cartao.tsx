import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { borderWidth, size, space, useTema } from '@/theme';

import { Texto } from '../Texto';

/**
 * Peças das páginas de Ajustes. Tudo fica direto no fundo, sem cartões e sem eyebrows:
 * título do ajuste (Títulos/Pequeno) → explicação (Texto/Pequeno, text/secondary) → controle,
 * e uma `Divisoria` de 1 px entre um ajuste e outro.
 */

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
        <Texto estilo="Títulos/Pequeno" style={styles.flex} accessibilityRole="header">
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

/** Linha que abre outra página: título, explicação curta, valor ou ponto de "novo" e "›". */
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

/** Lista de linhas com divisórias entre elas (o índice de Ajustes, Comunidade). */
export function ListaLinks({ children }: { children: ReactNode }) {
  const itens = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View>
      {itens.map((item, i) => (
        <View key={i}>
          {i > 0 ? <Divisoria /> : null}
          {item}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ajuste: { gap: space[8], paddingVertical: space[16] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  controle: { marginTop: space[4], gap: space[8] },
  flex: { flex: 1, gap: space[2] },
  divisoria: { height: borderWidth.thin },
  link: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: size['touch-target'] + space[16], paddingVertical: space[16] },
  selo: { width: 8, height: 8, borderRadius: 4 },
});
