import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTema } from '@/theme';

const CirculoAnimado = Animated.createAnimatedComponent(Circle);

/**
 * "Anel de progresso" do Figma (28 × 28): trilho border/focus e arco icon/primary
 * que cresce no sentido horário a partir do topo.
 */
export function AnelProgresso({
  progresso,
  tamanho = 28,
  espessura = 2.8,
  corTrilho,
  corArco,
}: {
  /** Valor animado de 0 a 1. */
  progresso: Animated.Value;
  tamanho?: number;
  espessura?: number;
  corTrilho?: string;
  corArco?: string;
}) {
  const { cores } = useTema();
  const r = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * r;
  const c = tamanho / 2;

  return (
    <Svg width={tamanho} height={tamanho}>
      <Circle cx={c} cy={c} r={r} stroke={corTrilho ?? cores.border.focus} strokeWidth={espessura} fill="none" />
      <CirculoAnimado
        cx={c}
        cy={c}
        r={r}
        stroke={corArco ?? cores.icon.primary}
        strokeWidth={espessura}
        fill="none"
        strokeDasharray={`${circunferencia} ${circunferencia}`}
        strokeDashoffset={progresso.interpolate({
          inputRange: [0, 1],
          outputRange: [circunferencia, 0],
        })}
        transform={`rotate(-90 ${c} ${c})`}
      />
    </Svg>
  );
}
