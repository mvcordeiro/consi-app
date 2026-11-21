import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { borderWidth, duration, easing, radius, space, useTema, type Cores } from '@/theme';

import { Texto } from './Texto';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

/**
 * Ação / Botão — componente do Design System (página Átomos, nó 125:9).
 * Variantes: Estilo = Primário | Secundário
 *            Estado = Normal | Ativo | Aviso | Sucesso | Erro | Desabilitado
 * "Ativo" é aplicado automaticamente enquanto o botão está pressionado, com um leve
 * "afundar" (escala) animado.
 */
export type EstiloBotao = 'primario' | 'secundario';
export type EstadoBotao = 'normal' | 'aviso' | 'sucesso' | 'erro' | 'desabilitado';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  rotulo: string;
  estilo?: EstiloBotao;
  estado?: EstadoBotao;
  /** Ícone à esquerda. Pode ser uma função que recebe a cor atual do rótulo. */
  icone?: ReactNode | ((cor: string) => ReactNode);
  /**
   * Cor do rótulo, quando a instância do Figma sobrescreve a do componente
   * (ex.: na Home o primário usa text/primary em vez de text/on-neutral).
   */
  corRotulo?: string;
  /** Mantém a aparência "Ativo" mesmo sem o dedo. */
  ativo?: boolean;
  /**
   * Escolhido (ex.: resposta marcada): o fundo action/primary entra com fade e o rótulo
   * passa para text/primary. Usado nas respostas dos padrões da Home.
   */
  selecionado?: boolean;
  /**
   * Aparência "Desabilitado", mas continua tocável. Para uma saída discreta que precisa
   * funcionar (ex.: "Sair" na tela de "não abri" da pausa).
   */
  apagado?: boolean;
};

export function Botao({
  rotulo,
  estilo = 'primario',
  estado = 'normal',
  icone,
  corRotulo,
  ativo,
  selecionado = false,
  apagado = false,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const { cores } = useTema();
  const desabilitado = disabled || estado === 'desabilitado';
  // `disabled` também mostra o estado Desabilitado do componente (não só bloqueia o toque).
  const estadoVisual: EstadoBotao = desabilitado || apagado ? 'desabilitado' : estado;
  const [escala] = useState(() => new Animated.Value(1));
  const [cheio] = useState(() => new Animated.Value(selecionado ? 1 : 0));

  useEffect(() => {
    Animated.timing(cheio, {
      toValue: selecionado ? 1 : 0,
      duration: duration.slow,
      easing: curva,
      useNativeDriver: nativo,
    }).start();
  }, [selecionado, cheio]);

  const afundar = (para: number) =>
    Animated.spring(escala, { toValue: para, useNativeDriver: nativo, speed: 40, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: desabilitado, selected: selecionado }}
        disabled={desabilitado}
        onPressIn={(e) => {
          afundar(0.97);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          afundar(1);
          onPressOut?.(e);
        }}
        style={({ pressed }) => [
          styles.base,
          aparencia(cores, estilo, (pressed || ativo) && !selecionado && !desabilitado ? 'ativo' : estadoVisual),
          selecionado && { borderColor: 'transparent' },
        ]}
        {...rest}
      >
        {({ pressed: dedo }) => {
          const pressed = (dedo || !!ativo) && !selecionado;
          const cor = selecionado
            ? cores.text.primary
            : corDoRotulo(cores, estilo, pressed && !desabilitado ? 'ativo' : estadoVisual, corRotulo);
          return (
            <>
              {/* Fundo do estado "selecionado", entra com fade e um leve zoom */}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.cheio,
                  {
                    backgroundColor: cores.action.primary.default,
                    opacity: cheio,
                    transform: [{ scale: cheio.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                  },
                ]}
              />
              {/* Num View: na web, o fundo absoluto seria pintado por cima do conteúdo */}
              <View style={styles.conteudo}>
                {icone ? <View style={styles.icone}>{typeof icone === 'function' ? icone(cor) : icone}</View> : null}
                <Texto estilo="Texto/Botões e rótulos" cor={cor}>
                  {rotulo}
                </Texto>
              </View>
            </>
          );
        }}
      </Pressable>
    </Animated.View>
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
      return { ...contorno('transparent') };
    default:
      return contorno(c.border.focus);
  }
}

function corDoRotulo(c: Cores, estilo: EstiloBotao, estado: EstadoVisual, corRotulo?: string) {
  if (estado === 'desabilitado') return c.text.disabled;
  if (estado === 'aviso') return c.feedback.warning;
  // A sobrescrita da instância vale também enquanto o dedo está no botão.
  if (corRotulo && (estado === 'normal' || estado === 'ativo')) return corRotulo;
  // Secundário pressionado: no componente o rótulo vira text/on-neutral, que some sobre o
  // fundo escuro (só a borda muda); mantemos text/primary para continuar legível.
  if (estilo === 'secundario') return c.text.primary;
  // Primário: sempre text/on-primary. O text/on-neutral do componente ficava quase preto sobre
  // o azul (Dark) e branco sobre o laranja (Light), sem contraste (ex.: "Guardar momento").
  return c.text['on-primary'];
}

const styles = StyleSheet.create({
  base: {
    height: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[20],
    paddingVertical: space[12],
    borderRadius: radius.full,
    // a borda existe sempre (transparente no primário) para a altura não mudar entre estados
    borderWidth: borderWidth.thin,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cheio: { borderRadius: radius.full },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8] },
  icone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
