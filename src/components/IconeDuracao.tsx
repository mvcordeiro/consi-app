import Svg, { Circle, Path } from 'react-native-svg';

import { nivelDuracao } from '@/data/duracao';
import { useTema } from '@/theme';

/**
 * Relógio da duração: um círculo com a fatia do tempo preenchida, que cresce de "Num instante"
 * a "Pode demorar". "Para um dia sem pressa" ganha um anel extra por fora, como um dia inteiro.
 */
export function IconeDuracao({ minutos, tamanho = 16, cor }: { minutos: number; tamanho?: number; cor?: string }) {
  const { cores } = useTema();
  const c = cor ?? cores.icon.primary;
  const nivel = nivelDuracao(minutos);
  const diaInteiro = nivel.id === 'dia';
  const r = diaInteiro ? 5 : 6.5;
  const f = Math.min(0.9999, nivel.fracao);
  const a = f * 2 * Math.PI;
  const x = 8 + r * Math.sin(a);
  const y = 8 - r * Math.cos(a);
  const fatia = `M8 8 L8 ${8 - r} A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 16 16">
      {diaInteiro ? <Circle cx={8} cy={8} r={7.25} stroke={c} strokeWidth={1.2} strokeDasharray="1.6 1.4" fill="none" /> : null}
      <Circle cx={8} cy={8} r={r} stroke={c} strokeWidth={1.4} fill="none" />
      {nivel.fracao >= 1 ? <Circle cx={8} cy={8} r={r} fill={c} /> : <Path d={fatia} fill={c} />}
    </Svg>
  );
}
