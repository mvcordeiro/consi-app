import type { StyleProp, ViewStyle } from 'react-native';

import { BalaoVazio, emocaoPorId } from '@/data/emocoes';

import { BalaoEmocao } from '../home/BalaoEmocao';

/**
 * Premo (balão de emoção do Design System) a partir do id da emoção.
 * Sem emoção, mostra o balão "?" (Premo · Vazio). Parado por padrão: nas listas do Diário
 * os balões não flutuam; só os destaques (dia aberto, linha do tempo) usam `flutuar`.
 */
export function Premo({
  id,
  tamanho,
  flutuar = false,
  fase,
  style,
}: {
  id?: string | null;
  tamanho: number;
  flutuar?: boolean;
  fase?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const e = emocaoPorId(id);
  if (!e) return <BalaoEmocao Svg={BalaoVazio} tamanho={tamanho} flutuar={flutuar} fase={fase} style={style} />;
  return (
    <BalaoEmocao
      Svg={e.Svg}
      Textura={e.Textura}
      circulo={e.circulo}
      tamanho={tamanho}
      flutuar={flutuar}
      fase={fase}
      style={style}
    />
  );
}
