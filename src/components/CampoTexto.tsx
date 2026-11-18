import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { borderWidth, radius, space, tipografia, useTema } from '@/theme';

import { Texto } from './Texto';

/**
 * Campo / Entrada de texto — componente do Design System (Átomos, nó 125:17).
 * Título opcional (Títulos/Pequeno), rótulo (Legenda/Pequena, text/secondary) sempre visível,
 * área de 40 px em bg/app-raised com borda border/subtle; em foco a borda vira border/focus (2 px),
 * em erro feedback/error com a mensagem embaixo.
 */
type Props = Omit<TextInputProps, 'style'> & {
  /** Rótulo acima da área. Sem ele, passe `acessibilidade` (ex.: o campo do chat). */
  rotulo?: string;
  acessibilidade?: string;
  ref?: Ref<TextInputInstance>;
  titulo?: string;
  erro?: string;
  /** Altura mínima da área, para textos de várias linhas. */
  alturaMinima?: number;
};

export function CampoTexto({ ref, rotulo, acessibilidade, titulo, erro, alturaMinima, editable = true, onFocus, onBlur, ...rest }: Props) {
  const { cores } = useTema();
  const [foco, setFoco] = useState(false);
  const desabilitado = !editable;

  const borda = desabilitado
    ? { borderWidth: borderWidth.thin, borderColor: cores.border.disabled }
    : erro
      ? { borderWidth: borderWidth.thin, borderColor: cores.feedback.error }
      : foco
        ? { borderWidth: borderWidth.thick, borderColor: cores.border.focus }
        : { borderWidth: borderWidth.thin, borderColor: cores.border.subtle };
  // O padding compensa a borda mais grossa do foco, para o texto não pular.
  const recuo = space[12] - (borda.borderWidth - borderWidth.thin);

  return (
    <View style={styles.coluna}>
      {titulo ? <Texto estilo="Títulos/Pequeno">{titulo}</Texto> : null}
      {rotulo ? (
        <Texto estilo="Legenda/Pequena" cor={desabilitado ? cores.text.disabled : cores.text.secondary}>
          {rotulo}
        </Texto>
      ) : null}
      <View
        style={[
          styles.area,
          borda,
          {
            paddingHorizontal: recuo,
            backgroundColor: desabilitado ? cores.bg.disabled : cores.bg['app-raised'],
            minHeight: alturaMinima ?? 40,
          },
        ]}
      >
        <TextInput
          ref={ref}
          editable={editable}
          accessibilityLabel={acessibilidade ?? rotulo}
          placeholderTextColor={desabilitado ? cores.text.disabled : cores.text.secondary}
          onFocus={(e) => {
            setFoco(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur?.(e);
          }}
          style={[
            tipografia['Texto/Pequeno'],
            styles.entrada,
            { color: desabilitado ? cores.text.disabled : cores.text.primary },
            alturaMinima ? styles.multilinha : null,
          ]}
          {...rest}
        />
      </View>
      {erro ? (
        <Texto estilo="Legenda/Pequena" cor={cores.feedback.error}>
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: { gap: space[8] },
  area: { justifyContent: 'center', paddingVertical: space[8], borderRadius: radius.md },
  entrada: { padding: 0, outlineStyle: 'none' } as object,
  multilinha: { textAlignVertical: 'top', flex: 1 },
});
