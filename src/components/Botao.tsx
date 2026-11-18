import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { borderWidth, radius, space, useTema, type Cores } from '@/theme';

import { Texto } from './Texto';

/**
 * Ação / Botão — componente do Design System (página Átomos, nó 125:9).
 * Variantes: Estilo = Primário | Secundário
 *            Estado = Normal | Ativo | Aviso | Sucesso | Erro | Desabilitado
 * "Ativo" é aplicado automaticamente enquanto o botão está pressionado.
 */
export type EstiloBotao = 'primario' | 'secundario';
export type EstadoBotao = 'normal' | 'aviso' | 'sucesso' | 'erro' | 'desabilitado';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  rotulo: string;
  estilo?: EstiloBotao;
  estado?: EstadoBotao;
  icone?: ReactNode;
  /**
   * Cor do rótulo no estado Normal, quando a instância do Figma sobrescreve a do componente
   * (ex.: na Home o primário usa text/primary em vez de text/on-neutral).
   */
  corRotulo?: string;
};

export function Botao({
  rotulo,
  estilo = 'primario',
  estado = 'normal',
  icone,
  corRotulo,
  disabled,
  ...rest
}: Props) {
  const { cores } = useTema();
  const desabilitado = disabled || estado === 'desabilitado';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      style={({ pressed }) => [styles.base, aparencia(cores, estilo, pressed ? 'ativo' : estado)]}
      {...rest}
    >
      {({ pressed }) => (
        <>
          {icone ? <View style={styles.icone}>{icone}</View> : null}
          <Texto
            estilo="Texto/Botões e rótulos"
            cor={
              corRotulo && !pressed && estado === 'normal'
                ? corRotulo
                : corDoRotulo(cores, estilo, pressed ? 'ativo' : estado)
            }
          >
            {rotulo}
          </Texto>
        </>
      )}
    </Pressable>
  );
}

type EstadoVisual = EstadoBotao | 'ativo';

function aparencia(c: Cores, estilo: EstiloBotao, estado: EstadoVisual) {
  const contorno = (cor: string) => ({ borderWidth: borderWidth.thin, borderColor: cor });
  if (estilo === 'primario') {
    switch (estado) {
      case 'ativo':
        return { backgroundColor: c.action.primary.pressed };
      case 'aviso':
        return { backgroundColor: c.bg['warning-subtle'] };
      case 'sucesso':
        return { backgroundColor: c.feedback.success };
      case 'erro':
        return { backgroundColor: c.feedback.error };
      case 'desabilitado':
        return { backgroundColor: c.bg.disabled };
      default:
        return { backgroundColor: c.action.primary.default };
    }
  }
  switch (estado) {
    case 'ativo':
      return contorno(c.action.neutral.pressed);
    case 'aviso':
      return contorno(c.feedback.warning);
    case 'sucesso':
      return contorno(c.feedback.success);
    case 'erro':
      return contorno(c.feedback.error);
    case 'desabilitado':
      return {};
    default:
      return contorno(c.border.focus);
  }
}

function corDoRotulo(c: Cores, estilo: EstiloBotao, estado: EstadoVisual) {
  if (estado === 'desabilitado') return c.text.disabled;
  if (estado === 'aviso') return c.feedback.warning;
  if (estado === 'ativo') return c.text['on-neutral'];
  if (estilo === 'primario') return estado === 'normal' ? c.text['on-neutral'] : c.text['on-primary'];
  return c.text.primary;
}

const styles = StyleSheet.create({
  base: {
    height: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    paddingHorizontal: space[20],
    paddingVertical: space[12],
    borderRadius: radius.full,
  },
  icone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
